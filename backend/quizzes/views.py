"""
quizzes/views.py
"""
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsInstructor
from courses.models import Lesson
from enrollments.models import Enrollment
from .models import Answer, Question, Quiz, QuizAttempt
from .serializers import (
    QuestionWriteSerializer,
    QuizAttemptListSerializer,
    QuizAttemptResultSerializer,
    QuizAttemptSubmitSerializer,
    QuizDetailSerializer,
    QuizWriteSerializer,
)


# ── Instructor — quản lý quiz ─────────────────────────────────────────────────

class QuizCreateView(generics.CreateAPIView):
    """
    POST /api/quizzes/
    Instructor tạo bài kiểm tra cho một lesson — 5.2.3
    """
    serializer_class   = QuizWriteSerializer
    permission_classes = [IsAuthenticated, IsInstructor]

    def perform_create(self, serializer):
        lesson = generics.get_object_or_404(
            Lesson,
            id=serializer.validated_data['lesson'].id,
            section__course__instructor=self.request.user,
        )
        serializer.save(lesson=lesson)


class QuizUpdateView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET / PUT / PATCH / DELETE /api/quizzes/<id>/
    Instructor chỉnh sửa / xoá bài kiểm tra — 5.2.3
    """
    serializer_class   = QuizWriteSerializer
    permission_classes = [IsAuthenticated, IsInstructor]
    lookup_field       = 'id'

    def get_queryset(self):
        return Quiz.objects.filter(lesson__section__course__instructor=self.request.user)


class QuestionCreateView(generics.CreateAPIView):
    """
    POST /api/quizzes/<quiz_id>/questions/
    Instructor thêm câu hỏi (kèm đáp án) — 5.2.3
    """
    serializer_class   = QuestionWriteSerializer
    permission_classes = [IsAuthenticated, IsInstructor]

    def perform_create(self, serializer):
        quiz = generics.get_object_or_404(
            Quiz,
            id=self.kwargs['quiz_id'],
            lesson__section__course__instructor=self.request.user,
        )
        serializer.save(quiz=quiz)


class QuestionUpdateView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET / PUT / PATCH / DELETE /api/quizzes/questions/<id>/
    Instructor chỉnh sửa / xoá câu hỏi — 5.2.3
    """
    serializer_class   = QuestionWriteSerializer
    permission_classes = [IsAuthenticated, IsInstructor]
    lookup_field       = 'id'

    def get_queryset(self):
        return Question.objects.filter(
            quiz__lesson__section__course__instructor=self.request.user
        )


# ── Student — làm bài ─────────────────────────────────────────────────────────

class QuizDetailView(generics.RetrieveAPIView):
    """
    GET /api/quizzes/<id>/take/
    Student xem đề bài — 5.1.4
    Kiểm tra: đã enrolled + chưa vượt max_attempts.
    """
    serializer_class   = QuizDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field       = 'id'
    queryset           = Quiz.objects.prefetch_related('questions__answers')

    def get_object(self):
        quiz = super().get_object()
        _check_enrollment(self.request.user, quiz)
        _check_max_attempts(self.request.user, quiz)
        return quiz

class QuizDetailByLessonView(generics.RetrieveAPIView):
    """
    GET /api/quizzes/lesson/<lesson_id>/take/
    Student xem đề bài dựa vào lesson_id — 5.1.4
    Kiểm tra: đã enrolled + chưa vượt max_attempts.
    """
    serializer_class   = QuizDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # Tìm quiz theo lesson_id
        quiz = generics.get_object_or_404(
            Quiz.objects.prefetch_related('questions__answers'),
            lesson_id=self.kwargs['lesson_id']
        )
        # Check permissions
        _check_enrollment(self.request.user, quiz)
        _check_max_attempts(self.request.user, quiz)
        return quiz
    
