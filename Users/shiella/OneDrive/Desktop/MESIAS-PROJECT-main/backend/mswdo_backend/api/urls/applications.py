from django.urls import path
from mswdo_backend.api.views import ApplicationListView, ApplicationDetailView, ApplicationStatsView
from mswdo_backend.api.views import ReleaseScheduleCreateView, ReleaseScheduleClaimView

urlpatterns = [
    path('', ApplicationListView.as_view(), name='application_list'),
    path('<str:application_id>/', ApplicationDetailView.as_view(), name='application_detail'),
    path('<str:application_id>/schedule/', ReleaseScheduleCreateView.as_view(), name='application_schedule'),
    path('<str:application_id>/schedule/claim/', ReleaseScheduleClaimView.as_view(), name='application_schedule_claim'),
    path('stats/counts/', ApplicationStatsView.as_view(), name='application_stats'),
]
