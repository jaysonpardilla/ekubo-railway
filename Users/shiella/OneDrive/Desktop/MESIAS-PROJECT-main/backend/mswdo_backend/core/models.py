from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
import uuid

class UserManager(BaseUserManager):
    def create_user(self, email, username, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        if not username:
            raise ValueError('Username is required')
        
        email = self.normalize_email(email)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, username, password=None, **extra_fields):
        extra_fields.setdefault('user_type', 'admin')
        return self.create_user(email, username, password, **extra_fields)

class User(AbstractBaseUser):
    USER_TYPE_CHOICES = [
        ('beneficiary', 'Beneficiary'),
        ('admin', 'Admin'),
        ('bhw', 'BHW'),
        ('mswdo', 'MSWDO'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=255, unique=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    middle_name = models.CharField(max_length=255, blank=True, null=True)
    address = models.TextField()
    contact_number = models.CharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    objects = UserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        db_table = 'users'
    
    def __str__(self):
        return self.email

class Beneficiary(models.Model):
    CLASSIFICATION_CHOICES = [
        ('senior_citizen', 'Senior Citizen'),
        ('pwd', 'PWD'),
        ('solo_parent', 'Solo Parent'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='beneficiary')
    classification = models.CharField(max_length=50, choices=CLASSIFICATION_CHOICES)
    disability_type = models.CharField(max_length=50, blank=True, null=True)
    latitude = models.FloatField(blank=True, null=True)
    longitude = models.FloatField(blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    pwd_id_number = models.CharField(max_length=255, blank=True, null=True)
    guardian_name = models.CharField(max_length=255, blank=True, null=True)
    guardian_contact = models.CharField(max_length=20, blank=True, null=True)
    guardian_relationship = models.CharField(max_length=255, blank=True, null=True)
    senior_id_url = models.CharField(max_length=1024, blank=True, null=True)
    psa_url = models.CharField(max_length=1024, blank=True, null=True)
    postal_id_url = models.CharField(max_length=1024, blank=True, null=True)
    voters_id_url = models.CharField(max_length=1024, blank=True, null=True)
    national_id_url = models.CharField(max_length=1024, blank=True, null=True)
    medical_cert_url = models.CharField(max_length=1024, blank=True, null=True)
    govt_id_url = models.CharField(max_length=1024, blank=True, null=True)
    pwd_form_url = models.CharField(max_length=1024, blank=True, null=True)
    barangay_cert_url = models.CharField(max_length=1024, blank=True, null=True)
    death_cert_url = models.CharField(max_length=1024, blank=True, null=True)
    medical_records_url = models.CharField(max_length=1024, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'beneficiaries'
    
    def __str__(self):
        return f"{self.user.first_name} {self.user.last_name}"

class BHWAssignment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bhw_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bhw_assignments')
    barangay = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'bhw_assignments'
        unique_together = ('bhw_user', 'barangay')
    
    def __str__(self):
        return f"{self.bhw_user.username} - {self.barangay}"

class Program(models.Model):
    PROGRAM_TYPE_CHOICES = [
        ('cash_assistance', 'Cash Assistance'),
        ('medical', 'Medical'),
        ('educational', 'Educational'),
        ('livelihood', 'Livelihood'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField()
    classification = models.JSONField(default=list)
    requirements = models.JSONField(default=list)
    program_type = models.CharField(max_length=50, choices=PROGRAM_TYPE_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'programs'
    
    def __str__(self):
        return self.name

class Application(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('bhw_verified', 'BHW Verified'),
        ('mswdo_approved', 'MSWDO Approved'),
        ('scheduled', 'Scheduled'),
        ('claimed', 'Claimed'),
        ('denied', 'Denied'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    beneficiary = models.ForeignKey(Beneficiary, on_delete=models.CASCADE, related_name='applications')
    program = models.ForeignKey(Program, on_delete=models.CASCADE, related_name='applications')
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='pending')
    form_data = models.JSONField(default=dict)
    bhw_verified_at = models.DateTimeField(blank=True, null=True)
    bhw_verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_applications')
    bhw_notes = models.TextField(blank=True, null=True)
    mswdo_approved_at = models.DateTimeField(blank=True, null=True)
    mswdo_approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_applications')
    mswdo_notes = models.TextField(blank=True, null=True)
    denial_reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'applications'
    
    def __str__(self):
        return f"{self.beneficiary.user.first_name} - {self.program.name}"

class ApplicationDocument(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=255)
    document_url = models.CharField(max_length=1024)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'application_documents'

class ReleaseSchedule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='release_schedule')
    release_date = models.DateField()
    release_time = models.TimeField(blank=True, null=True)
    venue = models.CharField(max_length=255)
    instructions = models.TextField(blank=True, null=True)
    claimed_at = models.DateTimeField(blank=True, null=True)
    claimed_by_staff = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'release_schedules'

class Notification(models.Model):
    NOTIFICATION_TYPE_CHOICES = [
        ('info', 'Info'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=NOTIFICATION_TYPE_CHOICES, default='info')
    related_application = models.ForeignKey(Application, on_delete=models.SET_NULL, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.user.email}"


class DeceasedReport(models.Model):
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]

    SOURCE_CHOICES = [
        ('family', 'Family'),
        ('hospital', 'Hospital'),
        ('barangay', 'Barangay'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=512)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=20, choices=GENDER_CHOICES, blank=True, null=True)
    nationality = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    beneficiary_name = models.CharField(max_length=512, blank=True, null=True)
    beneficiary_barangay = models.CharField(max_length=255, blank=True, null=True)
    date_time_of_death = models.DateTimeField(blank=True, null=True)
    cause_of_death = models.TextField(blank=True, null=True)
    source_of_information = models.CharField(max_length=50, choices=SOURCE_CHOICES, blank=True, null=True)
    confirmed = models.BooleanField(default=False)
    confirmed_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='confirmed_deceased_reports')
    confirmed_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'deceased_reports'

    def __str__(self):
        return f"{self.full_name} - {self.date_time_of_death or ''}"
