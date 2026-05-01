from celery import shared_task
from django.utils import timezone


@shared_task
def send_refund_warning_email_task(transaction_id: str):
    """Gửi email cảnh báo còn 12 tiếng (chạy sau 36 tiếng kể từ lúc duyệt)."""
    from .models import Transaction
    from .emails import send_refund_warning_email

    try:
        tx = Transaction.objects.get(id=transaction_id)
    except Transaction.DoesNotExist:
        return

    # Nếu đã hoàn tiền rồi thì bỏ qua
    if tx.status != Transaction.Status.REFUND_APPROVED:
        return

    send_refund_warning_email(tx)


@shared_task
def auto_lock_instructor_task(transaction_id: str):
    """Khóa tài khoản giảng viên sau 48 tiếng nếu chưa hoàn tiền."""
    from .models import Transaction
    from .emails import send_instructor_locked_email

    try:
        tx = Transaction.objects.get(id=transaction_id)
    except Transaction.DoesNotExist:
        return

    # Nếu đã hoàn tiền rồi thì bỏ qua
    if tx.status != Transaction.Status.REFUND_APPROVED:
        return

    instructor = tx.course.instructor
    instructor.is_active = False
    instructor.save(update_fields=['is_active'])

    send_instructor_locked_email(tx)