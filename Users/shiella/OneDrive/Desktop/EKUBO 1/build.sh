#!/bin/bash
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Change to core directory
cd core

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput --clear
