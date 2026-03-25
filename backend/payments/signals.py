# payments/signals.py  ← tạo file mới
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Transaction
from enrollments.models import Enrollment


@receiver(post_save, sender=Transaction)
def on_transaction_saved(sender, instance, **kwargs):
    """
    Tự động tạo Enrollment và cập nhật total_students
    bất cứ khi nào Transaction chuyển sang SUCCESS —
    dù qua API, Django Admin, hay shell.
    """
    if instance.status != Transaction.Status.SUCCESS:
        return

    # 1. Tạo hoặc lấy Enrollment
    enrollment, created = Enrollment.objects.get_or_create(
        student=instance.student,
        course=instance.course,
        defaults={
            'status'      : Enrollment.Status.ACTIVE,
            'paid_amount' : instance.amount,
        },
    )
    # Nếu Enrollment đã tồn tại nhưng chưa active (vd: refunded rồi mua lại)
    if not created and enrollment.status != Enrollment.Status.ACTIVE:
        enrollment.status = Enrollment.Status.ACTIVE
        enrollment.save(update_fields=['status'])

    # 2. Cập nhật total_students
    course = instance.course
    course.total_students = course.enrollments.filter(
        status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED]
    ).count()
    course.save(update_fields=['total_students'])