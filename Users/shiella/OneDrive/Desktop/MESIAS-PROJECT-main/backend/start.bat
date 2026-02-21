@echo off
REM Start Django development server

cd /d "%~dp0"

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Create migrations
echo Creating migrations...
python manage.py makemigrations

REM Apply migrations
echo Applying migrations...
python manage.py migrate

REM Start server
echo Starting Django development server on http://localhost:8000
python manage.py runserver 0.0.0.0:8000
