"""
courses/views.py
"""
from django.db.models import Avg
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from enrollments.models import Enrollment
from accounts.permissions import IsAdminUser, IsInstructor
from .models import Category, Course, Lesson, Review, Section
from .serializers import (
    CategorySerializer,
    CourseAdminSerializer,
    CourseDetailSerializer,
    CourseListSerializer,
    CourseWriteSerializer,
    LessonDetailSerializer,
    LessonSerializer,
    LessonWriteSerializer,
    ReviewSerializer,
    SectionSerializer,
    SectionWriteSerializer,
    AdminReviewSerializer,
)

MAX_REVIEW_EDITS = 5
MAX_REVIEWS_PER_USER = 3
# ── Category ──────────────────────────────────────────────────────────────────
class CategoryListView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]

    def get_queryset(self):
        if self.request.query_params.get('pinned') == 'true':
            return Category.objects.filter(is_pinned=True).order_by('pin_order')
        return Category.objects.all().order_by('name')

class CourseListView(generics.ListAPIView):
    serializer_class   = CourseListSerializer
    permission_classes = [AllowAny]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['level', 'category__slug', 'is_featured']
    search_fields      = ['title', 'description']
    ordering_fields    = ['price', 'avg_rating', 'total_students', 'published_at']
    ordering           = ['-published_at']

    def get_queryset(self):
        return (
            Course.objects
            .filter(status=Course.Status.PUBLISHED)
            .select_related('instructor', 'category')
        )


class CourseDetailView(generics.RetrieveAPIView):
    """GET /api/courses/<slug>/"""
    queryset           = Course.objects.filter(status=Course.Status.PUBLISHED)
    serializer_class   = CourseDetailSerializer
    permission_classes = [AllowAny]
    lookup_field       = 'slug'


# ── Course (Instructor) ───────────────────────────────────────────────────────
class InstructorCourseListView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsInstructor]

    def get_queryset(self):
        return Course.objects.filter(instructor=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CourseWriteSerializer
        return CourseListSerializer


class InstructorCourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = CourseWriteSerializer
    permission_classes = [IsAuthenticated, IsInstructor]
    lookup_field       = 'id'

    def get_queryset(self):
        return Course.objects.filter(instructor=self.request.user)

    def perform_destroy(self, instance):
        instance.status = Course.Status.ARCHIVED
        instance.save()


class SubmitCourseReviewView(APIView):
    """POST /api/courses/mine/<id>/submit/"""
    permission_classes = [IsAuthenticated, IsInstructor]

    def post(self, request, id):
        course = generics.get_object_or_404(
            Course, id=id, instructor=request.user, status=Course.Status.DRAFT
        )
        course.status = Course.Status.REVIEW
        course.save()
        return Response({'message': 'Đã gửi khoá học lên chờ duyệt.'})


# ── Section & Lesson (Instructor) ─────────────────────────────────────────────
class SectionListCreateView(generics.ListCreateAPIView):
    serializer_class   = SectionWriteSerializer
    permission_classes = [IsAuthenticated, IsInstructor]

    def get_queryset(self):
        return Section.objects.filter(
            course_id=self.kwargs['course_id'],
            course__instructor=self.request.user,
        )

    def perform_create(self, serializer):
        course = generics.get_object_or_404(
            Course, id=self.kwargs['course_id'], instructor=self.request.user
        )
        serializer.save(course=course)


class LessonListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsInstructor]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LessonWriteSerializer
        return LessonSerializer

    def get_queryset(self):
        return Lesson.objects.filter(
            section_id=self.kwargs['section_id'],
            section__course__instructor=self.request.user,
        )

    def perform_create(self, serializer):
        section = generics.get_object_or_404(
            Section,
            id=self.kwargs['section_id'],
            course__instructor=self.request.user,
        )
        serializer.save(section=section)

class ReviewUpdateView(generics.UpdateAPIView):
    """PATCH /api/courses/<slug>/reviews/<uuid:pk>/"""
    serializer_class   = ReviewSerializer
    permission_classes = [IsAuthenticated]
    http_method_names  = ['patch']

    def get_queryset(self):
        return Review.objects.filter(
            course__slug=self.kwargs['slug'],
            student=self.request.user,
            # ← bỏ is_hidden=False để cho phép edit cả review bị ẩn
        )

    def perform_update(self, serializer):
        review = self.get_object()
        if review.edit_count >= MAX_REVIEW_EDITS:
            raise PermissionDenied(
                f'Bạn đã chỉnh sửa tối đa {MAX_REVIEW_EDITS} lần.'
            )
        serializer.save(edit_count=review.edit_count + 1)

class LessonDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = LessonWriteSerializer
    permission_classes = [IsAuthenticated, IsInstructor]
    lookup_field       = 'id'

    def get_queryset(self):
        return Lesson.objects.filter(section__course__instructor=self.request.user)


# ── Lesson content (Student) ──────────────────────────────────────────────────
class LessonContentView(generics.RetrieveAPIView):
    serializer_class   = LessonDetailSerializer
    permission_classes = [AllowAny]
    lookup_field       = 'id'
    queryset           = Lesson.objects.all()

    def get_object(self):
        lesson = super().get_object()
        if lesson.is_preview_video or lesson.is_preview_article or lesson.is_preview_resource:
            return lesson
        if not self.request.user.is_authenticated:
            raise PermissionDenied('Bạn chưa đăng ký khoá học này.')
        enrolled = self.request.user.enrollments.filter(
            course=lesson.section.course,
            status__in=['active', 'completed'],
        ).exists()
        if not enrolled:
            raise PermissionDenied('Bạn chưa đăng ký khoá học này.')
        return lesson


# ── Enroll ────────────────────────────────────────────────────────────────────
class EnrollCourseView(APIView):
    """POST /api/courses/<id>/enroll/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        course = generics.get_object_or_404(Course, id=id, status=Course.Status.PUBLISHED)
        enrollment, created = Enrollment.objects.get_or_create(
            student=request.user,
            course=course,
        )
        if created:
            return Response({'message': 'Đăng ký khóa học thành công.'}, status=status.HTTP_201_CREATED)
        return Response({'message': 'Bạn đã đăng ký khóa học này rồi.'}, status=status.HTTP_200_OK)


# ── Review ────────────────────────────────────────────────────────────────────
class ReviewCreateView(generics.CreateAPIView):
    serializer_class   = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        course = generics.get_object_or_404(Course, slug=self.kwargs['slug'])
        if not self.request.user.enrollments.filter(course=course).exists():
            raise PermissionDenied('Bạn chưa đăng ký khoá học này.')

        all_reviews = Review.objects.filter(course=course, student=self.request.user)
        total = all_reviews.count()

        if total >= MAX_REVIEWS_PER_USER:
            raise PermissionDenied(
                f'Bạn đã đánh giá tối đa {MAX_REVIEWS_PER_USER} lần cho khoá học này.'
            )

        active_review = all_reviews.filter(is_hidden=False).first()
        if active_review:
            raise PermissionDenied(
                'Bạn đã có đánh giá đang hiển thị. Hãy chỉnh sửa đánh giá đó.'
            )

        serializer.save(
            student=self.request.user,
            course=course,
            attempt_number=total + 1,
        )

class MyReviewView(generics.RetrieveAPIView):
    """GET /api/courses/<slug>/reviews/me/"""
    serializer_class   = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        review = Review.objects.filter(
            course__slug=self.kwargs['slug'],
            student=request.user,
            is_hidden=False,
        ).first()
        if not review:
            return Response(None, status=status.HTTP_200_OK)  # trả null thay vì 404
        return Response(ReviewSerializer(review).data)


class MyReviewView(generics.ListAPIView):
    """GET /api/courses/<slug>/reviews/me/"""
    serializer_class   = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(
            course__slug=self.kwargs['slug'],
            student=self.request.user,
        ).order_by('-created_at')

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        if not qs.exists():
            return Response([], status=status.HTTP_200_OK)
        return Response(ReviewSerializer(qs, many=True).data)

# ── Admin — Course ────────────────────────────────────────────────────────────
class AdminCourseListView(generics.ListCreateAPIView):
    serializer_class   = CourseAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['status']

    def get_queryset(self):
        return Course.objects.all().select_related('instructor').order_by('-created_at')


class AdminCourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = CourseAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field       = 'id'

    def get_queryset(self):
        return Course.objects.all().select_related('instructor', 'category')

class AdminCourseApproveView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, id):
        from django.utils import timezone
        course = generics.get_object_or_404(Course, id=id, status=Course.Status.REVIEW)
        course.status       = Course.Status.PUBLISHED
        course.published_at = timezone.now()
        course.save()
        return Response({'message': f'Khoá học "{course.title}" đã được duyệt.'})


class AdminCourseRejectView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, id):
        course = generics.get_object_or_404(Course, id=id, status=Course.Status.REVIEW)
        course.status = Course.Status.DRAFT
        course.save()
        return Response({'message': f'Khoá học "{course.title}" đã bị từ chối.'})


class AdminCourseArchiveView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, id):
        course = generics.get_object_or_404(
            Course, id=id,
            status__in=[Course.Status.PUBLISHED, Course.Status.ARCHIVE_REQUESTED]
        )
        if course.enrollments.filter(status='active').exists():
            return Response(
                {'detail': 'Không thể ẩn khoá học khi có học viên đang học.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        course.status = Course.Status.ARCHIVED
        course.save()
        return Response({'message': f'Đã ẩn khoá học "{course.title}".'})

class AdminCourseRejectArchiveView(APIView):
    """PATCH /api/courses/admin/<id>/reject-archive/"""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, id):
        course = generics.get_object_or_404(
            Course, id=id, status=Course.Status.ARCHIVE_REQUESTED
        )
        course.status = Course.Status.PUBLISHED
        course.save(update_fields=['status'])
        return Response({'message': f'Đã từ chối yêu cầu lưu trữ "{course.title}".'})

class AdminCourseUnarchiveView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, id):
        course = generics.get_object_or_404(Course, id=id, status=Course.Status.ARCHIVED)
        course.status = Course.Status.PUBLISHED
        course.save()
        return Response({'message': f'Đã hiện khoá học "{course.title}".'})


# ── Admin — Section ───────────────────────────────────────────────────────────
class AdminSectionListCreateView(generics.ListCreateAPIView):
    serializer_class   = SectionWriteSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        return Section.objects.all().select_related('course').order_by('course', 'order_index')


class AdminSectionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = SectionWriteSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field       = 'id'

    def get_queryset(self):
        return Section.objects.all().select_related('course')


# ── Admin — Lesson ────────────────────────────────────────────────────────────
class AdminLessonListCreateView(generics.ListAPIView):
    serializer_class   = LessonWriteSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get_queryset(self):
        qs = (
            Lesson.objects.all()
            .select_related('section', 'section__course')
            .order_by('section__course', 'section__order_index', 'order_index')
        )
        section_id = self.request.query_params.get('section')
        if section_id:
            qs = qs.filter(section_id=section_id)
        return qs


class AdminLessonDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = LessonWriteSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    lookup_field       = 'id'

    def get_queryset(self):
        return Lesson.objects.all().select_related('section', 'section__course')
    
class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/courses/categories/<id>/  → chi tiết
    PATCH  /api/courses/categories/<id>/  → sửa (admin)
    DELETE /api/courses/categories/<id>/  → xóa (admin)
    """
    serializer_class = CategorySerializer
    lookup_field     = 'id'

    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated(), IsAdminUser()]

    def get_queryset(self):
        return Category.objects.all()
    
