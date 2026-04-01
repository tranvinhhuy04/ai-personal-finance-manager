from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import ChatbotRequestSerializer, ChatbotResponseSerializer
from .services import process_financial_query

class ChatbotQueryView(APIView):
    def post(self, request):
        serializer = ChatbotRequestSerializer(data=request.data)
        if serializer.is_valid():
            result = process_financial_query(serializer.validated_data)
            response_serializer = ChatbotResponseSerializer(result)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
