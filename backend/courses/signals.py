"""
courses/signals.py
Signal tự động cập nhật avg_rating và total_students trên Course.
"""
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.db.models import Avg
from django.utils import timezone

from .models import Review
from enrollments.models import Enrollment

def touch_course(course):
    if course:
        course.__class__.objects.filter(pk=course.pk).update(
            updated_at=timezone.now()
        )

def _update_avg_rating(course):
    result = course.reviews.aggregate(avg=Avg('rating'))
    course.avg_rating = round(result['avg'] or 0, 1)
    course.save(update_fields=['avg_rating'])


def _update_total_students(course):
    course.total_students = course.enrollments.filter(
        status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED]
    ).count()
    course.save(update_fields=['total_students'])

@receiver(post_save, sender=Review)
def review_saved(sender, instance, **kwargs):
    _update_avg_rating(instance.course)


@receiver(post_delete, sender=Review)
def review_deleted(sender, instance, **kwargs):
    _update_avg_rating(instance.course)

@receiver(post_save, sender=Enrollment)
def enrollment_saved(sender, instance, **kwargs):
    _update_total_students(instance.course)


@receiver(post_delete, sender=Enrollment)
def enrollment_deleted(sender, instance, **kwargs):
    _update_total_students(instance.course)
    
@receiver([post_save, post_delete], sender='courses.Section')
def section_changed(sender, instance, **kwargs):
    touch_course(instance.course)

@receiver([post_save, post_delete], sender='courses.Lesson')
def lesson_changed(sender, instance, **kwargs):
    course = getattr(instance.section, 'course', None)
    touch_course(course)

@receiver([post_save, post_delete], sender='quizzes.Quiz')
def quiz_changed(sender, instance, **kwargs):
    try:
        course = instance.lesson.section.course
        touch_course(course)
    except AttributeError:
        pass

@receiver([post_save, post_delete], sender='quizzes.Question')
def question_changed(sender, instance, **kwargs):
    try:
        course = instance.quiz.lesson.section.course
        touch_course(course)
    except AttributeError:
        pass