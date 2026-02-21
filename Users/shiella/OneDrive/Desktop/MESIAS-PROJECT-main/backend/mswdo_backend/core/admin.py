from django.contrib import admin
from mswdo_backend.core.models import User, Beneficiary, BHWAssignment, Program, Application, ApplicationDocument, ReleaseSchedule, Notification

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'username', 'user_type', 'created_at')
    search_fields = ('email', 'username')
    list_filter = ('user_type', 'created_at')

@admin.register(Beneficiary)
class BeneficiaryAdmin(admin.ModelAdmin):
    list_display = ('user', 'classification', 'status', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name')
    list_filter = ('classification', 'status', 'created_at')

@admin.register(BHWAssignment)
class BHWAssignmentAdmin(admin.ModelAdmin):
    list_display = ('bhw_user', 'barangay', 'created_at')
    search_fields = ('bhw_user__email', 'barangay')
    list_filter = ('barangay', 'created_at')

@admin.register(Program)
class ProgramAdmin(admin.ModelAdmin):
    list_display = ('name', 'program_type', 'is_active', 'created_at')
    search_fields = ('name', 'description')
    list_filter = ('program_type', 'is_active', 'created_at')

@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('beneficiary', 'program', 'status', 'created_at')
    search_fields = ('beneficiary__user__email', 'program__name')
    list_filter = ('status', 'created_at')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'type', 'is_read', 'created_at')
    search_fields = ('title', 'user__email')
    list_filter = ('type', 'is_read', 'created_at')
