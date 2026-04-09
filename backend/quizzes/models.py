"""
quizzes/models.py
=================
Chức năng liên quan:
  - 5.1.4  Làm bài kiểm tra, xem kết quả (Student)
  - 5.2.3  Tạo câu hỏi, tạo bài kiểm tra (Instructor)
"""
import uuid
from django.db import models
from django.conf import settings


class Quiz(models.Model):
    """
    Bài kiểm tra gắn với một bài học (lesson).
    pass_score:   % tối thiểu để đạt (mặc định 70%).
    time_limit:   giới hạn thời gian làm bài (phút), 0 = không giới hạn.
    max_attempts: số lần làm tối đa, 0 = không giới hạn.
                  Nhất quán với quy ước time_limit = 0 là không giới hạn.
    """
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson       = models.OneToOneField(
        'courses.Lesson', on_delete=models.CASCADE, related_name='quiz',
        verbose_name='Bài học',
    )
    title        = models.CharField('Tên bài kiểm tra', max_length=255)
    description  = models.TextField('Hướng dẫn', blank=True)
    pass_score   = models.PositiveSmallIntegerField('Điểm đạt (%)', default=70)
    time_limit   = models.PositiveSmallIntegerField('Giới hạn thời gian (phút)', default=0)
    max_attempts = models.PositiveSmallIntegerField('Số lần làm tối đa', default=0)  # FIX: thêm mới
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table            = 'quizzes'
        verbose_name        = 'Bài kiểm tra'
        verbose_name_plural = 'Bài kiểm tra'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Question(models.Model):
    """
    Câu hỏi trong bài kiểm tra (5.2.3).
    Hỗ trợ 3 dạng: chọn 1, chọn nhiều, đúng/sai.
    """
    class QuestionType(models.TextChoices):
        SINGLE     = 'single',     'Chọn 1 đáp án'
        MULTIPLE   = 'multiple',   'Chọn nhiều đáp án'
        TRUE_FALSE = 'true_false', 'Đúng / Sai'

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz          = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    content       = models.TextField('Nội dung câu hỏi')
    question_type = models.CharField('Loại câu hỏi', max_length=20, choices=QuestionType.choices, default=QuestionType.SINGLE)
    points        = models.PositiveSmallIntegerField('Điểm', default=1)
    explanation   = models.TextField('Giải thích đáp án', blank=True)
    order_index   = models.PositiveSmallIntegerField('Thứ tự', default=0)

    class Meta:
        db_table            = 'questions'
        ordering            = ['order_index']
        verbose_name        = 'Câu hỏi'
        verbose_name_plural = 'Câu hỏi'

    def __str__(self):
        return self.content[:80]


class Answer(models.Model):
    """
    Các lựa chọn đáp án cho một câu hỏi.
    is_correct = True → đáp án đúng (có thể có nhiều đáp án đúng với dạng MULTIPLE).
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question    = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    content     = models.CharField('Nội dung đáp án', max_length=500)
    is_correct  = models.BooleanField('Đáp án đúng', default=False)
    order_index = models.PositiveSmallIntegerField('Thứ tự', default=0)

    class Meta:
        db_table            = 'answers'
        ordering            = ['order_index']
        verbose_name        = 'Đáp án'
        verbose_name_plural = 'Đáp án'

    def __str__(self):
        mark = '✓' if self.is_correct else '✗'
        return f"{mark} {self.content[:60]}"


class QuizAttempt(models.Model):
    """
    Lần làm bài kiểm tra của học viên.
    Lưu toàn bộ câu trả lời dưới dạng JSON để phân tích sau.
    Cho phép làm lại nhiều lần (mỗi lần tạo 1 record mới).
    Số lần làm bị giới hạn bởi Quiz.max_attempts (0 = không giới hạn).
    """
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz             = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    student          = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='quiz_attempts',
        limit_choices_to={'role': 'student'},
    )
    score            = models.PositiveSmallIntegerField('Điểm đạt được (%)', default=0)
    passed           = models.BooleanField('Đạt', default=False)
    answers_snapshot = models.JSONField(
        'Snapshot câu trả lời',
        default=dict,
        help_text='{ question_id: [answer_id, ...] }',
    )
    started_at   = models.DateTimeField('Bắt đầu làm', auto_now_add=True)
    submitted_at = models.DateTimeField('Nộp bài', null=True, blank=True)

    class Meta:
        db_table            = 'quiz_attempts'
        ordering            = ['-started_at']
        verbose_name        = 'Lần làm bài'
        verbose_name_plural = 'Lần làm bài'
        indexes = [models.Index(fields=['quiz', 'student'])]

    def __str__(self):
        return f"{self.student.username} — {self.quiz.title} ({self.score}%)"