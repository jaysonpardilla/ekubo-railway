from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from mswdo_backend.api.serializers import UserSerializer, UserSignupSerializer, BeneficiarySerializer, ApplicationSerializer, ProgramSerializer, NotificationSerializer, DeceasedReportSerializer
from mswdo_backend.api.serializers import ReleaseScheduleSerializer
from mswdo_backend.core.models import User, Beneficiary, Application, Program, Notification, BHWAssignment, DeceasedReport
from django.conf import settings
from django.utils import timezone
import jwt
from datetime import datetime, timedelta
import bcrypt
import os
import uuid
from django.db.models import Q


def _barangay_matches(assign_barangay: str, address: str) -> bool:
    if not assign_barangay or not address:
        return False
    a = assign_barangay.strip().lower()
    b = address.strip().lower()
    # exact match or one contains the other
    return a == b or a in b or b in a

class HealthCheckView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        return Response({
            'status': 'OK',
            'message': 'MSWDO Backend API is running'
        })

class SignupView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = UserSignupSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                token = self._generate_token(user)
                return Response({
                    'token': token,
                    'user': UserSerializer(user).data
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _generate_token(self, user):
        payload = {
            'userId': str(user.id),
            'userType': user.user_type,
            'exp': datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        
        if not email or not password:
            return Response({'error': 'Email and password required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            if user.check_password(password):
                token = self._generate_token(user)
                user_data = UserSerializer(user).data
                return Response({'token': token, 'user': user_data})
            else:
                return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
    
    def _generate_token(self, user):
        payload = {
            'userId': str(user.id),
            'userType': user.user_type,
            'exp': datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
        }
        return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class UserListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type not in ['admin', 'mswdo']:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def post(self, request):
        # Allow admin to create users
        if request.user.user_type != 'admin':
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)

        data = request.data
        required = ['email', 'password', 'firstName', 'lastName', 'username', 'address', 'userType']
        missing = [f for f in required if not data.get(f)]
        if missing:
            return Response({'error': f'Missing fields: {", ".join(missing)}'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.create_user(
                email=data.get('email'),
                username=data.get('username'),
                password=data.get('password'),
                first_name=data.get('firstName'),
                last_name=data.get('lastName'),
                middle_name=data.get('middleName', ''),
                address=data.get('address'),
                contact_number=data.get('contactNumber', ''),
                date_of_birth=data.get('dateOfBirth') or None,
                user_type=data.get('userType')
            )

            # If creating a BHW, optionally create assignment
            if data.get('userType') == 'bhw' and data.get('barangay'):
                BHWAssignment.objects.create(bhw_user=user, barangay=data.get('barangay'))

            serializer = UserSerializer(user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, user_id):
        if request.user.id != user_id and request.user.user_type not in ['admin', 'mswdo']:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user = User.objects.get(id=user_id)
            serializer = UserSerializer(user)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def patch(self, request, user_id):
        if request.user.id != user_id and request.user.user_type not in ['admin']:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            user = User.objects.get(id=user_id)
            serializer = UserSerializer(user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, user_id):
        # Only admin can delete users
        if request.user.user_type != 'admin':
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)

        try:
            user = User.objects.get(id=user_id)
            user.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

class UserStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type not in ['admin', 'mswdo']:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        stats = {
            'total': User.objects.count(),
            'beneficiaries': User.objects.filter(user_type='beneficiary').count(),
            'bhws': User.objects.filter(user_type='bhw').count(),
            'mswdo': User.objects.filter(user_type='mswdo').count(),
        }
        return Response(stats)

class BeneficiaryListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type not in ['admin', 'mswdo', 'bhw']:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        if request.user.user_type == 'bhw':
            # return beneficiaries whose address matches this BHW user's address
            all_bens = Beneficiary.objects.select_related('user').all()
            matched = []
            bhw_addr = request.user.address or ''
            for ben in all_bens:
                addr = ben.user.address or ''
                if _barangay_matches(bhw_addr, addr):
                    matched.append(ben)
            beneficiaries = matched
        else:
            beneficiaries = Beneficiary.objects.all()
        
        serializer = BeneficiarySerializer(beneficiaries, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        beneficiary_data = {
            'user': request.user.id,
            **request.data
        }
        serializer = BeneficiarySerializer(data=beneficiary_data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class BeneficiaryDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, beneficiary_id):
        try:
            beneficiary = Beneficiary.objects.get(id=beneficiary_id)
            
            if (request.user.id != beneficiary.user.id and 
                request.user.user_type not in ['admin', 'mswdo']):
                if request.user.user_type == 'bhw':
                    # match permission by comparing BHW user's address to beneficiary address
                    assignment = _barangay_matches(request.user.address or '', beneficiary.user.address or '')
                    if not assignment:
                        return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
                else:
                    return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
            
            serializer = BeneficiarySerializer(beneficiary)
            return Response(serializer.data)
        except Beneficiary.DoesNotExist:
            return Response({'error': 'Beneficiary not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def patch(self, request, beneficiary_id):
        try:
            beneficiary = Beneficiary.objects.get(id=beneficiary_id)
            
            if (request.user.id != beneficiary.user.id and 
                request.user.user_type not in ['admin', 'mswdo']):
                return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
            
            serializer = BeneficiarySerializer(beneficiary, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Beneficiary.DoesNotExist:
            return Response({'error': 'Beneficiary not found'}, status=status.HTTP_404_NOT_FOUND)

class ApplicationListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type == 'beneficiary':
            try:
                beneficiary = Beneficiary.objects.get(user=request.user)
                applications = Application.objects.filter(beneficiary=beneficiary)
            except Beneficiary.DoesNotExist:
                return Response([])
        elif request.user.user_type == 'bhw':
            # match applications where beneficiary address matches this BHW user's address
            all_apps = Application.objects.select_related('beneficiary__user', 'program').all()
            matched = []
            bhw_addr = request.user.address or ''
            for app in all_apps:
                addr = app.beneficiary.user.address or ''
                if _barangay_matches(bhw_addr, addr):
                    matched.append(app)
            applications = matched
        else:
            applications = Application.objects.all()
        
        serializer = ApplicationSerializer(applications, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        try:
            beneficiary = Beneficiary.objects.get(user=request.user)
            program_id = request.data.get('programId')
            form_data = request.data.get('formData', {})
            
            if not program_id:
                return Response({'error': 'Program ID is required'}, status=status.HTTP_400_BAD_REQUEST)
            
            program = Program.objects.get(id=program_id)
            
            application = Application.objects.create(
                beneficiary=beneficiary,
                program=program,
                form_data=form_data
            )
            serializer = ApplicationSerializer(application)
            # Create notifications for assigned BHW(s) and MSWDO staff
            try:
                beneficiary_name = f"{beneficiary.user.first_name} {beneficiary.user.last_name}"
                submitted_msg = f"A new beneficiary application has been submitted for {program.name}. Please verify the documents."

                # Notify BHW users whose own address matches the beneficiary address
                bhw_users = User.objects.filter(user_type='bhw')
                for bhw in bhw_users:
                    if _barangay_matches(bhw.address or '', beneficiary.user.address or ''):
                        Notification.objects.create(
                            user=bhw,
                            title='New Application Submitted',
                            message=f"{beneficiary_name} submitted an application for {program.name} on {application.created_at.strftime('%Y-%m-%d')}",
                            type='info',
                            related_application=application
                        )

                # Notify all MSWDO staff
                mswdo_users = User.objects.filter(user_type='mswdo')
                for mu in mswdo_users:
                    Notification.objects.create(
                        user=mu,
                        title='New Application Submitted',
                        message=f"{beneficiary_name} submitted an application for {program.name} on {application.created_at.strftime('%Y-%m-%d')}.",
                        type='info',
                        related_application=application
                    )
            except Exception:
                # non-fatal: continue even if notifications fail
                pass

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Beneficiary.DoesNotExist:
            return Response({'error': 'Beneficiary profile not found'}, status=status.HTTP_400_BAD_REQUEST)
        except Program.DoesNotExist:
            return Response({'error': 'Program not found'}, status=status.HTTP_404_NOT_FOUND)

class ApplicationDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, application_id):
        try:
            application = Application.objects.get(id=application_id)
            serializer = ApplicationSerializer(application)
            return Response(serializer.data)
        except Application.DoesNotExist:
            return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def patch(self, request, application_id):
        try:
            application = Application.objects.get(id=application_id)
            status_update = request.data.get('status')
            bhw_notes = request.data.get('bhwNotes')
            mswdo_notes = request.data.get('mswdoNotes')
            denial_reason = request.data.get('denialReason')
            
            if status_update:
                application.status = status_update
                
                if status_update == 'bhw_verified' and request.user.user_type == 'bhw':
                    application.bhw_verified_at = timezone.now()
                    application.bhw_verified_by = request.user

                    # Notify MSWDO staff that the application is ready for review (always notify all MSWDO users)
                    try:
                        beneficiary = application.beneficiary
                        beneficiary_name = f"{beneficiary.user.first_name} {beneficiary.user.last_name}"
                        program_name = application.program.name
                        mswdo_users = User.objects.filter(user_type='mswdo')
                        for mu in mswdo_users:
                            Notification.objects.create(
                                user=mu,
                                title='Application Verified by BHW',
                                message=f"BHW has completed verification for {beneficiary_name}'s application for {program_name}. Ready for your review.",
                                type='info',
                                related_application=application
                            )

                        # Notify beneficiary about verification
                        Notification.objects.create(
                            user=beneficiary.user,
                            title='Application Verified',
                            message=f"Your application for {program_name} has been verified by the BHW and is awaiting MSWDO approval.",
                            type='info',
                            related_application=application
                        )
                    except Exception:
                        pass
                
                if status_update == 'mswdo_approved' and request.user.user_type == 'mswdo':
                    application.mswdo_approved_at = timezone.now()
                    application.mswdo_approved_by = request.user

                    # Notify BHW (if any) and beneficiary that the application was approved by MSWDO
                    try:
                        beneficiary = application.beneficiary
                        program_name = application.program.name
                        # Notify beneficiary
                        Notification.objects.create(
                            user=beneficiary.user,
                            title='Application Approved',
                            message=f"Your application for {program_name} has been approved by MSWDO.",
                            type='success',
                            related_application=application
                        )

                        # Notify the verifying BHW if available
                        if application.bhw_verified_by:
                            try:
                                Notification.objects.create(
                                    user=application.bhw_verified_by,
                                    title='Application Approved by MSWDO',
                                    message=f"The application for {beneficiary.user.first_name} {beneficiary.user.last_name} has been approved by MSWDO.",
                                    type='info',
                                    related_application=application
                                )
                            except Exception:
                                pass
                    except Exception:
                        pass
            
            if bhw_notes is not None and request.user.user_type == 'bhw':
                application.bhw_notes = bhw_notes
            
            if mswdo_notes is not None and request.user.user_type in ['mswdo', 'admin']:
                application.mswdo_notes = mswdo_notes
            
            if denial_reason is not None:
                application.denial_reason = denial_reason
            
            application.save()
            serializer = ApplicationSerializer(application)
            return Response(serializer.data)
        except Application.DoesNotExist:
            return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

class ApplicationStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type not in ['admin', 'mswdo']:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        stats = {
            'pending': Application.objects.filter(status='pending').count(),
            'verified': Application.objects.filter(status='bhw_verified').count(),
            'approved': Application.objects.filter(status='mswdo_approved').count(),
            'scheduled': Application.objects.filter(status='scheduled').count(),
            'claimed': Application.objects.filter(status='claimed').count(),
        }
        return Response(stats)


class ReleaseScheduleCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, application_id):
        # Only MSWDO users can create a release schedule
        if request.user.user_type not in ['mswdo', 'admin']:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)

        try:
            application = Application.objects.get(id=application_id)
            # prevent duplicate schedule
            if hasattr(application, 'release_schedule') and application.release_schedule is not None:
                return Response({'error': 'Release schedule already exists for this application'}, status=status.HTTP_400_BAD_REQUEST)

            data = request.data or {}
            # expect release_date, release_time, venue, instructions
            serializer = ReleaseScheduleSerializer(data={
                'application': str(application.id),
                'release_date': data.get('release_date'),
                'release_time': data.get('release_time'),
                'venue': data.get('venue'),
                'instructions': data.get('instructions', '')
            })

            if serializer.is_valid():
                schedule = serializer.save()
                # mark application as scheduled
                application.status = 'scheduled'
                application.save()

                # notify beneficiary and bhw
                try:
                    beneficiary = application.beneficiary
                    Notification.objects.create(
                        user=beneficiary.user,
                        title='Release Scheduled',
                        message=f"A release has been scheduled for your application for {application.program.name} on {schedule.release_date}.",
                        type='info',
                        related_application=application
                    )
                    if application.bhw_verified_by:
                        Notification.objects.create(
                            user=application.bhw_verified_by,
                            title='Release Scheduled',
                            message=f"A release has been scheduled for {beneficiary.user.first_name} {beneficiary.user.last_name}'s application.",
                            type='info',
                            related_application=application
                        )
                except Exception:
                    pass

                return Response(ReleaseScheduleSerializer(schedule).data, status=status.HTTP_201_CREATED)

            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Application.DoesNotExist:
            return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)


class ReleaseScheduleClaimView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, application_id):
        # Only MSWDO users can mark a release as claimed
        if request.user.user_type not in ['mswdo', 'admin']:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)

        try:
            application = Application.objects.get(id=application_id)
            schedule = getattr(application, 'release_schedule', None)
            if not schedule:
                return Response({'error': 'No release schedule found for this application'}, status=status.HTTP_400_BAD_REQUEST)

            if schedule.claimed_at:
                return Response({'error': 'Release schedule already claimed'}, status=status.HTTP_400_BAD_REQUEST)

            schedule.claimed_at = timezone.now()
            schedule.claimed_by_staff = request.user
            notes = request.data.get('notes')
            if notes is not None:
                schedule.notes = notes
            schedule.save()

            application.status = 'claimed'
            application.save()

            # notify beneficiary and bhw
            try:
                beneficiary = application.beneficiary
                Notification.objects.create(
                    user=beneficiary.user,
                    title='Benefit Claimed',
                    message=f"Your benefit for {application.program.name} has been marked as claimed on {schedule.claimed_at.strftime('%Y-%m-%d')}",
                    type='success',
                    related_application=application
                )

                if application.bhw_verified_by:
                    Notification.objects.create(
                        user=application.bhw_verified_by,
                        title='Benefit Claimed',
                        message=f"{beneficiary.user.first_name} {beneficiary.user.last_name} has claimed their {application.program.name} benefit.",
                        type='success',
                        related_application=application
                    )
            except Exception:
                pass

            return Response(ReleaseScheduleSerializer(schedule).data)
        except Application.DoesNotExist:
            return Response({'error': 'Application not found'}, status=status.HTTP_404_NOT_FOUND)

class ProgramListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type in ['admin', 'mswdo']:
            programs = Program.objects.all()
        else:
            programs = Program.objects.filter(is_active=True)
        
        serializer = ProgramSerializer(programs, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        if request.user.user_type not in ['admin', 'mswdo']:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = ProgramSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ProgramDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, program_id):
        try:
            program = Program.objects.get(id=program_id)
            serializer = ProgramSerializer(program)
            return Response(serializer.data)
        except Program.DoesNotExist:
            return Response({'error': 'Program not found'}, status=status.HTTP_404_NOT_FOUND)
    
    def patch(self, request, program_id):
        if request.user.user_type not in ['admin', 'mswdo']:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            program = Program.objects.get(id=program_id)
            serializer = ProgramSerializer(program, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Program.DoesNotExist:
            return Response({'error': 'Program not found'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, program_id):
        if request.user.user_type not in ['admin', 'mswdo']:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)

        try:
            program = Program.objects.get(id=program_id)
            program.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Program.DoesNotExist:
            return Response({'error': 'Program not found'}, status=status.HTTP_404_NOT_FOUND)

class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        notifications = Notification.objects.filter(user=request.user).order_by('-created_at')
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        serializer = NotificationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, notification_id):
        try:
            notification = Notification.objects.get(id=notification_id)
            
            if notification.user != request.user:
                return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
            
            notification.is_read = True
            notification.save()
            
            serializer = NotificationSerializer(notification)
            return Response(serializer.data)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)

class NotificationDetailView(APIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, notification_id):
        try:
            notification = Notification.objects.get(id=notification_id)
            
            if notification.user != request.user:
                return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
            
            notification.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Notification.DoesNotExist:
            return Response({'error': 'Notification not found'}, status=status.HTTP_404_NOT_FOUND)


class DeceasedReportListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.user_type not in ['admin', 'mswdo', 'bhw']:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        reports = DeceasedReport.objects.all().order_by('-created_at')
        serializer = DeceasedReportSerializer(reports, many=True)
        return Response(serializer.data)

    def post(self, request):
        if request.user.user_type not in ['admin', 'mswdo', 'bhw']:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
        serializer = DeceasedReportSerializer(data=request.data)
        if serializer.is_valid():
            report = serializer.save()
            # create notifications for MSWDO users
            try:
                mswdo_users = User.objects.filter(user_type='mswdo')
                for u in mswdo_users:
                    Notification.objects.create(
                        user=u,
                        title='New Deceased Report',
                        message=f'New deceased report submitted: {report.full_name}',
                        type='info'
                    )
            except Exception as exc:
                # don't fail creation if notification creation fails
                print('Failed to create MSWDO notifications:', exc)

            return Response(DeceasedReportSerializer(report).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class DeceasedReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, report_id):
        try:
            rpt = DeceasedReport.objects.get(id=report_id)
            serializer = DeceasedReportSerializer(rpt)
            return Response(serializer.data)
        except DeceasedReport.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, report_id):
        try:
            rpt = DeceasedReport.objects.get(id=report_id)
            if request.user.user_type not in ['admin', 'mswdo']:
                return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)
            rpt.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except DeceasedReport.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    def patch(self, request, report_id):
        """Support confirming a report. When MSWDO confirms, remove all applications for matched beneficiary."""
        try:
            rpt = DeceasedReport.objects.get(id=report_id)
        except DeceasedReport.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

        if request.user.user_type not in ['admin', 'mswdo']:
            return Response({'error': 'Insufficient permissions'}, status=status.HTTP_403_FORBIDDEN)

        # allow setting confirmed=True via patch
        confirmed_flag = request.data.get('confirmed', None)
        if confirmed_flag:
            from django.utils import timezone
            # attempt to find beneficiary by name or barangay
            beneficiaries = []
            if rpt.beneficiary_name:
                parts = rpt.beneficiary_name.split()
                if len(parts) >= 2:
                    first = parts[0]
                    last = parts[-1]
                    beneficiaries = list(Beneficiary.objects.filter(user__first_name__icontains=first, user__last_name__icontains=last))
                else:
                    beneficiaries = list(Beneficiary.objects.filter(user__first_name__icontains=rpt.beneficiary_name) | Beneficiary.objects.filter(user__last_name__icontains=rpt.beneficiary_name))

            if not beneficiaries and rpt.beneficiary_barangay:
                beneficiaries = list(Beneficiary.objects.filter(user__address__icontains=rpt.beneficiary_barangay))

            # delete applications for matched beneficiaries
            deleted_count = 0
            try:
                for b in beneficiaries:
                    apps = Application.objects.filter(beneficiary=b)
                    deleted_count += apps.count()
                    apps.delete()
            except Exception as exc:
                print('Failed to delete applications for beneficiary:', exc)

            rpt.confirmed = True
            rpt.confirmed_by = request.user
            rpt.confirmed_at = timezone.now()
            rpt.save()

            # create notification for admin/bhw? create a notification for the beneficiary user if exists
            try:
                for b in beneficiaries:
                    Notification.objects.create(
                        user=b.user,
                        title='Deceased Report Confirmed',
                        message=f'Deceased report for {rpt.full_name} has been confirmed by MSWDO. {deleted_count} related application(s) removed if any.',
                        type='info'
                    )
            except Exception as exc:
                print('Failed to create beneficiary notification:', exc)

            return Response({'status': 'confirmed', 'deleted_applications': deleted_count})

        return Response({'error': 'No action performed'}, status=status.HTTP_400_BAD_REQUEST)

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
