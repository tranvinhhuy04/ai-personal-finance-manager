
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework_simplejwt.authentication import JWTAuthentication
from .serializers import OCRUploadSerializer
from .services import OCRService

class OCRScanView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = OCRUploadSerializer(data=request.data)
        if serializer.is_valid():
            image = serializer.validated_data['image']
            # Lưu file tạm để truyền path cho easyocr
            import tempfile
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=True) as tmp:
                for chunk in image.chunks():
                    tmp.write(chunk)
                tmp.flush()
                result = OCRService.extract(tmp.name)
            return Response(result, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
