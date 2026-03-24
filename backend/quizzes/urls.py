"""
quizzes/urls.py
"""
from django.urls import path
from .views import (
    MyQuizAttemptsView,
    QuestionCreateView,
    QuestionUpdateView,
    QuizCreateView,
    QuizDetailView,
    QuizSubmitView,
    QuizUpdateView,
)

urlpatterns = [
    # Instructor — quiz
    path('',                            QuizCreateView.as_view(),    name='quiz-create'),
    path('<uuid:id>/',                  QuizUpdateView.as_view(),    name='quiz-update'),

    # Instructor — questions
    path('<uuid:quiz_id>/questions/',   QuestionCreateView.as_view(),  name='question-create'),
    path('questions/<uuid:id>/',        QuestionUpdateView.as_view(),  name='question-update'),

    # Student
    path('<uuid:id>/take/',             QuizDetailView.as_view(),    name='quiz-take'),
    path('<uuid:id>/submit/',           QuizSubmitView.as_view(),    name='quiz-submit'),
    path('<uuid:id>/attempts/',         MyQuizAttemptsView.as_view(), name='quiz-attempts'),
]