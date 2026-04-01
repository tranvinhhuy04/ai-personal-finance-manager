from rest_framework import serializers

class ChatbotRequestSerializer(serializers.Serializer):
    question = serializers.CharField()

class ChatbotResponseSerializer(serializers.Serializer):
    answer = serializers.CharField()
