"""
URL configuration for mswdo_backend project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from mswdo_backend.api.views import HealthCheckView

urlpatterns = [
    path('api/health', HealthCheckView.as_view(), name='health'),
    path('api/auth/', include('mswdo_backend.api.urls.auth')),
    path('api/users/', include('mswdo_backend.api.urls.users')),
    path('api/beneficiaries/', include('mswdo_backend.api.urls.beneficiaries')),
    path('api/applications/', include('mswdo_backend.api.urls.applications')),
    path('api/programs/', include('mswdo_backend.api.urls.programs')),
    path('api/notifications/', include('mswdo_backend.api.urls.notifications')),
    path('api/upload/', include('mswdo_backend.api.urls.upload')),
    path('api/deceased_reports/', include('mswdo_backend.api.urls.deceased_reports')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
