from django.urls import path
from . import consumers

# Fix: Change the URL pattern to accept a UUID instead of an integer.
# This matches the UUID primary key used in your CustomUser model.
websocket_urlpatterns = [
    path('ws/chat/<uuid:user_id>/', consumers.ChatConsumer.as_asgi()),
]
