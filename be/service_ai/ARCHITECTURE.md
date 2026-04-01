# Clean Architecture for Django service_ai
service_ai/
    apps/
        ocr/
            __init__.py
            apps.py
            views.py
            services.py
            serializers.py
            urls.py
        chatbot/
            __init__.py
            apps.py
            views.py
            services.py
            serializers.py
            urls.py
    core/
        __init__.py
        jwt_auth.py  # JWT middleware
        db.py        # MongoDB connection
    config/
        settings.py
        urls.py
        wsgi.py
        asgi.py
ARCHITECTURE.md
docker-compose.service_ai.yml
Dockerfile
Readme.md
requirements.txt
# Each app (ocr, chatbot) is self-contained.
# core/ holds cross-cutting concerns (auth, db).
