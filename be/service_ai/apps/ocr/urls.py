from django.urls import path
from .views import InvoiceOCRView

urlpatterns = [
    path('process/', InvoiceOCRView.as_view(), name='invoice-ocr'),
]
