from rest_framework import serializers

class OCRRequestSerializer(serializers.Serializer):
    image = serializers.CharField()  # base64 or URL

class OCRResponseSerializer(serializers.Serializer):
    invoice_date = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=18, decimal_places=2)
    vendor = serializers.CharField()
    category = serializers.CharField()