class AdminReviewListView(generics.ListAPIView):
    """GET /api/courses/reviews/admin/"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class   = AdminReviewSerializer
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['comment', 'student__username', 'student__full_name', 'course__title']
    ordering_fields    = ['created_at', 'rating']
    ordering           = ['-created_at']

    def get_queryset(self):
        qs = Review.objects.select_related('student', 'course', 'reported_by').all()  # ← thêm reported_by
        rating = self.request.query_params.get('rating')
        if rating:
            qs = qs.filter(rating=rating)
        if self.request.query_params.get('reported') == 'true':   # ← thêm
            qs = qs.filter(is_reported=True)
        return qs


class AdminReviewDetailView(generics.RetrieveDestroyAPIView):
    """
    GET    /api/courses/reviews/admin/<uuid:pk>/
    DELETE /api/courses/reviews/admin/<uuid:pk>/
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    serializer_class   = AdminReviewSerializer
    lookup_field       = 'pk'

    def get_queryset(self):
        return Review.objects.select_related('student', 'course').all()

    def perform_destroy(self, instance):
        course = instance.course
        instance.delete()
        avg = course.reviews.aggregate(a=Avg('rating'))['a'] or 0.0
        course.avg_rating = round(avg, 2)
        course.save(update_fields=['avg_rating'])

