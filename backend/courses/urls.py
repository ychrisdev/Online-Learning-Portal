"""
courses/urls.py  (ĐÃ SỬA — thêm admin/<uuid:id>/ cho CRUD)
"""

from django.urls import path
from .views import (
    AdminCourseApproveView,
    AdminCourseArchiveView,
    AdminCourseDetailView,        # ← MỚI
    AdminCourseListView,
    AdminCourseRejectView,
    AdminCourseUnarchiveView,
    CategoryListView,
    CourseDetailView,
    CourseListView,
    EnrollCourseView,
    InstructorCourseDetailView,
    InstructorCourseListView,
    LessonContentView,
    LessonDetailView,
    LessonListCreateView,
    MyReviewView,
    ReviewCreateView,
    ReviewUpdateView,
    SectionListCreateView,
    SubmitCourseReviewView,
    AdminSectionListCreateView,
    AdminSectionDetailView,
    AdminLessonListCreateView,
    AdminLessonDetailView,
    CategoryDetailView,
    AdminReviewListView,
    AdminReviewDetailView,
    AdminReviewToggleHideView,
    InstructorCourseUnarchiveView,
    InstructorCourseArchiveView,
    InstructorSectionListCreateView,
    InstructorSectionDetailView,
    InstructorLessonListCreateView,
    InstructorLessonDetailView,
    InstructorReviewListView,
    InstructorReviewReportView,
    AdminReviewDismissReportView,
    AdminCourseRejectArchiveView
)

urlpatterns = [
    # Public
    path('',            CourseListView.as_view(),   name='course-list'),
    path('categories/', CategoryListView.as_view(), name='category-list'),

    # ── Admin ─────────────────────────────────────────────────────────────────
    # Action routes đặt TRƯỚC <uuid:id>/ để không bị shadow
    path('admin/',                     AdminCourseListView.as_view(),      name='admin-course-list'),
    path('admin/<uuid:id>/',           AdminCourseDetailView.as_view(),    name='admin-course-detail'),  # ← MỚI
    path('admin/<uuid:id>/approve/',   AdminCourseApproveView.as_view(),   name='admin-course-approve'),
    path('admin/<uuid:id>/reject/',    AdminCourseRejectView.as_view(),    name='admin-course-reject'),
    path('admin/<uuid:id>/archive/',   AdminCourseArchiveView.as_view(),   name='admin-course-archive'),
    path('admin/<uuid:id>/unarchive/', AdminCourseUnarchiveView.as_view(), name='admin-course-unarchive'),
    path('admin/<uuid:id>/reject-archive/', AdminCourseRejectArchiveView.as_view(), name='admin-course-reject-archive'),
     # ── Admin Section ──────────────────────────────────────────────────────────────
    path('sections/',          AdminSectionListCreateView.as_view(), name='admin-section-list'),
    path('sections/<uuid:id>/', AdminSectionDetailView.as_view(),   name='admin-section-detail'),
    # ── Admin Lesson ──────────────────────────────────────────────────────────────
    path('lessons/admin/',           AdminLessonListCreateView.as_view(), name='admin-lesson-list'),
    path('lessons/admin/<uuid:id>/', AdminLessonDetailView.as_view(),     name='admin-lesson-detail'),
    # ── Admin Category ──────────────────────────────────────────────────────────────
    path('categories/<uuid:id>/', CategoryDetailView.as_view(), name='category-detail'),
    # ── Admin Reviews ─────────────────────────────────────────────────────────────
    path('reviews/mine/', InstructorReviewListView.as_view(), name='instructor-review-list'),
    path('reviews/report/<uuid:pk>/', InstructorReviewReportView.as_view(), name='instructor-review-report'),
    path('reviews/admin/',           AdminReviewListView.as_view(),   name='admin-review-list'),
    path('reviews/admin/<uuid:pk>/', AdminReviewDetailView.as_view(), name='admin-review-detail'),
    path('reviews/admin/<uuid:pk>/toggle-hide/', AdminReviewToggleHideView.as_view(), name='admin-review-toggle-hide'),
    path('reviews/admin/<uuid:pk>/dismiss-report/', AdminReviewDismissReportView.as_view(), name='admin-review-dismiss-report'),

    # ── Instructor — khoá học ─────────────────────────────────────────────────
    path('mine/',                  InstructorCourseListView.as_view(),   name='instructor-course-list'),
    path('mine/<uuid:id>/',        InstructorCourseDetailView.as_view(), name='instructor-course-detail'),
    path('mine/<uuid:id>/submit/', SubmitCourseReviewView.as_view(),     name='course-submit'),
    path('mine/<uuid:id>/unarchive/', InstructorCourseUnarchiveView.as_view(), name='instructor-course-unarchive'),
    path('mine/<uuid:id>/archive/',   InstructorCourseArchiveView.as_view(),   name='instructor-course-archive'),

    # ── Instructor — sections & lessons ───────────────────────────────────────
    path('<uuid:course_id>/sections/',          SectionListCreateView.as_view(), name='section-list'),
    path('mine/sections/',           InstructorSectionListCreateView.as_view(), name='instructor-section-list'),
    path('mine/sections/<uuid:id>/', InstructorSectionDetailView.as_view(),     name='instructor-section-detail'),
    path('sections/<uuid:section_id>/lessons/', LessonListCreateView.as_view(),  name='lesson-list'),
    path('lessons/<uuid:id>/',                  LessonDetailView.as_view(),      name='lesson-detail'),
    path('lessons/<uuid:id>/content/',          LessonContentView.as_view(),     name='lesson-content'),
    path('mine/lessons/',           InstructorLessonListCreateView.as_view(), name='instructor-lesson-list'),
    path('mine/lessons/<uuid:id>/', InstructorLessonDetailView.as_view(),     name='instructor-lesson-detail'),

    # ── Enroll ────────────────────────────────────────────────────────────────
    path('<uuid:id>/enroll/', EnrollCourseView.as_view(), name='course-enroll'),

    # ── Reviews — specific trước, generic sau ─────────────────────────────────
    path('<slug:slug>/reviews/me/',        MyReviewView.as_view(),     name='review-me'),
    path('<slug:slug>/reviews/<uuid:pk>/', ReviewUpdateView.as_view(), name='review-update'),
    path('<slug:slug>/reviews/',           ReviewCreateView.as_view(), name='review-create'),

    # ── Course detail — luôn cuối cùng ───────────────────────────────────────
    path('<slug:slug>/', CourseDetailView.as_view(), name='course-detail'),
]