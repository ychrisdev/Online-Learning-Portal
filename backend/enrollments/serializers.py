"""
enrollments/serializers.py
"""
from rest_framework import serializers
from .models import Certificate, Enrollment, Progress


class EnrollmentSerializer(serializers.ModelSerializer):
    course_title     = serializers.CharField(source='course.title', read_only=True)
    course_thumbnail = serializers.ImageField(source='course.thumbnail', read_only=True)
    course_slug      = serializers.SlugField(source='course.slug', read_only=True)

    class Meta:
        model  = Enrollment
        fields = [
            'id', 'course', 'course_title', 'course_thumbnail', 'course_slug',
            'status', 'paid_amount', 'enrolled_at', 'completed_at',
        ]
        read_only_fields = ['id', 'status', 'paid_amount', 'enrolled_at', 'completed_at']


class ProgressSerializer(serializers.ModelSerializer):
    lesson_title = serializers.CharField(source='lesson.title', read_only=True)

    class Meta:
        model  = Progress
        fields = ['id', 'lesson', 'lesson_title', 'is_completed', 'watch_seconds', 'last_accessed']
        read_only_fields = ['id', 'lesson_title', 'last_accessed']


class CertificateSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='enrollment.course.title', read_only=True)

    class Meta:
        model  = Certificate
        fields = ['id', 'cert_number', 'cert_file', 'issued_at', 'course_title']


class InstructorStudentSerializer(serializers.ModelSerializer):
    """Giảng viên xem danh sách học viên trong khoá học — 5.2.4"""
    student_name  = serializers.CharField(source='student.full_name', read_only=True)
    student_email = serializers.CharField(source='student.email', read_only=True)
    progress_pct  = serializers.SerializerMethodField()

    class Meta:
        model  = Enrollment
        fields = ['id', 'student_name', 'student_email', 'status', 'enrolled_at', 'progress_pct']

    def get_progress_pct(self, obj):
        total = obj.course.sections.prefetch_related('lessons').values_list('lessons', flat=True).count()
        if not total:
            return 0
        done = obj.progress_records.filter(is_completed=True).count()
        return round(done / total * 100)