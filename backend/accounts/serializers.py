"""
accounts/serializers.py
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    """Đăng ký tài khoản — 5.1.1"""
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Xác nhận mật khẩu')

    class Meta:
        model  = User
        fields = ['username', 'email', 'full_name', 'password', 'password2']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email này đã được sử dụng.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password2': 'Mật khẩu xác nhận không khớp.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            role=User.Role.STUDENT,   # mặc định đăng ký là student
            **validated_data,
        )
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Xem & cập nhật hồ sơ cá nhân — 5.1.1"""
    role       = serializers.CharField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)

    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'full_name', 'avatar', 'bio', 'role', 'date_joined']
        read_only_fields = ['id', 'username', 'role', 'date_joined']


class ChangePasswordSerializer(serializers.Serializer):
    """Đổi mật khẩu"""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Mật khẩu hiện tại không đúng.')
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user


class UserAdminSerializer(serializers.ModelSerializer):
    """Dành cho Admin xem danh sách, phân quyền, khoá tài khoản — 5.3.1"""
    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'full_name', 'role', 'is_active', 'date_joined']
        read_only_fields = ['id', 'username', 'email', 'date_joined']