class QuizSubmitView(APIView):
    """
    POST /api/quizzes/<id>/submit/
    Student nộp bài — 5.1.4
    Body: { answers: { "<question_id>": ["<answer_id>", ...] } }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        quiz = generics.get_object_or_404(
            Quiz.objects.prefetch_related('questions__answers'), id=id
        )
        _check_enrollment(request.user, quiz)
        _check_max_attempts(request.user, quiz)

        serializer = QuizAttemptSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submitted_answers = serializer.validated_data['answers']

        # Tính điểm
        score, total_points = _grade(quiz, submitted_answers)

        attempt = QuizAttempt.objects.create(
            quiz             = quiz,
            student          = request.user,
            score            = score,
            passed           = score >= quiz.pass_score,
            answers_snapshot = {str(k): [str(v) for v in vs] for k, vs in submitted_answers.items()},
            submitted_at     = timezone.now(),
        )

        return Response(
            QuizAttemptResultSerializer(attempt).data,
            status=status.HTTP_201_CREATED,
        )


class MyQuizAttemptsView(generics.ListAPIView):
    """
    GET /api/quizzes/<id>/attempts/
    Student xem lịch sử các lần làm bài — 5.1.4
    """
    serializer_class   = QuizAttemptListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return QuizAttempt.objects.filter(
            quiz_id=self.kwargs['id'],
            student=self.request.user,
        ).order_by('-started_at')


# ── Helpers ───────────────────────────────────────────────────────────────────

def _check_enrollment(user, quiz):
    """Kiểm tra student đã enrolled vào khoá học chứa quiz này chưa."""
    course = quiz.lesson.section.course
    enrolled = Enrollment.objects.filter(
        student=user,
        course=course,
        status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED],
    ).exists()
    if not enrolled:
        raise PermissionDenied('Bạn chưa đăng ký khoá học này.')


def _check_max_attempts(user, quiz):
    """Kiểm tra số lần làm bài không vượt quá max_attempts (0 = không giới hạn)."""
    if quiz.max_attempts == 0:
        return
    count = QuizAttempt.objects.filter(quiz=quiz, student=user).count()
    if count >= quiz.max_attempts:
        raise ValidationError(
            f'Bạn đã làm bài {count} lần, tối đa {quiz.max_attempts} lần.'
        )


def _grade(quiz: Quiz, submitted: dict) -> tuple[int, int]:
    """
    Chấm điểm bài kiểm tra.
    Trả về (score_percent, total_points).
    
    Logic:
    - SINGLE/TRUE_FALSE: Chọn đúng đáp án duy nhất
    - MULTIPLE: Chọn đúng TẤT CẢ đáp án đúng + không chọn đáp án sai
    """
    questions    = quiz.questions.prefetch_related('answers').order_by('order_index')
    total_points = sum(q.points for q in questions)
    earned       = 0

    for question in questions:
        q_id         = str(question.id)
        chosen_ids   = {str(a) for a in submitted.get(q_id, [])}
        correct_ids  = {str(a.id) for a in question.answers.filter(is_correct=True)}
        all_ids      = {str(a.id) for a in question.answers.all()}
        wrong_ids    = all_ids - correct_ids

        if question.question_type in [
            Question.QuestionType.SINGLE,
            Question.QuestionType.TRUE_FALSE,
        ]:
            # Phải chọn đúng 1 đáp án duy nhất
            if chosen_ids == correct_ids and len(chosen_ids) == 1:
                earned += question.points
                
        elif question.question_type == Question.QuestionType.MULTIPLE:
            # Chấm theo tỷ lệ: đúng bao nhiêu / tổng đáp án đúng
            # Trừ điểm nếu chọn sai (không âm)
            if len(correct_ids) == 0:
                continue
            correct_chosen   = chosen_ids & correct_ids   # chọn đúng
            wrong_chosen     = chosen_ids & wrong_ids      # chọn sai
            correct_count    = len(correct_chosen)
            wrong_count      = len(wrong_chosen)
            total_correct    = len(correct_ids)
            # Tỷ lệ = (đúng - sai) / tổng đúng, không âm
            ratio = max(0, (correct_count - wrong_count) / total_correct)
            earned += question.points * ratio

    score = int(round(earned / total_points * 100)) if total_points > 0 else 0
    return score, total_points