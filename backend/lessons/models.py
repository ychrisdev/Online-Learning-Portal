from django.db import models
from courses.models import Course


class Lesson(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)

    title = models.CharField(max_length=255)

    video = models.FileField(upload_to='lessons/videos/')
    document = models.FileField(upload_to='lessons/docs/', blank=True, null=True)

    order = models.IntegerField()

    def __str__(self):
        return self.title