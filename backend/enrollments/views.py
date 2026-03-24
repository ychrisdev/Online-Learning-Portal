"""
enrollments/views.py
"""
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsInstructor
from courses.models import Course, Lesson
from .models import Certificate, Enrollment, Progress
from .serializers import (
    CertificateSerializer,
    EnrollmentSerializer,
    InstructorStudentSerializer,
    ProgressSerializer,
)


# ── Student ───────────────────────────────────────────────────────────────────

class MyEnrollmentListView(generics.ListAPIView):
    """
    GET /api/enrollments/
    Danh sách khoá học đã đăng ký — 5.1.2
    """
    serializer_class   = EnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Enrollment.objects
            .filter(student=self.request.user)
            .select_related('course')
            .order_by('-enrolled_at')
        )


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
    """
    PATCH /api/enrollments/progress/<lesson_id>/
    Cập nhật tiến độ xem video hoặc đánh dấu hoàn thành bài — 5.1.3
    Body: { watch_seconds: int, is_completed: bool }
    """
    permission_classes = [IsAuthenticated]

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

        watch_seconds = request.data.get('watch_seconds')
        is_completed  = request.data.get('is_completed')

        if watch_seconds is not None:
            progress.watch_seconds = max(progress.watch_seconds, int(watch_seconds))
        if is_completed is not None:
            progress.is_completed = bool(is_completed)

        progress.save()

        # Kiểm tra hoàn thành toàn bộ khoá học → cập nhật Enrollment + tạo Certificate
        _check_course_completion(enrollment)

        return Response(ProgressSerializer(progress).data)


def _check_course_completion(enrollment: Enrollment):
    """Nếu tất cả bài học đã completed → đánh dấu enrollment completed + tạo certificate."""
    from courses.models import Lesson as LessonModel
    total = LessonModel.objects.filter(section__course=enrollment.course).count()
    done  = enrollment.progress_records.filter(is_completed=True).count()

    if total > 0 and done >= total and enrollment.status == Enrollment.Status.ACTIVE:
        enrollment.status       = Enrollment.Status.COMPLETED
        enrollment.completed_at = timezone.now()
        enrollment.save(update_fields=['status', 'completed_at'])

        # Tạo certificate nếu chưa có
        if not hasattr(enrollment, 'certificate'):
            import uuid as _uuid
            Certificate.objects.create(
                enrollment  = enrollment,
                cert_number = f'CERT-{str(_uuid.uuid4())[:8].upper()}',
            )

        # Cập nhật total_students nếu chưa đếm
        course = enrollment.course
        course.total_students = course.enrollments.filter(
            status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED]
        ).count()
        course.save(update_fields=['total_students'])


class MyCertificateListView(generics.ListAPIView):
    """GET /api/enrollments/certificates/"""
    serializer_class   = CertificateSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Certificate.objects.filter(
            enrollment__student=self.request.user
        ).select_related('enrollment__course')


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