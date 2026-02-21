from django.urls import path
from mswdo_backend.api.views import ProgramListView, ProgramDetailView

urlpatterns = [
    path('', ProgramListView.as_view(), name='program_list'),
    path('<str:program_id>/', ProgramDetailView.as_view(), name='program_detail'),
]
