from django.urls import path
from mswdo_backend.api.views import BeneficiaryListView, BeneficiaryDetailView

urlpatterns = [
    path('', BeneficiaryListView.as_view(), name='beneficiary_list'),
    path('<str:beneficiary_id>/', BeneficiaryDetailView.as_view(), name='beneficiary_detail'),
]
