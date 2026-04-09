"""
enrollments/models.py
=====================
Chức năng liên quan:
  - 5.1.2  Đăng ký khoá học, xem danh sách đã đăng ký (Student)
  - 5.1.3  Theo dõi tiến độ học, đánh dấu đã học (Student)
  - 5.2.4  Giảng viên xem danh sách học viên, tiến độ
"""
import uuid
from django.db import models
from django.conf import settings


class Enrollment(models.Model):
    """
    Bản ghi đăng ký khoá học của học viên.
    Vòng đời status:
      active    → completed  (học xong toàn bộ bài)
      active    → refunded   (hoàn tiền)

    Lưu ý đồng bộ: khi Transaction chuyển sang 'refunded',
    service layer phải cập nhật Enrollment.status → 'refunded' cùng lúc.
    """
    class Status(models.TextChoices):
        ACTIVE    = 'active',    'Đang học'
        COMPLETED = 'completed', 'Hoàn thành'
        REFUNDED  = 'refunded',  'Đã hoàn tiền'

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='enrollments',
        verbose_name='Học viên',
        limit_choices_to={'role': 'student'},
    )
    course      = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='enrollments',
        verbose_name='Khoá học',
    )
    status      = models.CharField('Trạng thái', max_length=20, choices=Status.choices, default=Status.ACTIVE)
    paid_amount = models.DecimalField('Số tiền đã trả', max_digits=12, decimal_places=0, default=0)
    enrolled_at  = models.DateTimeField('Ngày đăng ký', auto_now_add=True)
    completed_at = models.DateTimeField('Ngày hoàn thành', null=True, blank=True)

    class Meta:
        db_table        = 'enrollments'
        unique_together = ('student', 'course')   # 1 student chỉ đăng ký 1 lần
        verbose_name        = 'Đăng ký khoá học'
        verbose_name_plural = 'Đăng ký khoá học'
        indexes = [
            models.Index(fields=['student', 'status']),
            models.Index(fields=['course', 'status']),
        ]

    def __str__(self):
        return f"{self.student.username} → {self.course.title}"


class Progress(models.Model):
    """
    Tiến độ học từng bài học trong một enrollment.
    - is_completed = True  → học viên đã đánh dấu hoàn thành bài (5.1.3)
    - watch_seconds        → số giây đã xem video (dùng để resume)
    - last_accessed        → tự động cập nhật mỗi khi gọi API update
    """
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment    = models.ForeignKey(
        Enrollment, on_delete=models.CASCADE, related_name='progress_records'
    )
    lesson        = models.ForeignKey(
        'courses.Lesson', on_delete=models.CASCADE, related_name='progress_records'
    )
    is_completed  = models.BooleanField('Đã hoàn thành', default=False)

    class Meta:
        db_table        = 'progress'
        unique_together = ('enrollment', 'lesson')
        verbose_name        = 'Tiến độ học'
        verbose_name_plural = 'Tiến độ học'
        indexes = [models.Index(fields=['enrollment', 'is_completed'])]

    def __str__(self):
        status = 'done' if self.is_completed else self.is_completed
        return f"{self.enrollment} — {self.lesson.title} [{status}]"


class Certificate(models.Model):
    """
    Chứng chỉ hoàn thành khoá học.
    Tự động tạo khi tất cả bài học trong enrollment được completed.
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    enrollment  = models.OneToOneField(
        Enrollment, on_delete=models.CASCADE, related_name='certificate'
    )
    cert_number = models.CharField('Mã chứng chỉ', max_length=50, unique=True)
    cert_file   = models.FileField('File chứng chỉ (PDF)', upload_to='certificates/', blank=True)
    issued_at   = models.DateTimeField('Ngày cấp', auto_now_add=True)

    class Meta:
        db_table            = 'certificates'
        verbose_name        = 'Chứng chỉ'
        verbose_name_plural = 'Chứng chỉ'

    def __str__(self):
        return f"Cert #{self.cert_number}"