from django.urls import path
from mswdo_backend.api.views import SignupView, LoginView, CurrentUserView

urlpatterns = [
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', LoginView.as_view(), name='login'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
]
