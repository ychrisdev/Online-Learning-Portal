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
    course = instance.course

    if instance.status == Transaction.Status.SUCCESS:
        enrollment, created = Enrollment.objects.get_or_create(
            student=instance.student,
            course=course,
            defaults={
                'status'      : Enrollment.Status.ACTIVE,
                'paid_amount' : instance.amount,
            },
        )
        if not created and enrollment.status != Enrollment.Status.ACTIVE:
            enrollment.status = Enrollment.Status.ACTIVE
            enrollment.save(update_fields=['status'])

    elif instance.status == Transaction.Status.REFUNDED:
        Enrollment.objects.filter(
            student=instance.student,
            course=course,
        ).delete()

    course.total_students = course.enrollments.filter(
        status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED]
    ).count()
    course.save(update_fields=['total_students'])