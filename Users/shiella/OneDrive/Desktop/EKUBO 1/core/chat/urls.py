from django.urls import path
from . import views
from django.contrib.auth.views import LogoutView
app_name = 'chat'

urlpatterns = [
    path('', views.landingPage, name='landing_page'),
    path('signup/', views.signup, name='signup'),
    path('login/', views.login_view, name='login'),
    path('logout/', LogoutView.as_view(next_page='/login/'), name='logout'),

    path('profile/', views.profile_detail, name='profile_detail'),
    path('profile/edit-address/', views.edit_address, name='edit_address'),
    path('profile/edit-profile/', views.edit_profile, name='edit_profile'),
    path('help/', views.help, name='help'),
    path('home/', views.home, name='home'),
    path('update-user-credentials/<uuid:id>/', views.update_user, name='update_user'),
    path('chats/conversation/', views.conversation, name='chat_dashboard'),
    path('conversation/<uuid:chat_id>/', views.conversation, name='chat_with'),
    path('notifications/', views.buyer_notification, name='buyer_notification'),
    path("get-notifications/", views.get_notifications, name="get_notifications"),
    path("mark-notifications-read/", views.mark_notifications_read, name="mark_notifications_read"),
    path('get_unread_messages/', views.get_unread_messages_count, name='get_unread_messages'),
    path('mark_messages_read/', views.mark_messages_read, name='mark_messages_read'),
    path('error-page/', views.error_page, name='error'),
    path('verify/', views.verify_user, name='verify_user'),
    path('reset/new-password/', views.set_new_password, name='set_new_password'),
]








