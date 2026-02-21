"""
Asynchronous Server Gateway Interface config for mswdo_backend project.
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mswdo_backend.settings')

application = get_asgi_application()
