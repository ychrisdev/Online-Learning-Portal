"""
payments/serializers.py
"""
from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source='course.title', read_only=True)

    class Meta:
        model  = Transaction
        fields = [
            'id', 'course', 'course_title', 'amount', 'status',
            'method', 'ref_code', 'gateway_ref', 'note', 'created_at', 'paid_at',
        ]
        read_only_fields = [
            'id', 'status', 'ref_code', 'gateway_ref', 'created_at', 'paid_at',
        ]


class InitiatePaymentSerializer(serializers.Serializer):
    """Học viên bắt đầu thanh toán — 5.1.5"""
    course_id = serializers.UUIDField()
    method    = serializers.ChoiceField(choices=Transaction.Method.choices)


class AdminTransactionSerializer(serializers.ModelSerializer):
    student_name  = serializers.CharField(source='student.full_name', read_only=True)
    student_email = serializers.CharField(source='student.email',     read_only=True)
    course_title  = serializers.CharField(source='course.title',      read_only=True)

    class Meta:
        model  = Transaction
        fields = [
            'id', 'student_name', 'student_email', 'course_title',
            'amount', 'status', 'method', 'ref_code', 'created_at', 'paid_at',
        ]

class AdminTransactionDetailSerializer(serializers.ModelSerializer):
    """Admin xem chi tiết 1 giao dịch"""
    student_name  = serializers.CharField(source='student.full_name', read_only=True)
    student_email = serializers.CharField(source='student.email',     read_only=True)
    course_title  = serializers.CharField(source='course.title',      read_only=True)
    course_slug   = serializers.CharField(source='course.slug',       read_only=True)

    class Meta:
        model  = Transaction
        fields = [
            'id', 'ref_code', 'gateway_ref',
            'student', 'student_name', 'student_email',
            'course',  'course_title', 'course_slug',
            'amount', 'status', 'method',
            'note', 'refund_reason',
            'created_at', 'paid_at',
        ]