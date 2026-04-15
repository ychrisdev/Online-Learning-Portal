"""
enrollments/urls.py
"""
from django.urls import path
from .views import (
    AdminEnrollmentListView,
    InstructorStudentListView,
    MyCertificateListView,
    MyEnrollmentListView,
    ProgressListView,
    ProgressUpdateView,
    AdminUserCertificateListView,
    InstructorEnrollmentListView,
)

urlpatterns = [
    # Admin
    path('admin/users/<uuid:user_id>/certificates/',        AdminUserCertificateListView.as_view(), name='admin-user-certificates'),
    path('admin/',                                  AdminEnrollmentListView.as_view(),  name='admin-enrollment-list'),
    
    # Student
    path('',                                        MyEnrollmentListView.as_view(),      name='enrollment-list'),
    path('<uuid:enrollment_id>/progress/',          ProgressListView.as_view(),          name='progress-list'),
    path('progress/<uuid:lesson_id>/',              ProgressUpdateView.as_view(),        name='progress-update'),
    path('certificates/',                           MyCertificateListView.as_view(),     name='certificate-list'),

    # Instructor
    path('instructor/<uuid:course_id>/students/',  InstructorStudentListView.as_view(), name='instructor-students'),
    path('instructor/', InstructorEnrollmentListView.as_view(), name='instructor-enrollment-list'),
]   