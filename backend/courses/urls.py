"""
courses/urls.py
"""
from django.urls import path
from .views import (
    AdminCourseApproveView,
    AdminCourseListView,
    AdminCourseRejectView,
    CategoryListView,
    CourseDetailView,
    CourseListView,
    InstructorCourseDetailView,
    InstructorCourseListView,
    LessonContentView,
    LessonDetailView,
    LessonListCreateView,
    ReviewCreateView,
    SectionListCreateView,
    SubmitCourseReviewView,
    EnrollCourseView,
    AdminCourseArchiveView,
    AdminCourseUnarchiveView,
)

urlpatterns = [
    # Public
    path('',                        CourseListView.as_view(),              name='course-list'),
    path('categories/',             CategoryListView.as_view(),            name='category-list'),

    # Admin
    path('admin/',                      AdminCourseListView.as_view(),    name='admin-course-list'),
    path('admin/<uuid:id>/approve/',    AdminCourseApproveView.as_view(), name='admin-course-approve'),
    path('admin/<uuid:id>/reject/',     AdminCourseRejectView.as_view(),  name='admin-course-reject'),
    path('admin/<uuid:id>/archive/',   AdminCourseArchiveView.as_view(),   name='admin-course-archive'),
    path('admin/<uuid:id>/unarchive/', AdminCourseUnarchiveView.as_view(), name='admin-course-unarchive'),

    # Instructor — khoá học
    path('mine/',                   InstructorCourseListView.as_view(),    name='instructor-course-list'),
    path('mine/<uuid:id>/',         InstructorCourseDetailView.as_view(),  name='instructor-course-detail'),
    path('mine/<uuid:id>/submit/',  SubmitCourseReviewView.as_view(),      name='course-submit'),    

    # Instructor — sections & lessons
    path('<uuid:course_id>/sections/',          SectionListCreateView.as_view(),  name='section-list'),
    path('sections/<uuid:section_id>/lessons/', LessonListCreateView.as_view(),   name='lesson-list'),
    path('lessons/<uuid:id>/',                  LessonDetailView.as_view(),       name='lesson-detail'),
    path('lessons/<uuid:id>/content/',          LessonContentView.as_view(),      name='lesson-content'),

    path('<slug:slug>/',            CourseDetailView.as_view(),            name='course-detail'),
    path('<uuid:id>/enroll/',       EnrollCourseView.as_view(),            name='course-enroll'),
    path('<slug:slug>/reviews/',    ReviewCreateView.as_view(),            name='review-create'),
]