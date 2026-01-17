# email_utils.py

from django.core.mail import EmailMessage
from django.conf import settings
import os

def send_email_with_image(user, image_path):
    if image_path and os.path.exists(image_path):
        subject = '⚠️ 3 Failed Login Attempts Detected'
        body = f'Hello {user.first_name} {user.last_name},\n\nSomeone tried to log into your account and failed 3 times. Please see the attached image and reset your password if needed.'

        email_message = EmailMessage(
            subject,
            body,
            settings.EMAIL_HOST_USER, 
            [user.email]  
        )

        email_message.attach_file(image_path)
        email_message.send()

        # os.remove(image_path)
    else:
        print('Image path is invalid or image capture failed.')
