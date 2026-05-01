"""
payments/emails.py
==================
Gửi email thông báo:
  - Đăng ký khoá học miễn phí thành công
  - Thanh toán khoá học thành công
  - Hoàn tiền thành công
"""
from decimal import Decimal
import logging
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def send_enrollment_email(enrollment) -> bool:
    """Gửi email thông báo đăng ký khoá học miễn phí thành công."""
    student      = enrollment.student
    course       = enrollment.course
    student_name = student.full_name or student.username

    context = {
        'student_name': student_name,
        'course_title': course.title,
        'enrolled_at':  enrollment.enrolled_at.strftime('%d/%m/%Y'),
        'is_free':      True,
    }
    html_message  = render_to_string('emails/enrollment_success.html', context)
    plain_message = strip_tags(html_message)

    try:
        send_mail(
            subject=f'[EnglishHub] Đăng ký khoá học thành công: {course.title}',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info('Enrollment email sent: student=%s course=%s', student.username, course.title)
        return True
    except Exception as exc:
        logger.error('Failed to send enrollment email: student=%s error=%s', student.username, exc)
        return False


def send_payment_success_email(transaction) -> bool:
    """Gửi email thông báo thanh toán khoá học thành công."""
    student      = transaction.student
    course       = transaction.course
    student_name = student.full_name or student.username
    paid_at      = transaction.paid_at.strftime('%d/%m/%Y %H:%M') if transaction.paid_at else ''

    context = {
        'student_name': student_name,
        'course_title': course.title,
        'amount':       f"{int(transaction.amount):,}đ",
        'ref_code':     transaction.ref_code,
        'paid_at':      paid_at,
        'is_free':      False,
        'payment_method': transaction.method,
    }
    html_message  = render_to_string('emails/enrollment_success.html', context)
    plain_message = strip_tags(html_message)

    try:
        send_mail(
            subject=f'[EnglishHub] Thanh toán thành công: {course.title}',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info('Payment email sent: student=%s course=%s ref=%s', student.username, course.title, transaction.ref_code)
        return True
    except Exception as exc:
        logger.error('Failed to send payment email: student=%s error=%s', student.username, exc)
        return False


def send_refund_success_email(transaction) -> bool:
    """Gửi email thông báo hoàn tiền thành công về ví học viên."""
    student      = transaction.student
    course       = transaction.course
    student_name = student.full_name or student.username
    refunded_at  = transaction.refund_approved_at.strftime('%d/%m/%Y %H:%M') if transaction.refund_approved_at else ''
    refund_amount = int(transaction.amount * 0.7)
    context = {
        'student_name': student_name,
        'course_title': course.title,
        'amount':       f"{int(transaction.amount):,}đ",
        'refund_amount': f"{refund_amount:,}đ",
        'ref_code':     transaction.ref_code,
        'refunded_at':  refunded_at,
    }
    html_message  = render_to_string('emails/refund_success.html', context)
    plain_message = strip_tags(html_message)

    try:
        send_mail(
            subject=f'[EnglishHub] Hoàn tiền thành công: {course.title}',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info('Refund email sent: student=%s course=%s ref=%s', student.username, course.title, transaction.ref_code)
        return True
    except Exception as exc:
        logger.error('Failed to send refund email: student=%s error=%s', student.username, exc)
        return False
    
def send_refund_cancelled_email(transaction) -> bool:
    """Gửi email thông báo yêu cầu hoàn tiền bị hủy tự động do tiến độ vượt 20%."""
    student      = transaction.student
    course       = transaction.course
    student_name = student.full_name or student.username
    context = {
        'student_name': student_name,
        'course_title': course.title,
        'amount':       f"{int(transaction.amount):,}đ",
        'ref_code':     transaction.ref_code,
    }
    html_message  = render_to_string('emails/refund_cancelled.html', context)
    plain_message = strip_tags(html_message)
    try:
        send_mail(
            subject=f'[EnglishHub] Yêu cầu hoàn tiền đã bị hủy: {course.title}',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info('Refund cancelled email sent: student=%s course=%s', student.username, course.title)
        return True
    except Exception as exc:
        logger.error('Failed to send refund cancelled email: student=%s error=%s', student.username, exc)
        return False
    
def send_refund_rejected_email(transaction, reject_reason: str = '') -> bool:
    """Gửi email thông báo yêu cầu hoàn tiền bị admin từ chối."""
    student      = transaction.student
    course       = transaction.course
    student_name = student.full_name or student.username
    context = {
        'student_name':  student_name,
        'course_title':  course.title,
        'amount':        f"{int(transaction.amount):,}đ",
        'ref_code':      transaction.ref_code,
        'reject_reason': reject_reason,
    }
    html_message  = render_to_string('emails/refund_rejected.html', context)
    plain_message = strip_tags(html_message)
    try:
        send_mail(
            subject=f'[EnglishHub] Yêu cầu hoàn tiền bị từ chối: {course.title}',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info('Refund rejected email sent: student=%s course=%s', student.username, course.title)
        return True
    except Exception as exc:
        logger.error('Failed to send refund rejected email: student=%s error=%s', student.username, exc)
        return False
    
def send_payment_failed_email(transaction) -> bool:
    """Gửi email thông báo thanh toán thất bại."""
    student      = transaction.student
    course       = transaction.course
    student_name = student.full_name or student.username
    failed_at    = transaction.created_at.strftime('%d/%m/%Y %H:%M') if transaction.created_at else ''

    context = {
        'student_name': student_name,
        'course_title': course.title,
        'amount':       f"{int(transaction.amount):,}đ",
        'ref_code':     transaction.ref_code,
        'reason':       'Giao dịch bị hủy bởi người dùng' if transaction.method == 'momo' else 'Thanh toán không thành công',
        'failed_at':    failed_at,
    }

    html_message  = render_to_string('emails/enrollment_failed.html', context)
    plain_message = strip_tags(html_message)

    try:
        send_mail(
            subject=f'[EnglishHub] Thanh toán thất bại: {course.title}',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info('Payment failed email sent: student=%s course=%s ref=%s', student.username, course.title, transaction.ref_code)
        return True
    except Exception as exc:
        logger.error('Failed to send payment failed email: student=%s error=%s', student.username, exc)
        return False
    
def send_refund_approved_email(transaction) -> bool:
    """Gửi email thông báo admin đã duyệt yêu cầu hoàn tiền, đang chờ giảng viên xác nhận."""
    student      = transaction.student
    course       = transaction.course
    student_name = student.full_name or student.username
    approved_at  = transaction.refund_approved_at.strftime('%d/%m/%Y %H:%M') if transaction.refund_approved_at else ''

    context = {
        'student_name': student_name,
        'course_title': course.title,
        'amount':       f"{int(transaction.amount):,}đ",
        'ref_code':     transaction.ref_code,
        'approved_at':  approved_at,
    }

    html_message  = render_to_string('emails/refund_approved.html', context)
    plain_message = strip_tags(html_message)

    try:
        send_mail(
            subject=f'[EnglishHub] Yêu cầu hoàn tiền đã được duyệt: {course.title}',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[student.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info('Refund approved email sent: student=%s course=%s', student.username, course.title)
        return True
    except Exception as exc:
        logger.error('Failed to send refund approved email: student=%s error=%s', student.username, exc)
        return False
    
def send_refund_request_to_instructor_email(transaction) -> bool:
    """Gửi email thông báo cho giảng viên khi admin duyệt yêu cầu hoàn tiền."""
    instructor      = transaction.course.instructor
    course          = transaction.course
    instructor_name = instructor.full_name or instructor.username
    student_name    = transaction.student.full_name or transaction.student.username
    approved_at     = transaction.refund_approved_at.strftime('%d/%m/%Y %H:%M') if transaction.refund_approved_at else ''

    context = {
        'instructor_name': instructor_name,
        'student_name':    student_name,
        'course_title':    course.title,
        'amount':          f"{int(transaction.amount):,}đ",
        'refund_amount':   f"{int(transaction.amount * Decimal('0.7')):,}đ",
        'ref_code':        transaction.ref_code,
        'approved_at':     approved_at,
        'reason':          transaction.refund_reason or 'Không có lý do.',
    }

    html_message  = render_to_string('emails/refund_request_instructor.html', context)
    plain_message = strip_tags(html_message)

    try:
        send_mail(
            subject=f'[EnglishHub] Yêu cầu hoàn tiền cần xác nhận: {course.title}',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[instructor.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info('Refund request instructor email sent: instructor=%s course=%s', instructor.username, course.title)
        return True
    except Exception as exc:
        logger.error('Failed to send refund request instructor email: instructor=%s error=%s', instructor.username, exc)
        return False
    
def send_refund_warning_email(transaction) -> bool:
    """Gửi email cảnh báo giảng viên còn 12 tiếng để hoàn tiền."""
    instructor      = transaction.course.instructor
    course          = transaction.course
    instructor_name = instructor.full_name or instructor.username
    student_name    = transaction.student.full_name or transaction.student.username
    deadline        = transaction.refund_deadline.strftime('%d/%m/%Y %H:%M') if transaction.refund_deadline else ''

    context = {
        'instructor_name': instructor_name,
        'student_name':    student_name,
        'course_title':    course.title,
        'refund_amount':   f"{int(transaction.amount * Decimal('0.7')):,}đ",
        'ref_code':        transaction.ref_code,
        'deadline':        deadline,
    }

    html_message  = render_to_string('emails/refund_warning_instructor.html', context)
    plain_message = strip_tags(html_message)

    try:
        send_mail(
            subject=f'[EnglishHub] ⚠️ Còn 12 tiếng để hoàn tiền: {course.title}',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[instructor.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info('Refund warning email sent: instructor=%s', instructor.username)
        return True
    except Exception as exc:
        logger.error('Failed to send refund warning email: %s', exc)
        return False


def send_instructor_locked_email(transaction) -> bool:
    """Gửi email thông báo tài khoản giảng viên bị khóa do không hoàn tiền đúng hạn."""
    instructor      = transaction.course.instructor
    course          = transaction.course
    instructor_name = instructor.full_name or instructor.username

    context = {
        'instructor_name': instructor_name,
        'course_title':    course.title,
        'refund_amount':   f"{int(transaction.amount * Decimal('0.7')):,}đ",
        'ref_code':        transaction.ref_code,
    }

    html_message  = render_to_string('emails/instructor_locked.html', context)
    plain_message = strip_tags(html_message)

    try:
        send_mail(
            subject=f'[EnglishHub] Tài khoản bị khóa do không hoàn tiền đúng hạn',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[instructor.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info('Instructor locked email sent: instructor=%s', instructor.username)
        return True
    except Exception as exc:
        logger.error('Failed to send instructor locked email: %s', exc)
        return False