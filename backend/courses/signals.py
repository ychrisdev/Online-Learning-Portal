"""
courses/signals.py
Signal tự động cập nhật avg_rating trên Course khi có Review mới.
"""
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.db.models import Avg

from .models import Review


def _update_avg_rating(course):
    result = course.reviews.aggregate(avg=Avg('rating'))
    course.avg_rating = round(result['avg'] or 0, 1)
    course.save(update_fields=['avg_rating'])


@receiver(post_save, sender=Review)
def review_saved(sender, instance, **kwargs):
    _update_avg_rating(instance.course)


@receiver(post_delete, sender=Review)
def review_deleted(sender, instance, **kwargs):
    _update_avg_rating(instance.course)