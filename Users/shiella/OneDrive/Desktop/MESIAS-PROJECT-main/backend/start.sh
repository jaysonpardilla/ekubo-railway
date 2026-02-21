#!/bin/bash
# Start Django development server

cd "$(dirname "$0")"

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Create migrations
echo "Creating migrations..."
python manage.py makemigrations

# Apply migrations
echo "Applying migrations..."
python manage.py migrate

# Create superuser (optional - commented out)
# echo "Creating superuser..."
# python manage.py createsuperuser

# Start server
echo "Starting Django development server on http://localhost:8000"
python manage.py runserver 0.0.0.0:8000
