from django.urls import path
from .views import ChatbotQueryView

urlpatterns = [
    path('ask/', ChatbotQueryView.as_view(), name='chatbot-query'),
]
