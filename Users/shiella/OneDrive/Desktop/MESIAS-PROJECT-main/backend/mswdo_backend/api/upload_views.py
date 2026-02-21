from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.conf import settings
import os
import uuid

class UploadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        file = request.FILES.get('file')
        
        if not file:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
        if file.content_type not in allowed_types:
            return Response({
                'error': 'Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate file size (10MB)
        if file.size > 10 * 1024 * 1024:
            return Response({
                'error': 'File size exceeds 10MB limit'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Generate unique filename
        file_ext = os.path.splitext(file.name)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        
        # Create uploads directory if it doesn't exist
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)
        
        # Save file
        file_path = os.path.join(settings.MEDIA_ROOT, unique_filename)
        with open(file_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)
        
        file_url = f"/uploads/{unique_filename}"
        
        return Response({
            'url': file_url,
            'filename': unique_filename,
            'size': file.size,
            'mimetype': file.content_type
        }, status=status.HTTP_201_CREATED)


class PublicUploadView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        file = request.FILES.get('file')

        if not file:
            return Response({'error': 'No file uploaded'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file type
        allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
        if file.content_type not in allowed_types:
            return Response({
                'error': 'Invalid file type. Only JPEG, PNG, GIF, and PDF files are allowed.'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate file size (10MB)
        if file.size > 10 * 1024 * 1024:
            return Response({
                'error': 'File size exceeds 10MB limit'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Generate unique filename
        file_ext = os.path.splitext(file.name)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"

        # Create uploads directory if it doesn't exist
        os.makedirs(settings.MEDIA_ROOT, exist_ok=True)

        # Save file
        file_path = os.path.join(settings.MEDIA_ROOT, unique_filename)
        with open(file_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        file_url = f"/uploads/{unique_filename}"

        return Response({
            'url': file_url,
            'filename': unique_filename,
            'size': file.size,
            'mimetype': file.content_type
        }, status=status.HTTP_201_CREATED)
