"""
quizzes/urls.py
"""
from django.urls import path
from .views import (
    MyQuizAttemptsView,
    QuestionListCreateView,
    QuestionUpdateView,
    QuizListCreateView,
    QuizDetailView,
    QuizSubmitView,
    QuizUpdateView,
    QuizDetailByLessonView,
    AdminQuizAttemptsView,
    QuizAttemptDetailView,
    QuizStartView,
    MyAllQuizAttemptsView,
)

urlpatterns = [
    path('', QuizListCreateView.as_view(), name='quiz-list-create'),
    path('mine/', QuizListCreateView.as_view(), name='quiz-mine'),

    path('lesson/<uuid:lesson_id>/take/', QuizDetailByLessonView.as_view(), name='quiz-take-by-lesson'),
    path('attempts/mine/', MyAllQuizAttemptsView.as_view(), name='my-quiz-attempts'),
    path('attempts/<uuid:id>/', QuizAttemptDetailView.as_view(), name='quiz-attempt-detail'),
    path('questions/<uuid:id>/', QuestionUpdateView.as_view(), name='question-update'),

    path('<uuid:id>/take/', QuizDetailView.as_view(), name='quiz-take'),
    path('<uuid:id>/submit/', QuizSubmitView.as_view(), name='quiz-submit'),
    path('<uuid:id>/start/', QuizStartView.as_view(), name='quiz-start'),
    path('<uuid:id>/attempts/', MyQuizAttemptsView.as_view(), name='quiz-attempts'),
    path('<uuid:id>/attempts/all/', AdminQuizAttemptsView.as_view(), name='quiz-attempts-all'),
    path('<uuid:quiz_id>/questions/', QuestionListCreateView.as_view(), name='question-list-create'),

    path('<uuid:id>/', QuizUpdateView.as_view(), name='quiz-update'),
]