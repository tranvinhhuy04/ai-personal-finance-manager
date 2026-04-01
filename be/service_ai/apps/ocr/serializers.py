from rest_framework import serializers

class OCRUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()

    def validate_image(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Image size must be < 5MB.")
        if value.content_type not in ["image/jpeg", "image/png"]:
            raise serializers.ValidationError("Only JPG/PNG images are supported.")
        return value
