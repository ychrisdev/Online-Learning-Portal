"""
quizzes/admin.py
"""
from django.contrib import admin
from .models import Answer, Question, Quiz, QuizAttempt


class AnswerInline(admin.TabularInline):
    model  = Answer
    extra  = 2
    fields = ['content', 'is_correct', 'order_index']


class QuestionInline(admin.TabularInline):
    model  = Question
    extra  = 0
    fields = ['content', 'question_type', 'points', 'order_index']
    show_change_link = True


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display  = ['title', 'lesson', 'pass_score', 'time_limit', 'max_attempts']
    search_fields = ['title', 'lesson__title']
    inlines       = [QuestionInline]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display  = ['content', 'quiz', 'question_type', 'points', 'order_index']
    list_filter   = ['question_type']
    search_fields = ['content']
    inlines       = [AnswerInline]


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display  = ['student', 'quiz', 'score', 'passed', 'submitted_at']
    list_filter   = ['passed']
    search_fields = ['student__username', 'quiz__title']
    readonly_fields = ['answers_snapshot']