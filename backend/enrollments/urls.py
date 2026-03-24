"""
enrollments/urls.py
"""
from django.urls import path
from .views import (
    InstructorStudentListView,
    MyCertificateListView,
    MyEnrollmentListView,
    ProgressListView,
    ProgressUpdateView,
)

urlpatterns = [
    # Student
    path('',                                        MyEnrollmentListView.as_view(),      name='enrollment-list'),
    path('<uuid:enrollment_id>/progress/',          ProgressListView.as_view(),          name='progress-list'),
    path('progress/<uuid:lesson_id>/',              ProgressUpdateView.as_view(),        name='progress-update'),
    path('certificates/',                           MyCertificateListView.as_view(),     name='certificate-list'),

    # Instructor
    path('instructor/<uuid:course_id>/students/',  InstructorStudentListView.as_view(), name='instructor-students'),
]