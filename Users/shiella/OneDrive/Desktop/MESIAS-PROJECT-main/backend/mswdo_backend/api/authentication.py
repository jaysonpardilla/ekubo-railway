from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.conf import settings
import jwt
from mswdo_backend.core.models import User

class JWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION')
        
        if not auth_header:
            return None
        
        try:
            prefix, token = auth_header.split()
            if prefix.lower() != 'bearer':
                raise AuthenticationFailed('Invalid token prefix')
        except ValueError:
            raise AuthenticationFailed('Invalid authorization header format')
        
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[settings.JWT_ALGORITHM]
            )
            user_id = payload.get('userId')
            user_type = payload.get('userType')
            
            if not user_id:
                raise AuthenticationFailed('Invalid token payload')
            
            user = User.objects.get(id=user_id)
            request.user = user
            request.user.user_type = user_type
            
            return (user, token)
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
        except User.DoesNotExist:
            raise AuthenticationFailed('User not found')
