"""
courses/serializers.py
"""
from rest_framework import serializers
from .models import Category, Course, Section, Lesson, Review


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = ['id', 'name', 'slug', 'description', 'parent']


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Lesson
        fields = [
            'id', 'title', 'lesson_type', 'order_index', 'is_preview',
            'duration_seconds', 'video_url', 'attachment_name',
        ]
        # Không trả về video_file / attachment thật sự trừ khi đã enrolled
        # (kiểm soát ở view)


class LessonDetailSerializer(serializers.ModelSerializer):
    """Dùng khi học viên đã enrolled — trả về đủ content."""
    class Meta:
        model  = Lesson
        fields = [
            'id', 'title', 'lesson_type', 'order_index', 'is_preview',
            'duration_seconds', 'video_url', 'video_file',
            'content', 'attachment', 'attachment_name',
        ]


class LessonWriteSerializer(serializers.ModelSerializer):
    """Instructor tạo / chỉnh sửa bài học — 5.2.2"""
    class Meta:
        model  = Lesson
        fields = [
            'id', 'section', 'title', 'lesson_type', 'order_index', 'is_preview',
            'video_url', 'video_file', 'duration_seconds',
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
    student_id   = serializers.IntegerField(source='student.id', read_only=True)  # ← thêm dòng này

    class Meta:
        model  = Review
        fields = ['id', 'student_name', 'student_id', 'rating', 'comment', "edit_count", 'created_at']
        read_only_fields = ['id', 'student_name', 'student_id', "edit_count", 'created_at']


class CourseListSerializer(serializers.ModelSerializer):
    """Danh sách khoá học — gọn, dùng cho trang browse."""
    category_name   = serializers.CharField(source='category.name', read_only=True)
    instructor_name = serializers.CharField(source='instructor.full_name', read_only=True)
    sale_price      = serializers.IntegerField(read_only=True)   # property từ model

    class Meta:
        model  = Course
        fields = [
            'id', 'title', 'slug', 'thumbnail',
            'price', 'discount_percent', 'sale_price',   # giá gốc + % giảm + giá sau giảm
            'level', 'avg_rating', 'total_students',
            'category_name', 'instructor_name',
            'is_featured',
        ]


class CourseDetailSerializer(serializers.ModelSerializer):
    """Chi tiết khoá học — kèm sections + lessons."""
    sections        = SectionSerializer(many=True, read_only=True)
    reviews         = ReviewSerializer(many=True, read_only=True)
    category_name   = serializers.CharField(source='category.name', read_only=True)
    instructor_name = serializers.CharField(source='instructor.full_name', read_only=True)
    sale_price      = serializers.IntegerField(read_only=True)

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
    """Instructor tạo / chỉnh sửa khoá học — 5.2.1"""
    class Meta:
        model  = Course
        fields = [
            'id', 'category', 'title', 'slug', 'description', 'thumbnail',
            'price', 'discount_percent',   # nhập % giảm tại đây (0–100)
            'level', 'requirements', 'what_you_learn',
        ]
        # instructor tự động gán từ request.user (xem view)
        # status chỉ Admin mới được đổi (xem CourseAdminSerializer)

    def validate_discount_percent(self, value):
        if not (0 <= value <= 100):
            raise serializers.ValidationError('Phần trăm giảm giá phải từ 0 đến 100.')
        return value

    def create(self, validated_data):
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
            status__in=[
                Transaction.Status.SUCCESS,
                Transaction.Status.REFUND_REQUESTED,
            ]
        ).aggregate(total=Sum('amount'))
        return int(result['total'] or 0)

    class Meta:
        model  = Course
        fields = [
            'id', 'title', 'status', 'published_at',
            'instructor', 'instructor_name',
            'total_students',
            'price', 'discount_percent', 'sale_price',
            'category_name',
            'refunded_count',
            'revenue',
            'created_at',
        ]
        read_only_fields = ['id', 'title', 'instructor', 'created_at']