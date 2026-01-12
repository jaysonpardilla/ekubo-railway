import os
import sys
from pathlib import Path
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

# Ensure the project packages are importable regardless of workdir
BASE_DIR = Path(__file__).resolve().parent.parent  # /app/core
REPO_ROOT = BASE_DIR.parent  # /app
for p in (str(BASE_DIR), str(REPO_ROOT)):
    if p not in sys.path:
        sys.path.insert(0, p)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.core.settings')
django.setup()

# Import websocket URL patterns using either import path
try:
    from core.chat.routing import websocket_urlpatterns
except Exception:
    from chat.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})