from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import OCRRequestSerializer, OCRResponseSerializer
from .services import process_invoice_ocr

class InvoiceOCRView(APIView):
    def post(self, request):
        serializer = OCRRequestSerializer(data=request.data)
        if serializer.is_valid():
            result = process_invoice_ocr(serializer.validated_data)
            response_serializer = OCRResponseSerializer(result)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
