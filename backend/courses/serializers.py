"""
courses/serializers.py
"""
from rest_framework import serializers
from .models import Category, Course, Section, Lesson, Review


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = ['id', 'name', 'slug', 'description', 'is_pinned', 'pin_order']

    def validate_is_pinned(self, value):
        if not value:
            return value
        instance = self.instance
        qs = Category.objects.filter(is_pinned=True)
        if instance:
            qs = qs.exclude(pk=instance.pk)
        if qs.count() >= 6:
            raise serializers.ValidationError('Chỉ được ghim tối đa 6 danh mục ra trang chủ.')
        return value


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Lesson
        fields = [
            'id', 'title', 'order_index',
            'is_preview_video', 'is_preview_article', 'is_preview_resource',
            'video_url', 'attachment_name', 'quiz'
        ]


class LessonDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Lesson
        fields = [
            'id', 'title', 'order_index',
            'is_preview_video', 'is_preview_article', 'is_preview_resource',
            'video_url', 'video_file',
            'content', 'attachment', 'attachment_name',
        ]


class LessonWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Lesson
        fields = [
            'id', 'section', 'title', 'order_index',
            'is_preview_video', 'is_preview_article', 'is_preview_resource',
            'video_url', 'video_file',
            'content', 'attachment', 'attachment_name',
        ]


class SectionSerializer(serializers.ModelSerializer):
    lessons = LessonSerializer(many=True, read_only=True)

    class Meta:
        model  = Section
        fields = ['id', 'title', 'description', 'order_index', 'lessons']


class SectionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Section
        fields = ['id', 'course', 'title', 'description', 'order_index']


class ReviewSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_id   = serializers.IntegerField(source='student.id', read_only=True)

    class Meta:
        model  = Review
        fields = ['id', 'student_name', 'student_id', 'rating', 'comment', 'edit_count', 'created_at', 'is_hidden', 'attempt_number','report_dismissed']
        read_only_fields = ['id', 'student_name', 'student_id', 'edit_count', 'created_at',  'is_hidden', 'attempt_number']


class CourseListSerializer(serializers.ModelSerializer):
    category_name   = serializers.CharField(source='category.name', read_only=True)
    instructor_name = serializers.CharField(source='instructor.full_name', read_only=True)
    sale_price      = serializers.IntegerField(read_only=True)
    category_slug = serializers.CharField(source='category.slug', read_only=True)
    completion_rate = serializers.SerializerMethodField()

    class Meta:
        model  = Course
        fields = [
            'id', 'title', 'slug', 'thumbnail',
            'price', 'discount_percent', 'sale_price',
            'level', 'avg_rating', 'total_students',
            'category_name', 'category_slug', 'instructor_name',
            'is_featured', 'status','completion_rate',
            'published_at',
        ]

    def get_completion_rate(self, obj):                    # ← THÊM
        from enrollments.models import Enrollment
        enrollments = Enrollment.objects.filter(
            course=obj
        ).prefetch_related('progress_records')
        if not enrollments.exists():
            return 0
        from enrollments.serializers import _calc_progress_pct
        total = sum(_calc_progress_pct(e) for e in enrollments)
        return round(total / enrollments.count())


class CourseDetailSerializer(serializers.ModelSerializer):
    sections        = SectionSerializer(many=True, read_only=True)
    reviews         = serializers.SerializerMethodField()
    category_name   = serializers.CharField(source='category.name', read_only=True)
    instructor_name = serializers.CharField(source='instructor.full_name', read_only=True)
    sale_price      = serializers.IntegerField(read_only=True)

    def get_reviews(self, obj):
        qs = obj.reviews.filter(is_hidden=False).select_related('student')
        return ReviewSerializer(qs, many=True).data

    class Meta:
        model  = Course
        fields = [
            'id', 'title', 'slug', 'description', 'thumbnail',
            'price', 'discount_percent', 'sale_price',
            'level', 'status', 'avg_rating', 'total_students',
            'requirements', 'what_you_learn',
            'category_name', 'instructor_name', 'published_at', 'created_at',
            'sections', 'reviews',
        ]


class CourseWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Course
        fields = [
            'id', 'category', 'title', 'slug', 'description', 'thumbnail',
            'price', 'discount_percent',
            'level', 'requirements', 'what_you_learn',
        ]
        read_only_fields = ['id', 'slug']

    def validate_discount_percent(self, value):
        if not (0 <= value <= 100):
            raise serializers.ValidationError('Phần trăm giảm giá phải từ 0 đến 100.')
        return value

    def create(self, validated_data):
        from django.utils.text import slugify
        title     = validated_data.get('title', '')
        base_slug = slugify(title) or 'course'
        slug      = base_slug
        counter   = 1
        while Course.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        validated_data['slug']       = slug
        validated_data['instructor'] = self.context['request'].user
        return super().create(validated_data)


class CourseAdminSerializer(serializers.ModelSerializer):
    instructor_name = serializers.CharField(source='instructor.full_name', read_only=True)
    sale_price      = serializers.IntegerField(read_only=True)
    category_name   = serializers.CharField(source='category.name', read_only=True)
    refunded_count  = serializers.SerializerMethodField()
    revenue         = serializers.SerializerMethodField()

    def get_refunded_count(self, obj):
        return obj.transactions.filter(status='refunded').count()

    def get_revenue(self, obj):
        from payments.models import Transaction
        from django.db.models import Sum
        result = obj.transactions.filter(
            status__in=[Transaction.Status.SUCCESS, Transaction.Status.REFUND_REQUESTED]
        ).aggregate(total=Sum('amount'))
        return int(result['total'] or 0)

    def validate_discount_percent(self, value):
        if not (0 <= value <= 100):
            raise serializers.ValidationError('Phần trăm giảm giá phải từ 0 đến 100.')
        return value

    def create(self, validated_data):
        from django.utils.text import slugify
        title     = validated_data.get('title', '')
        base_slug = slugify(title) or 'course'
        slug      = base_slug
        counter   = 1
        while Course.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1
        validated_data['slug'] = slug
        return super().create(validated_data)

    class Meta:
        model  = Course
        fields = [
            'id', 'slug',
            'title', 'description', 'thumbnail',
            'requirements', 'what_you_learn',
            'price', 'discount_percent', 'sale_price',
            'level', 'status', 'is_featured',
            'category', 'category_name',
            'instructor', 'instructor_name',
            'avg_rating', 'total_students',
            'refunded_count', 'revenue',
            'published_at', 'created_at',
        ]
        read_only_fields = [
            'id', 'slug',
            'sale_price',
            'category_name', 'instructor_name',
            'avg_rating', 'total_students',
            'refunded_count', 'revenue',
            'created_at',
        ]

class AdminReviewSerializer(serializers.ModelSerializer):
    student_name  = serializers.SerializerMethodField()
    student_email = serializers.SerializerMethodField()
    course_title  = serializers.SerializerMethodField()
    reported_by_name = serializers.SerializerMethodField()   # ← thêm

    class Meta:
        model  = Review
        fields = [
            'id', 'course', 'course_title',
            'student', 'student_name', 'student_email',
            'rating', 'comment', 'edit_count',
            'is_hidden', 'hidden_at',
            'is_reported', 'report_reason', 'reported_by_name',  # ← thêm
            'created_at', 'updated_at','report_dismissed'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'edit_count', 'hidden_at']

    def get_student_name(self, obj):
        return getattr(obj.student, 'full_name', None) or obj.student.username

    def get_student_email(self, obj):
        return obj.student.email

    def get_course_title(self, obj):
        return obj.course.title

    def get_reported_by_name(self, obj):             # ← thêm
        if not obj.reported_by:
            return None
        return getattr(obj.reported_by, 'full_name', None) or obj.reported_by.username