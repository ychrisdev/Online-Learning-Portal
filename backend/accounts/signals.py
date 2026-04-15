"""
accounts/signals.py
Tự động cập nhật thống kê InstructorProfile khi:
  - Enrollment thay đổi  → total_students
  - Course thay đổi      → total_courses
  - Review thay đổi      → avg_rating
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg


def _update_instructor_stats(instructor):
    """Tính lại toàn bộ 3 chỉ số và lưu 1 lần."""
    from courses.models import Course, Review
    from enrollments.models import Enrollment

    try:
        profile = instructor.instructor_profile
    except Exception:
        return

    published_courses = Course.objects.filter(
        instructor=instructor,
        status=Course.Status.PUBLISHED,
    )

    profile.total_courses  = published_courses.count()
    profile.total_students = Enrollment.objects.filter(
        course__instructor=instructor,
        status__in=['active', 'completed'],
    ).values('student').distinct().count()

    avg = Review.objects.filter(
        course__instructor=instructor,
        is_hidden=False,
    ).aggregate(a=Avg('rating'))['a']
    profile.avg_rating = round(avg or 0.0, 2)

    profile.save(update_fields=['total_courses', 'total_students', 'avg_rating'])


# ── Enrollment ────────────────────────────────────────────────────────────────
@receiver(post_save, sender='enrollments.Enrollment')
def on_enrollment_save(sender, instance, **kwargs):
    if instance.course.instructor:
        _update_instructor_stats(instance.course.instructor)


@receiver(post_delete, sender='enrollments.Enrollment')
def on_enrollment_delete(sender, instance, **kwargs):
    if instance.course.instructor:
        _update_instructor_stats(instance.course.instructor)


# ── Course ────────────────────────────────────────────────────────────────────
@receiver(post_save, sender='courses.Course')
def on_course_save(sender, instance, **kwargs):
    if instance.instructor:
        _update_instructor_stats(instance.instructor)


@receiver(post_delete, sender='courses.Course')
def on_course_delete(sender, instance, **kwargs):
    if instance.instructor:
        _update_instructor_stats(instance.instructor)


# ── Review ────────────────────────────────────────────────────────────────────
@receiver(post_save, sender='courses.Review')
def on_review_save(sender, instance, **kwargs):
    if instance.course.instructor:
        _update_instructor_stats(instance.course.instructor)


@receiver(post_delete, sender='courses.Review')
def on_review_delete(sender, instance, **kwargs):
        if instance.course.instructor:
            _update_instructor_stats(instance.course.instructor)