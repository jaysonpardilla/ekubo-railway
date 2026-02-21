from django.urls import path
from mswdo_backend.api.views import DeceasedReportListCreateView, DeceasedReportDetailView

urlpatterns = [
    path('', DeceasedReportListCreateView.as_view(), name='deceased_report_list'),
    path('<str:report_id>/', DeceasedReportDetailView.as_view(), name='deceased_report_detail'),
]
