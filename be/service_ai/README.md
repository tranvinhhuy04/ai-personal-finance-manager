# service_ai: Django 5.1 + DRF + MongoDB (pymongo/djongo)
# Clean Architecture Skeleton

apps/
  ocr/         # Invoice OCR logic
  chatbot/     # NLP financial querying

# JWT Auth: Custom middleware for Identity Service tokens
# MongoDB: Connect to Atlas, collections: transactions, monthly_aggregates
# Docker: Expose port 8000, ready for compose
