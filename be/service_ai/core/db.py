import os
import pymongo
import threading
from django.apps import AppConfig

class MongoDBClient:
    """
    Singleton MongoDB client for the Django project.
    Usage: client = MongoDBClient().client
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super().__new__(cls)
                    cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        self.mongo_uri = os.getenv('MONGO_URI')
        self.mongo_db_name = os.getenv('MONGO_DB_NAME', 'transaction-service')
        self.client = pymongo.MongoClient(self.mongo_uri)
        self.db = self.client[self.mongo_db_name]

    def get_collection(self, name):
        return self.db[name]

    def close(self):
        if self.client:
            self.client.close()

# Optional: Hook to close MongoDB connection on Django shutdown
class MongoDBAppConfig(AppConfig):
    name = 'service_ai.core'

    def ready(self):
        import atexit
        atexit.register(lambda: MongoDBClient().close())
