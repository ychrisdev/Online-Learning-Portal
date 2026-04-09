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
)

urlpatterns = [
    path('', QuizListCreateView.as_view(), name='quiz-list-create'),

    # ✅ Route cụ thể lên TRÊN
    path('<uuid:id>/take/',     QuizDetailView.as_view(),    name='quiz-take'),
    path('<uuid:id>/submit/',   QuizSubmitView.as_view(),    name='quiz-submit'),
    path('<uuid:id>/attempts/', MyQuizAttemptsView.as_view(), name='quiz-attempts'),  # ← đây
    path('<uuid:id>/attempts/all/', AdminQuizAttemptsView.as_view(), name='quiz-attempts-all'),
    path('attempts/<uuid:id>/', QuizAttemptDetailView.as_view()),
    path('<uuid:id>/start/',   QuizStartView.as_view()),

    # Route chung xuống DƯỚI
    path('<uuid:id>/',          QuizUpdateView.as_view(),    name='quiz-update'),

    path('<uuid:quiz_id>/questions/',  QuestionListCreateView.as_view(), name='question-list-create'),
    path('questions/<uuid:id>/',       QuestionUpdateView.as_view(),     name='question-update'),
    path('lesson/<uuid:lesson_id>/take/', QuizDetailByLessonView.as_view(), name='quiz-take-by-lesson'),
]