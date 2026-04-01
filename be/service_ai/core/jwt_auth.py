import os
import jwt
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils.functional import SimpleLazyObject
from django.contrib.auth.models import AnonymousUser

class JWTUser(AnonymousUser):
    """
    A simple user object for JWT-authenticated users.
    """
    def __init__(self, user_id, payload):
        super().__init__()
        self.id = user_id
        self.payload = payload

class JWTAuthentication(BaseAuthentication):
    """
    Custom JWT authentication for DRF.
    """
    def authenticate(self, request):
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth_header.startswith('Bearer '):
            return None
        token = auth_header.split(' ')[1]
        jwt_secret = os.getenv('JWT_SECRET_KEY')
        algorithm = os.getenv('ALGORITHM', 'HS256')
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=[algorithm])
            user_id = payload.get('user_id')
            if not user_id:
                raise AuthenticationFailed('user_id missing in token')
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
        except Exception:
            raise AuthenticationFailed('Authentication failed')

        user = SimpleLazyObject(lambda: JWTUser(user_id, payload))
        return (user, token)
