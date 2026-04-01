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
    QuizDetailByLessonView,
)

urlpatterns = [
    path('',                              QuizCreateView.as_view(),          name='quiz-create'),
    path('<uuid:id>/',                    QuizUpdateView.as_view(),          name='quiz-update'),
    path('<uuid:quiz_id>/questions/',     QuestionCreateView.as_view(),      name='question-create'),
    path('questions/<uuid:id>/',          QuestionUpdateView.as_view(),      name='question-update'),
    
    # Student — fetch quiz by lesson ID ← THÊM DÒNG NÀY
    path('lesson/<uuid:lesson_id>/take/', QuizDetailByLessonView.as_view(), name='quiz-take-by-lesson'),
    
    # Student — fetch quiz by quiz ID (cũ)
    path('<uuid:id>/take/',               QuizDetailView.as_view(),          name='quiz-take'),
    path('<uuid:id>/submit/',             QuizSubmitView.as_view(),          name='quiz-submit'),
    path('<uuid:id>/attempts/',           MyQuizAttemptsView.as_view(),      name='quiz-attempts'),
    path('<uuid:quiz_id>/attempts/', MyQuizAttemptsView.as_view(), name='quiz-attempts'),
]