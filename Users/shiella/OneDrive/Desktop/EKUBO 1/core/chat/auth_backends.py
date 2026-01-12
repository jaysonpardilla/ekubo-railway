from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

class EmailBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            # Attempt to find the user by email
            user = get_user_model().objects.get(email=username)
            # Check the password
            if user.check_password(password):
                return user
        except get_user_model().DoesNotExist:
            return None