class AdminReviewToggleHideView(APIView):
    """
    POST /api/courses/reviews/admin/<uuid:pk>/toggle-hide/
    Ẩn hoặc hiện lại một đánh giá.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        from django.utils import timezone
        review = generics.get_object_or_404(
            Review.objects.select_related('student', 'course'), pk=pk
        )
        review.is_hidden = not review.is_hidden
        review.hidden_at = timezone.now() if review.is_hidden else None
        review.save(update_fields=['is_hidden', 'hidden_at'])
        serializer = AdminReviewSerializer(review)
        return Response(serializer.data)
    
class InstructorCourseUnarchiveView(APIView):
    """POST /api/courses/mine/<id>/unarchive/"""
    permission_classes = [IsAuthenticated, IsInstructor]

    def post(self, request, id):
        course = generics.get_object_or_404(
            Course, id=id, instructor=request.user, status=Course.Status.ARCHIVED
        )
        # Chỉ cho unarchive nếu đã từng được duyệt (published_at != None)
        if not course.published_at:
            return Response(
                {'detail': 'Khóa học chưa được duyệt, không thể đăng lại.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        course.status = Course.Status.PUBLISHED
        course.save(update_fields=['status'])
        return Response({'message': 'Đã đăng lại khóa học.'})
    
class InstructorCourseArchiveView(APIView):
    """POST /api/courses/mine/<id>/archive/"""
    permission_classes = [IsAuthenticated, IsInstructor]

    def post(self, request, id):
        course = generics.get_object_or_404(
            Course, id=id, instructor=request.user,
            status=Course.Status.PUBLISHED
        )
        course.status = Course.Status.ARCHIVE_REQUESTED
        course.save(update_fields=['status'])
        return Response({'message': 'Đã gửi yêu cầu lưu trữ. Vui lòng chờ admin xét duyệt.'})
    
class InstructorSectionListCreateView(generics.ListCreateAPIView):
    serializer_class   = SectionWriteSerializer
    permission_classes = [IsAuthenticated, IsInstructor]

    def get_queryset(self):
        return Section.objects.filter(
            course__instructor=self.request.user
        ).select_related('course').order_by('course', 'order_index')

    def perform_create(self, serializer):
        # Đảm bảo instructor chỉ tạo section cho course của mình
        course_id = self.request.data.get('course')
        course = generics.get_object_or_404(
            Course, id=course_id, instructor=self.request.user
        )
        serializer.save(course=course)

class InstructorSectionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = SectionWriteSerializer
    permission_classes = [IsAuthenticated, IsInstructor]
    lookup_field       = 'id'

    def get_queryset(self):
        return Section.objects.filter(course__instructor=self.request.user)

class InstructorLessonListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsInstructor]

    def get_serializer_class(self):
        return LessonWriteSerializer

    def get_queryset(self):
        qs = Lesson.objects.filter(
            section__course__instructor=self.request.user
        ).select_related('section', 'section__course').order_by('section__order_index', 'order_index')
        section_id = self.request.query_params.get('section')
        if section_id:
            qs = qs.filter(section_id=section_id)
        return qs

    def perform_create(self, serializer):
        section_id = self.request.data.get('section')
        section = generics.get_object_or_404(
            Section, id=section_id, course__instructor=self.request.user
        )
        serializer.save(section=section)

class InstructorLessonDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = LessonWriteSerializer
    permission_classes = [IsAuthenticated, IsInstructor]
    lookup_field       = 'id'

    def get_queryset(self):
        return Lesson.objects.filter(section__course__instructor=self.request.user)
    
class InstructorReviewListView(generics.ListAPIView):
    serializer_class   = AdminReviewSerializer  # dùng lại serializer admin
    permission_classes = [IsAuthenticated, IsInstructor]

    def get_queryset(self):
        return Review.objects.filter(
            course__instructor=self.request.user
        ).select_related('student', 'course').order_by('-created_at')
    
class InstructorReviewReportView(APIView):
    permission_classes = [IsAuthenticated, IsInstructor]

    def post(self, request, pk):
        review = generics.get_object_or_404(
            Review, pk=pk, course__instructor=request.user
        )
        if review.is_reported or review.report_dismissed:
            return Response(
                {'message': 'Đánh giá này đã được báo cáo rồi.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        review.is_reported   = True
        review.report_reason = request.data.get('reason', '').strip()
        review.reported_by   = request.user
        review.save(update_fields=['is_reported', 'report_reason', 'reported_by'])
        return Response({'message': 'Đã gửi báo cáo cho admin.'})   
    
class AdminReviewDismissReportView(APIView):
    """POST /api/courses/reviews/admin/<pk>/dismiss-report/"""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request, pk):
        review = generics.get_object_or_404(Review, pk=pk)
        review.is_reported   = False
        review.report_reason = None
        review.reported_by   = None
        review.report_dismissed = True
        review.save(update_fields=['is_reported', 'report_reason', 'reported_by', 'report_dismissed'])
        return Response({'message': 'Đã bỏ qua báo cáo.'})