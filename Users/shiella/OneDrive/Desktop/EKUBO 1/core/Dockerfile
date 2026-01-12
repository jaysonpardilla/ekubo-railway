FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel
RUN pip install --prefer-binary -r requirements.txt

COPY . .

EXPOSE 10000

# ENTRYPOINT handles migrations at runtime
CMD ["sh", "-c", "cd /app/core && python manage.py migrate && python manage.py collectstatic --noinput && daphne -b 0.0.0.0 -p $PORT core.asgi:application"]
