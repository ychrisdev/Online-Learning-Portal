"""
enrollments/views.py
"""
from django.db import models
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAdminUser,IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsInstructor
from courses.models import Course, Lesson
from .models import Certificate, Enrollment, Progress
from .serializers import (
    AdminEnrollmentSerializer,
    CertificateSerializer,
    EnrollmentSerializer,
    InstructorStudentSerializer,
    ProgressSerializer,
)
from .emails import send_certificate_email
from payments.emails import send_enrollment_email
from decimal import Decimal


# ── Student ───────────────────────────────────────────────────────────────────

class MyEnrollmentListView(generics.ListCreateAPIView):
    serializer_class   = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Enrollment.objects
            .filter(student=self.request.user)
            .select_related('course')
            .order_by('-enrolled_at')
        )

    def post(self, request, *args, **kwargs):
        course_id = request.data.get('course_id')
        if not course_id:
            return Response({'detail': 'Thiếu course_id.'}, status=status.HTTP_400_BAD_REQUEST)

        course = generics.get_object_or_404(Course, id=course_id)

        sale_price = course.sale_price if course.sale_price is not None else (course.price or 0)
        if int(sale_price) > 0:
            return Response({'detail': 'Khoá học có phí, vui lòng thanh toán qua cổng.'}, status=status.HTTP_400_BAD_REQUEST)

        existing = Enrollment.objects.filter(student=request.user, course=course).first()
        if existing:
            if existing.status in [Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED]:
                return Response({'detail': 'Bạn đã đăng ký khoá học này rồi.'}, status=status.HTTP_400_BAD_REQUEST)
            # refunded/cancelled → kích hoạt lại
            existing.status = Enrollment.Status.ACTIVE
            existing.enrolled_at = timezone.now()
            existing.save(update_fields=['status', 'enrolled_at'])
            return Response(EnrollmentSerializer(existing).data, status=status.HTTP_200_OK)

        enrollment = Enrollment.objects.create(
            student=request.user,
            course=course,
            status=Enrollment.Status.ACTIVE,
        )
        send_enrollment_email(enrollment)
        return Response(EnrollmentSerializer(enrollment).data, status=status.HTTP_201_CREATED)


class ProgressListView(generics.ListAPIView):
    """
    GET /api/enrollments/<enrollment_id>/progress/
    Tiến độ học từng bài trong một enrollment — 5.1.3
    """
    serializer_class   = ProgressSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Progress.objects.filter(
            enrollment_id=self.kwargs['enrollment_id'],
            enrollment__student=self.request.user,
        ).select_related('lesson')


class ProgressUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, lesson_id):                          # ← THÊM
        lesson = generics.get_object_or_404(Lesson, id=lesson_id)
        enrollment = generics.get_object_or_404(
            Enrollment,
            student=request.user,
            course=lesson.section.course,
            status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED],
        )
        progress, _ = Progress.objects.get_or_create(
            enrollment=enrollment,
            lesson=lesson,
        )
        return Response(ProgressSerializer(progress).data)

    def patch(self, request, lesson_id):
        lesson = generics.get_object_or_404(Lesson, id=lesson_id)
        enrollment = generics.get_object_or_404(
            Enrollment,
            student=request.user,
            course=lesson.section.course,
            status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED],
        )
        progress, _ = Progress.objects.get_or_create(
            enrollment=enrollment,
            lesson=lesson,
        )
        is_completed  = request.data.get('is_completed')

        if is_completed is not None:
            progress.is_completed = bool(is_completed)

        progress.save()
        _check_course_completion(enrollment)
        _auto_cancel_refund_if_over_threshold(enrollment)
        return Response(ProgressSerializer(progress).data)

def _check_course_completion(enrollment: Enrollment):
    from courses.models import Lesson as LessonModel
    from quizzes.models import QuizAttempt  # chỉnh lại đúng app name của bạn

    lessons = LessonModel.objects.filter(section__course=enrollment.course)
    total = lessons.count()
    if not total:
        return

    done = enrollment.progress_records.filter(is_completed=True).count()

    # Đếm số lesson có quiz và học viên đã pass
    lessons_with_quiz = lessons.filter(quiz__isnull=False).distinct()
    quiz_required_count = lessons_with_quiz.count()

    if quiz_required_count > 0:
        passed_quiz_count = QuizAttempt.objects.filter(
            student=enrollment.student,
            quiz__lesson__in=lessons_with_quiz,
            passed=True,
        ).values('quiz__lesson').distinct().count()
        quiz_ok = (passed_quiz_count >= quiz_required_count)
    else:
        quiz_ok = True

    if done >= total and quiz_ok and enrollment.status == Enrollment.Status.ACTIVE:
        enrollment.status       = Enrollment.Status.COMPLETED
        enrollment.completed_at = timezone.now()
        enrollment.save(update_fields=['status', 'completed_at'])
        if not hasattr(enrollment, 'certificate'):
            course_code  = enrollment.course.slug[:6].upper().replace('-', '')
            student_code = str(enrollment.student.id)[:4].upper()
            year         = timezone.now().strftime('%y')
            cert_number  = f'CERT-{year}-{course_code}-{student_code}'
            certificate = Certificate.objects.create(
                enrollment  = enrollment,
                cert_number = cert_number,
            )
            send_certificate_email(certificate)


