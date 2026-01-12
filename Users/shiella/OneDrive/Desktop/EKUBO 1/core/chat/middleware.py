from django.utils.timezone import now
from django.contrib.auth.middleware import get_user

class UpdateLastSeenMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        user = get_user(request)
        if user.is_authenticated:
            user.profile.last_seen = now()
            user.profile.save(update_fields=['last_seen'])
        return self.get_response(request)
