"""
accounts/permissions.py
-----------------------
Permissions dùng chung cho toàn project.
Import từ đây thay vì định nghĩa lại ở mỗi app.
"""
from rest_framework.permissions import BasePermission


class IsStudent(BasePermission):
    """Chỉ học viên được truy cập."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_student)


class IsInstructor(BasePermission):
    """Chỉ giảng viên được truy cập."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_instructor)


class IsAdminUser(BasePermission):
    """Chỉ admin được truy cập."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin_user)


class IsInstructorOrAdmin(BasePermission):
    """Giảng viên hoặc Admin."""
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and (request.user.is_instructor or request.user.is_admin_user)
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level: chủ sở hữu hoặc admin mới được thao tác.
    Object phải có trường `user` hoặc `student`.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_admin_user:
            return True
        owner = getattr(obj, 'user', None) or getattr(obj, 'student', None)
        return owner == request.user