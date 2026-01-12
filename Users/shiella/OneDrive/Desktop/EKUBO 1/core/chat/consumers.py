import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.urls import reverse

from .models import Message

class ChatConsumer(AsyncWebsocketConsumer):
    """
    Handles WebSocket connections for real-time chat between users.
    """

    async def connect(self):
        """
        Called when a new WebSocket connection is established.
        A user joins their own private chat room group based on their user ID.
        """
        # Get the user_id from the URL path.
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        # Create a unique group name for the user's chat channel.
        # This is where all messages for this user will be sent.
        self.room_group_name = f"chat_{self.user_id}"

        # Reject connection if user is not authenticated
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close()
            return

        # Join the room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        """
        Called when a WebSocket connection is closed.
        Leaves the user's room group.
        """
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """
        Called when a message is received from the WebSocket.
        Parses the message and routes it to the appropriate user's group.
        Also emits a `new_conversation` event to add the counterpart to
        each user's sidebar in real time when the conversation is new.
        """
        data = json.loads(text_data)
        message = data.get('message')
        receiver_id = data.get('receiver_id')  # Get the receiver's ID from the message data
        sender_user = self.scope.get('user')

        # Validate
        if not sender_user or not sender_user.is_authenticated:
            return
        if not message or not receiver_id:
            return

        # Persist message to DB
        try:
            receiver_user = await database_sync_to_async(get_user_model().objects.get)(id=receiver_id)
        except Exception:
            receiver_user = None

        if receiver_user:
            saved_message = await database_sync_to_async(Message.objects.create)(
                sender=sender_user,
                receiver=receiver_user,
                content=message
            )
            # Prepare timestamp string for clients
            timestamp = saved_message.timestamp.isoformat()

            # Create the group name for the receiver.
            receiver_group_name = f"chat_{receiver_id}"

            payload = {
                'type': 'chat_message',
                'message': message,
                'sender_id': str(sender_user.id),  # Convert UUID to string here
                'timestamp': timestamp,
                'message_id': str(saved_message.id),
            }

            # Send message to the receiver's room group
            await self.channel_layer.group_send(receiver_group_name, payload)

            # Send a copy of the message back to the sender's room group
            await self.channel_layer.group_send(self.room_group_name, payload)

            # Build additional 'new_conversation' payloads so sidebars can update
            # Helper function to get profile URL or generate a fallback avatar
            def get_profile_url(user):
                try:
                    profile = getattr(user.profile, 'profile', None)
                    if profile:
                        return profile.url
                except Exception:
                    pass
                # Fallback: generate avatar using user's name from ui-avatars.com
                name = f"{user.first_name} {user.last_name}".strip()
                if name:
                    return f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=random"
                return "https://ui-avatars.com/api/?name=User&background=random"

            sender_profile_url = get_profile_url(sender_user)
            receiver_profile_url = get_profile_url(receiver_user)

            sender_side_user = {
                'id': str(receiver_user.id),
                'first_name': receiver_user.first_name,
                'last_name': receiver_user.last_name,
                'profile_url': receiver_profile_url,
                'conversation_url': reverse('chat:chat_with', args=[receiver_user.id]),
                'last_message': message,
            }

            receiver_side_user = {
                'id': str(sender_user.id),
                'first_name': sender_user.first_name,
                'last_name': sender_user.last_name,
                'profile_url': sender_profile_url,
                'conversation_url': reverse('chat:chat_with', args=[sender_user.id]),
                'last_message': message,
            }

            # Notify sender to add the receiver to their sidebar if missing
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'new_conversation',
                    'user': sender_side_user,
                }
            )

            # Notify receiver to add the sender to their sidebar if missing
            await self.channel_layer.group_send(
                receiver_group_name,
                {
                    'type': 'new_conversation',
                    'user': receiver_side_user,
                }
            )


    async def chat_message(self, event):
        """
        Receives a message from a room group and sends it over the WebSocket
        to the connected client.
        """
        message = event.get('message')
        sender_id = event.get('sender_id')
        timestamp = event.get('timestamp')
        message_id = event.get('message_id')

        await self.send(text_data=json.dumps({
            'message': message,
            'sender_id': sender_id,
            'timestamp': timestamp,
            'message_id': message_id,
        }))

    async def new_conversation(self, event):
        """
        Sends a 'new_conversation' payload to the WebSocket client so the
        frontend can add the conversation partner to the sidebar in real time.
        """
        user = event.get('user')
        await self.send(text_data=json.dumps({
            'type': 'new_conversation',
            'user': user,
        }))
