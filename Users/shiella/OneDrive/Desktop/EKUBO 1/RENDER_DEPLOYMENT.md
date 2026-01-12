# EKUBO Render Deployment Guide

## Changes Made

### 1. **requirements.txt** ✅
- Added `python-decouple==3.8` - Required for `from decouple import config` in settings.py

### 2. **Dockerfile** ✅
- Fixed working directory handling (now properly uses `cd core` commands)
- Added `postgresql-client` for database connectivity
- Added proper migration and static file collection
- Uses `/bin/sh -c` format for better shell command execution
- Includes error handling for migrations (ignores errors if DB not ready)
- Properly exposes port 8000
- Final CMD uses array format for better signal handling

### 3. **render.yaml** ✅
- Added `buildCommand: bash build.sh` to run migrations and collect static files during build phase
- Added `startCommand` to properly start daphne server in the core directory
- Added environment variables for Python version and PORT
- Added health check configuration (path: /, timeout: 30s)
- Specified `plan: standard` for appropriate resource allocation

### 4. **build.sh** ✅ (New)
- Created build script to handle:
  - Dependency installation
  - Database migrations
  - Static files collection
- This runs during the Render build phase before the container starts

### 5. **.dockerignore** ✅ (New)
- Optimizes Docker build by excluding unnecessary files
- Reduces image size and build time

## Required Environment Variables in Render Dashboard

Set these in your Render service settings:

```
SECRET_KEY=<your-django-secret-key>
DEBUG=False
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<dbname>
REDIS_URL=redis://<host>:<port>
CLOUDINARY_URL=cloudinary://<key>:<secret>@<cloud_name>
EMAIL_HOST_USER=<your-email>
EMAIL_HOST_PASSWORD=<app-password>
RECAPTCHA_SITE_KEY=<your-site-key>
RECAPTCHA_SECRET_KEY=<your-secret-key>
```

## Deployment Steps

1. **Ensure Render has access to your GitHub repository**
   - Connect your repository to Render if not already done

2. **Set up environment variables**
   - Go to your Render service dashboard
   - Add all required environment variables listed above

3. **Create database and Redis services**
   - PostgreSQL database (free tier available)
   - Redis instance for Channels (required for WebSocket support)

4. **Deploy**
   - Push changes to your repository
   - Render will automatically:
     - Build the Docker image
     - Run `build.sh` (migrations + static files)
     - Start the application with `daphne`

5. **Verify deployment**
   - Check Render logs for any errors
   - Visit your app URL
   - Verify WebSocket connections work (check browser console)

## Troubleshooting

### Database connection errors
- Verify `DATABASE_URL` is correct and accessible
- Check that the PostgreSQL service is running on Render

### Static files not loading
- Ensure `STATIC_ROOT` is correctly set in settings.py
- Verify Cloudinary credentials are correct for media files

### WebSocket issues
- Ensure `REDIS_URL` is set correctly
- Verify Channels is configured in settings.py
- Check that daphne is running (not gunicorn)

### Port binding issues
- The Dockerfile and render.yaml both use port 8000
- Ensure no conflicts with other services

## Additional Notes

- The project uses **Daphne** (ASGI server) which is required for Django Channels WebSocket support
- **Cloudinary** is used for media/image storage
- **Redis** is required for Channels to work properly in production
- **PostgreSQL** database is recommended for production (SQLite won't work in Render due to ephemeral filesystem)

## File Structure Expected by Render

```
/
├── requirements.txt       # Dependencies
├── build.sh              # Build script
├── core/                 # Django project root
│   ├── Dockerfile        # Container definition
│   ├── .dockerignore     # Docker exclusions
│   ├── render.yaml       # Render configuration
│   ├── manage.py
│   ├── core/
│   │   ├── settings.py
│   │   ├── asgi.py
│   │   └── ...
│   ├── chat/
│   ├── products/
│   └── ...
```

Good luck with your deployment! 🚀
