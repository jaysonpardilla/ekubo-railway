from pathlib import Path
import os
import dj_database_url
from decouple import config

BASE_DIR = Path(__file__).resolve().parent.parent

# -------------------------
# SECURITY
# -------------------------
SECRET_KEY = config("SECRET_KEY")

DEBUG = config("DEBUG", default=False, cast=bool)

ALLOWED_HOSTS = ["*"]

# -------------------------
# APPLICATIONS
# -------------------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'channels',
    'cloudinary',
    'cloudinary_storage',

    # Local apps
    'chat',
    'products',
    'manage_business',
    'shops',
    'captcha',
]

# -------------------------
# MIDDLEWARE
# -------------------------
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    "whitenoise.middleware.WhiteNoiseMiddleware",

    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    'chat.middleware.UpdateLastSeenMiddleware',
]

# -------------------------
# URLS / TEMPLATES
# -------------------------
ROOT_URLCONF = 'core.core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / "templates"],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'chat.context_processors.store_context',
            ],
        },
    },
]

# -------------------------
# ASGI / CHANNELS
# -------------------------
ASGI_APPLICATION = 'core.asgi.application'
WSGI_APPLICATION = 'core.wsgi.application'

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [config("REDIS_URL")],
        },
    },
}

# -------------------------
# DATABASE (POSTGRESQL with fallback)
# -------------------------
# Use DATABASE_URL when provided; fall back to local SQLite so the
# application can start in environments where the managed database
# isn't reachable or the environment variable is missing.
database_url = os.environ.get("DATABASE_URL")
if database_url:
    DATABASES = {
        "default": dj_database_url.parse(
            database_url,
            conn_max_age=600,
            ssl_require=True
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# -------------------------
# AUTH
# -------------------------
AUTH_USER_MODEL = 'chat.CustomUser'

AUTHENTICATION_BACKENDS = (
    'chat.auth_backends.EmailBackend',
    'django.contrib.auth.backends.ModelBackend',
)

# -------------------------
# PASSWORD VALIDATION
# -------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# -------------------------
# EMAIL (USE ENV VARS)
# -------------------------
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD")
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# -------------------------
# INTERNATIONALIZATION
# -------------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Manila'
USE_I18N = True
USE_TZ = True

# -------------------------
# STATIC FILES
# -------------------------
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / "staticfiles"
# Use the non-manifest compressed storage in this Docker build to avoid
# ManifestStaticFilesStorage runtime errors when a manifest entry is missing.
STATICFILES_STORAGE = "whitenoise.storage.CompressedStaticFilesStorage"

# -------------------------
# CLOUDINARY (MEDIA)
# -------------------------
DEFAULT_FILE_STORAGE = "cloudinary_storage.storage.MediaCloudinaryStorage"

CLOUDINARY_STORAGE = {
    "CLOUDINARY_URL": config("CLOUDINARY_URL"),
}

CSRF_TRUSTED_ORIGINS = [
    "https://ekubo.onrender.com",
]

# -------------------------
# CAPTCHA
# -------------------------
RECAPTCHA_PUBLIC_KEY = config("RECAPTCHA_SITE_KEY")
RECAPTCHA_PRIVATE_KEY = config("RECAPTCHA_SECRET_KEY")

# -------------------------
# DEFAULT
# -------------------------
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
