from arrow import now
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission
import uuid
from django.db import models
from django.conf import settings

class CustomUser(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.BigIntegerField(null=True, blank=True)
    is_seller = models.CharField(max_length=45, choices=[('yes', 'yes'), ('no', 'no')])
    failed_attempts = models.IntegerField(default=0)
    last_failed_attempt = models.DateTimeField(null=True, blank=True)
    groups = models.ManyToManyField(
        Group,
        related_name='customuser_set',  # specify a custom related_name
        blank=True
    )
    user_permissions = models.ManyToManyField(
        Permission,
        related_name='customuser_permissions',  # specify a custom related_name
        blank=True
    )


class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='sent_messages', on_delete=models.CASCADE)
    receiver = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='received_messages', on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(max_length=45, default=False)

    def __str__(self):
        return f"{self.content}"

class Profile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    profile = models.ImageField(upload_to='user_profiles', default='default.png')
    province = models.CharField(max_length=100, null=True, blank=True)
    municipality = models.CharField(max_length=100, null=True, blank=True)
    street = models.CharField(max_length=200,  null=True, blank=True)
    postal_code = models.CharField(max_length=20,  null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)

    def is_online(self):
        """ Check if the user was active within the last 1 second """
        if self.last_seen:
            return (now() - self.last_seen).total_seconds() < 300  
            # return (now() - self.last_seen).total_seconds() < 1
        
    def __str__(self):
        return f"{self.user.username} - {self.street if self.street else 'No Address'}"
    
    def profile_image_url(self):
        try: 
            url = self.profile.url
        except:
            url = ''

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def save_profile(sender, instance, **kwargs):
    instance.profile.save()


