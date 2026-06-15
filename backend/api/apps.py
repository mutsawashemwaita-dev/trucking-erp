from django.apps import AppConfig
import time
from django.db import connection
from django.db.utils import OperationalError

class ApiConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'api'
    
    def ready(self):
        # Wait for database to be ready
        max_retries = 10
        retry_delay = 3
        
        for attempt in range(max_retries):
            try:
                connection.ensure_connection()
                print(f"Database connected successfully (attempt {attempt + 1})")
                break
            except OperationalError as e:
                print(f"Database connection attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(retry_delay)
                else:
                    raise