class MyCertificateListView(generics.ListAPIView):
    """GET /api/enrollments/certificates/"""
    serializer_class   = CertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Certificate.objects
            .filter(enrollment__student=self.request.user)
            .select_related('enrollment__course')
            .order_by('-issued_at')   # ✅ thêm dòng này
        )


# ── Instructor ────────────────────────────────────────────────────────────────

class InstructorStudentListView(generics.ListAPIView):
    """
    GET /api/enrollments/instructor/<course_id>/students/
    Giảng viên xem danh sách học viên trong khoá học — 5.2.4
    """
    serializer_class   = InstructorStudentSerializer
    permission_classes = [IsAuthenticated, IsInstructor]

    def get_queryset(self):
        return (
            Enrollment.objects
            .filter(
                course_id=self.kwargs['course_id'],
                course__instructor=self.request.user,
            )
            .select_related('student', 'course')
            .prefetch_related('progress_records')
        )
    
# ── Admin ─────────────────────────────────────────────────────────────────────
class AdminEnrollmentListView(generics.ListAPIView):
    """
    GET /api/enrollments/admin/
    Admin xem toàn bộ danh sách đăng ký khoá học
    """
    serializer_class   = AdminEnrollmentSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        qs = (
            Enrollment.objects
            .select_related('student', 'course')
            .prefetch_related('progress_records')
            .order_by('-enrolled_at')
        )
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                models.Q(student__full_name__icontains=search) |
                models.Q(student__username__icontains=search)  |
                models.Q(course__title__icontains=search)
            )
        return qs
    
class AdminUserCertificateListView(generics.ListAPIView):
    """
    GET /api/enrollments/admin/users/<user_id>/certificates/
    Admin xem chứng chỉ của một học viên cụ thể
    """
    serializer_class   = CertificateSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return (
            Certificate.objects
            .filter(enrollment__student_id=self.kwargs['user_id'])
            .select_related('enrollment__course')
            .order_by('-issued_at')
        )
    
class InstructorEnrollmentListView(generics.ListAPIView):
    serializer_class   = AdminEnrollmentSerializer  # dùng lại serializer admin
    permission_classes = [IsAuthenticated, IsInstructor]

    def get_queryset(self):
        return Enrollment.objects.filter(
            course__instructor=self.request.user
        ).select_related('student', 'course').order_by('-enrolled_at')
    
class MyCertificateByCourseView(APIView):
    """GET /api/enrollments/certificate/?course_id=<id>"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        course_id = request.query_params.get('course_id')
        if not course_id:
            return Response({'detail': 'Thiếu course_id.'}, status=400)

        cert = Certificate.objects.filter(
            enrollment__student=request.user,
            enrollment__course__slug=course_id,
        ).select_related('enrollment__course').first()

        if not cert:
            return Response({'detail': 'Chưa có khóa học hoàn thành.'}, status=404)

        return Response({
            'certificate_code': cert.cert_number,
            'issued_at': cert.issued_at,
            'course_title': cert.enrollment.course.title,
        })
def _auto_cancel_refund_if_over_threshold(enrollment: Enrollment):
    """Tự hủy yêu cầu hoàn tiền nếu tiến độ vượt 20%."""
    from payments.models import Transaction
    from payments.emails import send_payment_success_email
    from courses.models import Lesson as LessonModel

    total = LessonModel.objects.filter(section__course=enrollment.course).count()
    if not total:
        return
    completed = Progress.objects.filter(enrollment=enrollment, is_completed=True).count()
    progress_pct = completed / total * 100

    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"[AUTO_CANCEL] total={total} completed={completed} pct={progress_pct:.1f}%")

    if progress_pct <= 20:
        logger.warning(f"[AUTO_CANCEL] pct <= 20, skip")
        return

    logger.warning(f"[AUTO_CANCEL] checking transactions for student={enrollment.student.id} course={enrollment.course.id}")
    transactions = Transaction.objects.filter(
        student=enrollment.student,
        course=enrollment.course,
        status=Transaction.Status.REFUND_REQUESTED,
    )
    logger.warning(f"[AUTO_CANCEL] found {transactions.count()} transactions")

    transactions = Transaction.objects.filter(
        student=enrollment.student,
        course=enrollment.course,
        status=Transaction.Status.REFUND_REQUESTED,
    )
    for tx in transactions:
        tx.status = Transaction.Status.SUCCESS
        tx.refund_reason = ''
        tx.note = 'Yêu cầu hoàn tiền tự động hủy do tiến độ vượt 20%.'
        tx.save()
        try:
            from payments.emails import send_refund_cancelled_email
            send_refund_cancelled_email(tx)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(
                f"Auto-cancel refund email failed for transaction {tx.id}: {e}"
            )