# Add to service_ai/settings.py
import os

INSTALLED_APPS = [
    ...,
    'rest_framework',
    'apps.ocr',
    'apps.chatbot',
]

MIDDLEWARE = [
    ...,
    '.core.jwt_auth.JWTAuthenticationMiddleware',
]

# MongoDB Atlas
MONGODB_URI = os.environ.get('MONGODB_URI')
MONGODB_DBNAME = os.environ.get('MONGODB_DBNAME', 'transaction-service')

# JWT Public Key for Identity Service
IDENTITY_PUBLIC_KEY = os.environ.get('IDENTITY_PUBLIC_KEY')

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}
