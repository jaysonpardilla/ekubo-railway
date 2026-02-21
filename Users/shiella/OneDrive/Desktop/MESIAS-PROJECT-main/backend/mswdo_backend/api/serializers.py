from rest_framework import serializers
from mswdo_backend.core.models import User, Beneficiary, BHWAssignment, Program, Application, ApplicationDocument, ReleaseSchedule, Notification, DeceasedReport
import bcrypt

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'middle_name', 'username', 'address', 'contact_number', 'date_of_birth', 'user_type', 'created_at']
        read_only_fields = ['id', 'created_at']

class UserSignupSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    firstName = serializers.CharField(required=True)
    lastName = serializers.CharField(required=True)
    middleName = serializers.CharField(required=False, allow_blank=True)
    username = serializers.CharField(required=True)
    address = serializers.CharField(required=True)
    contactNumber = serializers.CharField(required=False, allow_blank=True)
    dateOfBirth = serializers.CharField(required=False, allow_blank=True)
    userType = serializers.CharField(required=True)
    # Beneficiary fields
    classification = serializers.CharField(required=False, allow_blank=True)
    latitude = serializers.FloatField(required=False)
    longitude = serializers.FloatField(required=False)
    disabilityType = serializers.CharField(required=False, allow_blank=True)
    
    def create(self, validated_data):
        # Convert camelCase to snake_case for model
        user_data = {
            'email': validated_data.get('email'),
            'password': validated_data.get('password'),
            'first_name': validated_data.get('firstName'),
            'last_name': validated_data.get('lastName'),
            'middle_name': validated_data.get('middleName', ''),
            'username': validated_data.get('username'),
            'address': validated_data.get('address'),
            'contact_number': validated_data.get('contactNumber', ''),
            'date_of_birth': validated_data.get('dateOfBirth') or None,
            'user_type': validated_data.get('userType'),
        }
        user = User.objects.create_user(**user_data)
        
        # If user_type is beneficiary, create Beneficiary record
        if validated_data.get('userType') == 'beneficiary' and validated_data.get('classification'):
            Beneficiary.objects.create(
                user=user,
                classification=validated_data.get('classification'),
                latitude=validated_data.get('latitude') or None,
                longitude=validated_data.get('longitude') or None,
                disability_type=validated_data.get('disabilityType') or None,
                status='pending'
            )
        
        return user

class BeneficiarySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    middle_name = serializers.CharField(source='user.middle_name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    address = serializers.CharField(source='user.address', read_only=True)
    contact_number = serializers.CharField(source='user.contact_number', read_only=True)
    
    class Meta:
        model = Beneficiary
        fields = ['id', 'user', 'first_name', 'last_name', 'middle_name', 'email', 'address', 'contact_number', 'classification', 'latitude', 'longitude', 'date_of_birth', 'pwd_id_number', 'guardian_name', 'guardian_contact', 'guardian_relationship', 'senior_id_url', 'psa_url', 'postal_id_url', 'voters_id_url', 'national_id_url', 'medical_cert_url', 'govt_id_url', 'pwd_form_url', 'barangay_cert_url', 'death_cert_url', 'medical_records_url', 'status', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']

class BHWAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BHWAssignment
        fields = ['id', 'bhw_user', 'barangay', 'created_at']
        read_only_fields = ['id', 'created_at']

class ProgramSerializer(serializers.ModelSerializer):
    class Meta:
        model = Program
        fields = ['id', 'name', 'description', 'classification', 'requirements', 'program_type', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

class ApplicationDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationDocument
        fields = ['id', 'application', 'document_type', 'document_url', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

class ApplicationSerializer(serializers.ModelSerializer):
    program_name = serializers.CharField(source='program.name', read_only=True)
    beneficiary_user_id = serializers.CharField(source='beneficiary.user.id', read_only=True)
    first_name = serializers.CharField(source='beneficiary.user.first_name', read_only=True)
    last_name = serializers.CharField(source='beneficiary.user.last_name', read_only=True)
    beneficiary_address = serializers.CharField(source='beneficiary.user.address', read_only=True)
    documents = ApplicationDocumentSerializer(source='applicationdocument_set', many=True, read_only=True)
    
    class Meta:
        model = Application
        fields = ['id', 'beneficiary', 'program', 'program_name', 'beneficiary_user_id', 'first_name', 'last_name', 'beneficiary_address', 'status', 'form_data', 'documents', 'bhw_verified_at', 'bhw_verified_by', 'bhw_notes', 'mswdo_approved_at', 'mswdo_approved_by', 'mswdo_notes', 'denial_reason', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class ReleaseScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReleaseSchedule
        fields = ['id', 'application', 'release_date', 'release_time', 'venue', 'instructions', 'claimed_at', 'claimed_by_staff', 'notes', 'created_at']
        read_only_fields = ['id', 'created_at']

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'title', 'message', 'type', 'related_application', 'is_read', 'created_at']
        read_only_fields = ['id', 'created_at']


class DeceasedReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeceasedReport
        fields = ['id', 'full_name', 'date_of_birth', 'gender', 'nationality', 'email', 'phone_number', 'address', 'beneficiary_name', 'beneficiary_barangay', 'date_time_of_death', 'cause_of_death', 'source_of_information', 'confirmed', 'confirmed_by', 'confirmed_at', 'created_at']
        read_only_fields = ['id', 'created_at', 'confirmed_by', 'confirmed_at']
