"""
courses/views.py
"""
from django.db.models import Avg
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView
from enrollments.models import Enrollment

from accounts.permissions import IsAdminUser, IsInstructor, IsInstructorOrAdmin
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
)


# ── Category ──────────────────────────────────────────────────────────────────

class CategoryListView(generics.ListAPIView):
    """GET /api/courses/categories/"""
    queryset           = Category.objects.filter(parent=None).prefetch_related('children')
    serializer_class   = CategorySerializer
    permission_classes = [AllowAny]


# ── Course (public) ───────────────────────────────────────────────────────────

class CourseListView(generics.ListAPIView):
    """
    GET /api/courses/
    Danh sách khoá học đã published — 5.1.2
    Hỗ trợ: ?category=<slug> &level=beginner &search=python &ordering=-avg_rating
    """
    serializer_class   = CourseListSerializer
    permission_classes = [AllowAny]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['level', 'category__slug']
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
    """
    GET /api/courses/<slug>/
    Chi tiết khoá học — 5.1.2
    """
    queryset           = Course.objects.filter(status=Course.Status.PUBLISHED)
    serializer_class   = CourseDetailSerializer
    permission_classes = [AllowAny]
    lookup_field       = 'slug'


# ── Course (Instructor) ───────────────────────────────────────────────────────

class InstructorCourseListView(generics.ListCreateAPIView):
    """
    GET  /api/courses/mine/    — danh sách khoá học của instructor
    POST /api/courses/mine/    — tạo khoá học mới — 5.2.1
    """
    permission_classes = [IsAuthenticated, IsInstructor]

    def get_queryset(self):
        return Course.objects.filter(instructor=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CourseWriteSerializer
        return CourseListSerializer


class InstructorCourseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/courses/mine/<id>/   — xem
    PUT    /api/courses/mine/<id>/   — chỉnh sửa — 5.2.1
    DELETE /api/courses/mine/<id>/   — xoá (soft delete → archived) — 5.2.1
    """
    serializer_class   = CourseWriteSerializer
    permission_classes = [IsAuthenticated, IsInstructor]
    lookup_field       = 'id'

    def get_queryset(self):
        return Course.objects.filter(instructor=self.request.user)

    def perform_destroy(self, instance):
        # Soft delete: chuyển sang archived thay vì xoá thật
        instance.status = Course.Status.ARCHIVED
        instance.save()


class SubmitCourseReviewView(APIView):
    """
    POST /api/courses/mine/<id>/submit/
    Instructor gửi khoá học lên Admin duyệt (draft → review) — 5.3.2
    """
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
    """
    GET  /api/courses/<course_id>/sections/
    POST /api/courses/<course_id>/sections/
    """
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
    """
    GET  /api/courses/sections/<section_id>/lessons/
    POST /api/courses/sections/<section_id>/lessons/  — 5.2.2
    """
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


class LessonDetailView(generics.RetrieveUpdateDestroyAPIView):
    """PUT/PATCH/DELETE /api/courses/lessons/<id>/"""
    serializer_class   = LessonWriteSerializer
    permission_classes = [IsAuthenticated, IsInstructor]
    lookup_field       = 'id'

    def get_queryset(self):
        return Lesson.objects.filter(section__course__instructor=self.request.user)


# ── Lesson content (Student) ──────────────────────────────────────────────────

class LessonContentView(generics.RetrieveAPIView):
    """
    GET /api/courses/lessons/<id>/content/
    Trả về nội dung bài học — 5.1.3
    Preview: ai cũng xem được.
    Bài thường: phải enrolled.
    """
    serializer_class   = LessonDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field       = 'id'
    queryset           = Lesson.objects.all()

    def get_object(self):
        lesson = super().get_object()
        if lesson.is_preview:
            return lesson
        # Kiểm tra enrolled
        enrolled = self.request.user.enrollments.filter(
            course=lesson.section.course,
            status__in=['active', 'completed'],
        ).exists()
        if not enrolled:
            raise PermissionDenied('Bạn chưa đăng ký khoá học này.')
        return lesson


# ── Review ────────────────────────────────────────────────────────────────────

class ReviewCreateView(generics.CreateAPIView):
    """
    POST /api/courses/<slug>/reviews/
    Học viên đánh giá khoá học sau khi đã hoàn thành — 5.1.4
    """
    serializer_class   = ReviewSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        course = generics.get_object_or_404(Course, slug=self.kwargs['slug'])
        # Chỉ học viên đã enrolled mới được review
        if not self.request.user.enrollments.filter(course=course).exists():
            raise PermissionDenied('Bạn chưa đăng ký khoá học này.')
        serializer.save(student=self.request.user, course=course)


# ── Admin ─────────────────────────────────────────────────────────────────────

class AdminCourseListView(generics.ListAPIView):
    """
    GET /api/courses/admin/     — Admin xem toàn bộ khoá học — 5.3.2
    ?status=review              — lọc khoá học chờ duyệt
    """
    serializer_class   = CourseAdminSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['status']

    def get_queryset(self):
        return Course.objects.all().select_related('instructor').order_by('-created_at')


class AdminCourseApproveView(APIView):
    """
    PATCH /api/courses/admin/<id>/approve/
    Admin duyệt khoá học (review → published) — 5.3.2
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, id):
        from django.utils import timezone
        course = generics.get_object_or_404(Course, id=id, status=Course.Status.REVIEW)
        course.status       = Course.Status.PUBLISHED
        course.published_at = timezone.now()
        course.save()
        return Response({'message': f'Khoá học "{course.title}" đã được duyệt.'})


class AdminCourseRejectView(APIView):
    """
    PATCH /api/courses/admin/<id>/reject/
    Admin từ chối, trả về draft — 5.3.2
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def patch(self, request, id):
        course = generics.get_object_or_404(Course, id=id, status=Course.Status.REVIEW)
        course.status = Course.Status.DRAFT
        course.save()
        return Response({'message': f'Khoá học "{course.title}" đã bị từ chối.'})
    

class EnrollCourseView(APIView):
    """
    POST /api/courses/<slug>/enroll/
    Student đăng ký khóa học
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        course = generics.get_object_or_404(
            Course,
            slug=slug,
            status=Course.Status.PUBLISHED
        )

        enrollment, created = Enrollment.objects.get_or_create(
            student=request.user,
            course=course
        )

        if created:
            return Response({
                "message": "Đăng ký khóa học thành công"
            }, status=status.HTTP_201_CREATED)

        return Response({
            "message": "Bạn đã đăng ký khóa học này rồi"
        }, status=status.HTTP_200_OK)
    
class AdminCourseArchiveView(APIView):
    """PATCH /api/courses/admin/<id>/archive/"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    def patch(self, request, id):
        course = generics.get_object_or_404(Course, id=id, status=Course.Status.PUBLISHED)
        course.status = Course.Status.ARCHIVED
        course.save()
        return Response({'message': f'Đã ẩn khoá học "{course.title}".'})

class AdminCourseUnarchiveView(APIView):
    """PATCH /api/courses/admin/<id>/unarchive/"""
    permission_classes = [IsAuthenticated, IsAdminUser]
    def patch(self, request, id):
        course = generics.get_object_or_404(Course, id=id, status=Course.Status.ARCHIVED)
        course.status = Course.Status.PUBLISHED
        course.save()
        return Response({'message': f'Đã hiện khoá học "{course.title}".'})