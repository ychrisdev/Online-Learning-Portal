"""
enrollments/serializers.py
"""
from rest_framework import serializers
from .models import Certificate, Enrollment, Progress


class EnrollmentSerializer(serializers.ModelSerializer):
    course_title     = serializers.CharField(source='course.title', read_only=True)
    course_thumbnail = serializers.ImageField(source='course.thumbnail', read_only=True)
    course_slug      = serializers.SlugField(source='course.slug', read_only=True)
    progress_pct     = serializers.SerializerMethodField()

    class Meta:
        model  = Enrollment
        fields = [
            'id', 'course', 'course_title', 'course_thumbnail', 'course_slug',
            'status', 'paid_amount', 'enrolled_at', 'completed_at', 'progress_pct'
        ]
        read_only_fields = ['id', 'status', 'paid_amount', 'enrolled_at', 'completed_at', 'progress_pct']

    def get_progress_pct(self, obj):
        return _calc_progress_pct(obj)


class ProgressSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)
    quiz_passed  = serializers.SerializerMethodField()

    class Meta:
        model  = Progress
        fields = ['id', 'lesson', 'lesson_title', 'is_completed', 'quiz_passed']
        read_only_fields = ['id', 'lesson_title', 'quiz_passed']

    def get_quiz_passed(self, obj):
        from quizzes.models import QuizAttempt
        # nếu bài học không có quiz thì trả None
        if not hasattr(obj.lesson, 'quiz') or obj.lesson.quiz is None:
            return None
        return QuizAttempt.objects.filter(
            student=obj.enrollment.student,
            quiz=obj.lesson.quiz,
            passed=True,
        ).exists()


class CertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='enrollment.course.title', read_only=True)

    class Meta:
        model  = Certificate
        fields = ['id', 'cert_number', 'issued_at', 'course_title']

def _calc_progress_pct(obj):
    """Tính % tiến độ học — dùng chung cho Instructor và Admin serializer."""
    from courses.models import Lesson
    from quizzes.models import QuizAttempt

    lessons = list(
        Lesson.objects
        .filter(section__course=obj.course)
        .values('id', 'quiz__id')
    )
    total = len(lessons)
    if not total:
        return 0

    unit = 1 / total

    completed_ids = set(
        obj.progress_records
        .filter(is_completed=True)
        .values_list('lesson_id', flat=True)
    )
    passed_lesson_ids = set(
        QuizAttempt.objects
        .filter(
            student=obj.student,
            quiz__lesson__section__course=obj.course,
            passed=True,
        )
        .values_list('quiz__lesson_id', flat=True)
        .distinct()
    )

    score = 0.0
    for lesson in lessons:
        lid      = lesson['id']
        has_quiz = lesson['quiz__id'] is not None
        if has_quiz:
            if lid in completed_ids:
                score += unit * 0.5
            if lid in passed_lesson_ids:
                score += unit * 0.5
        else:
            if lid in completed_ids:
                score += unit

    return round(score * 100)

class InstructorStudentSerializer(serializers.ModelSerializer):
    """Giảng viên xem danh sách học viên trong khoá học — 5.2.4"""
    student_name  = serializers.CharField(source='student.full_name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    progress_pct  = serializers.SerializerMethodField()

    class Meta:
        model  = Enrollment
        fields = ['id', 'student_name', 'student_email', 'status', 'enrolled_at', 'progress_pct']

    def get_progress_pct(self, obj):
        return _calc_progress_pct(obj)
    
class AdminEnrollmentSerializer(serializers.ModelSerializer):
    student_name  = serializers.CharField(source='student.full_name', read_only=True)
    student_email = serializers.CharField(source='student.email',     read_only=True)
    course_title  = serializers.CharField(source='course.title',      read_only=True)
    progress_pct  = serializers.SerializerMethodField()

    class Meta:
        model  = Enrollment
        fields = [
            'id', 'student_name', 'student_email',
            'course_title', 'status', 'paid_amount',
            'enrolled_at', 'completed_at', 'progress_pct',
        ]

    def get_progress_pct(self, obj):
        return _calc_progress_pct(obj)