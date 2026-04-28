"""
enrollments/emails.py
=====================
Chức năng gửi email thông báo cấp chứng chỉ.
Dùng django.core.mail.send_mail — cùng pattern với accounts/serializers.py
"""
import logging
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


def send_certificate_email(certificate) -> bool:
    """
    Gửi email thông báo chứng chỉ hoàn thành khoá học.

    Args:
        certificate: instance của Certificate model

    Returns:
        True nếu gửi thành công, False nếu có lỗi
    """
    enrollment  = certificate.enrollment
    student     = enrollment.student
    course      = enrollment.course

    recipient_email = student.email
    student_name    = student.full_name or student.username
    course_title    = course.title
    cert_number     = certificate.cert_number
    issued_at       = certificate.issued_at.strftime('%d/%m/%Y')

    # Render HTML template
    context = {
        'student_name': student_name,
        'course_title': course_title,
        'cert_number':  cert_number,
        'issued_at':    issued_at,
    }
    html_message  = render_to_string('emails/certificate_issued.html', context)
    plain_message = strip_tags(html_message)

    try:
        send_mail(
            subject=f'[EnglishHub] Chúc mừng! Bạn đã nhận được chứng chỉ khoá học {course_title}',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(
            'Certificate email sent: cert=%s student=%s email=%s',
            cert_number, student.username, recipient_email,
        )
        return True

    except Exception as exc:
        logger.error(
            'Failed to send certificate email: cert=%s student=%s error=%s',
            cert_number, student.username, exc,
        )
        return False