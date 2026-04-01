import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
PORT = os.environ.get("AI_SERVICE_PORT", "3004")
application = get_wsgi_application()

print(f"AI Service is running on port {PORT}")
