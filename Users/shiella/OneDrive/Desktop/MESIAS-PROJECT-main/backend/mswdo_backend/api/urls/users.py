from django.urls import path
from mswdo_backend.api.views import UserListView, UserDetailView, UserStatsView

urlpatterns = [
    path('', UserListView.as_view(), name='user_list'),
    path('<str:user_id>/', UserDetailView.as_view(), name='user_detail'),
    path('stats/counts/', UserStatsView.as_view(), name='user_stats'),
]
