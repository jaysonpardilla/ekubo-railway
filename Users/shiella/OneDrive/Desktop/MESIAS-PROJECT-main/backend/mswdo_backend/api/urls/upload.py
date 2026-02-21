from django.urls import path
from mswdo_backend.api.upload_views import UploadView, PublicUploadView

urlpatterns = [
    path('', UploadView.as_view(), name='upload'),
    path('public/', PublicUploadView.as_view(), name='upload-public'),
]
