from django.urls import path
from mswdo_backend.api.views import NotificationListView, NotificationReadView, NotificationDetailView, NotificationReadView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification_list'),
    path('<str:notification_id>/read/', NotificationReadView.as_view(), name='notification_read'),
    path('<str:notification_id>/', NotificationDetailView.as_view(), name='notification_detail'),
]
