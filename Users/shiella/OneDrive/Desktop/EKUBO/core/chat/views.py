from django.shortcuts import render, get_object_or_404, redirect
from .models import Message, Profile
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from random import choice
from .forms import DeliveryAddressForm, EditProfileForm, UpdateUser
from django.contrib.auth.models import auth
from django.urls import reverse
from products.models import Product,Notification, Business, Wishlist
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from products.models import Order
from products.models import Category, Product, Business, Wishlist, Review
import random
from django.db.models import Max, Q
from django.core.paginator import Paginator
import requests
from .capture_image import capture_image
from .email_utils import send_email_with_image
from django.utils.timezone import now
from .forms import VerifyUserForm, SetNewPasswordForm
from uuid import UUID
from products.recommendation import knn_recommend_products
from django.db.models import Q, Max
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Message, CustomUser as User 
import random
User = get_user_model()


def signup(request):
    if request.method == 'POST':
        first_name = request.POST.get('first_name')
        last_name = request.POST.get('last_name')
        email = request.POST.get('email')
        password = request.POST.get('password')
        confirm_password = request.POST.get('confirm_password')
        recaptcha_response = request.POST.get("g-recaptcha-response")

        data = {
            "secret": "6LfndgYrAAAAAKfMxiRbV0BI0pqvEHHkqyWRYRKO",
            "response": recaptcha_response
        }
        google_url = "https://www.google.com/recaptcha/api/siteverify"
        response = requests.post(google_url, data=data)
        result = response.json()

        if not result.get("success"):
            messages.error(request, "reCAPTCHA verification failed. Please try again.")
            return redirect(reverse("chat:signup"))
        
        if password != confirm_password:
            messages.error(request, "Passwords do not match.")
            return redirect(reverse('chat:signup'))

        if User.objects.filter(email=email).exists():
            messages.error(request, "Email already exists.")
            return redirect(reverse('chat:signup'))
        
        if len(password) < 8:
            messages.info(request, "Password must contain at least 8 characters.")
            return redirect(reverse('chat:signup'))
        
        user = User.objects.create_user(
            username=email,
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=password,
        )
        user.save()
        messages.success(request, "Account created successfully. Please log in.")
        return redirect(reverse('chat:login'))
    
    return render(request, 'chat/temp-signup.html')

FAILED_ATTEMPTS = {}
def login_view(request):
    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')
        user = authenticate(request, username=email, password=password)
        
        if user is not None:
            login(request, user)
            user.failed_attempts = 1
            user.last_failed_attempt = None
            user.save()

            if Business.objects.filter(user=user).exists():
                messages.success(request, 'Welcome back! ' + str(user.first_name))
                return redirect(reverse('manage_business:home'))
            else:
                messages.success(request, 'Welcome back! ' + str(user.first_name))
                return redirect(reverse('chat:home'))
        else:
            try:
                user = User.objects.get(email=email)
                user.failed_attempts += 1
                user.last_failed_attempt = now()

                if user.failed_attempts >=3 :
                    image_path = capture_image()
                    send_email_with_image(user, image_path)
                    user.failed_attempts = 0 
                    messages.warning(request, "Too many failed attempts.")
                user.save()
            except User.DoesNotExist:
                messages.error(request, "Invalid email or password.")
                return redirect(reverse('chat:login'))
            messages.error(request, "Invalid email or password.")
            return redirect(reverse('chat:login'))
    return render(request, 'chat/temp_login.html')

def landingPage(request):
    products = Product.objects.order_by('?')
    categories = Category.objects.order_by('?')
    query = request.GET.get('q', '')
    results = Product.objects.filter(product_name__icontains=query) if query else []
    new_arrivals = Product.objects.all().order_by("-created_at")[:5]
    
    context = {
        'query':query,
        'products':products,
        'results':results,
        'categories':categories,
        'new_arrivals':new_arrivals
    }
    return render(request, 'chat/landing_page.html', context)

@login_required(login_url='/login/')
def home(request):
    wishlist_items = Wishlist.objects.filter(user=request.user).aggregate()
    products = Product.objects.all()
    users_with_business = User.objects.filter(business__isnull=False)
    unread_notifications = Notification.objects.filter(user=request.user, is_read=False).count()
    categories = Category.objects.all()
    query = request.GET.get('q', '')
    reviews = Review.objects.all().order_by('-created_at')[:3]
    results = Product.objects.filter(product_name__icontains=query) if query else []
    new_arrivals = Product.objects.all().order_by("-created_at")[:5]
    recommended_products = knn_recommend_products(request.user, k=15)

    context = {
        'query': query,
        'products': products,
        'has_business': users_with_business,
        'results': results,
        'unread_notifications': unread_notifications,
        'categories': categories,
        'new_arrivals': new_arrivals,
        'reviews': reviews,
        'recommended_products': recommended_products
    }
    return render(request, 'chat/home.html', context)

@login_required(login_url='/login/')
def error_page(request):
    return render(request, 'chat/404error.html')

@login_required(login_url='/login/')
def conversation(request, chat_id=None):
    """
    Handles the chat conversation view.

    This view fetches all users the current user has chatted with, orders them
    by the time of the latest message, and displays the conversation with a
    specific chat partner.
    """
    # Get all users the current user has a conversation with
    users = User.objects.filter(
        Q(received_messages__sender=request.user) | Q(sent_messages__receiver=request.user)
    ).distinct()

    # Annotate with the latest message time for sorting
    users = users.annotate(
        latest_message_time=Max(
            'received_messages__timestamp',
            filter=Q(received_messages__sender=request.user) | Q(sent_messages__receiver=request.user)
        )
    ).order_by('-latest_message_time')

    # Handle search query for users
    search_query = request.GET.get('search_user')
    if search_query:
        users = users.filter(first_name__icontains=search_query)

    current_user = None
    if chat_id:
        # Get the specific chat partner from the URL
        current_user = get_object_or_404(User, id=chat_id)
    elif users.exists():
        # If no chat ID is specified, default to the user with the most recent message
        current_user = users.first()

    messages = []
    last_messages = {}

    if current_user:
        # Handle new message submission via POST request
        if request.method == 'POST':
            content = request.POST.get('content')
            if content:
                # Create the new message
                Message.objects.create(sender=request.user, receiver=current_user, content=content)

                # Check if the recipient is offline and send an auto-reply
                if not current_user.profile.is_online():
                    auto_message = "Hello! I'm currently offline. I'll get back to you soon."
                    Message.objects.create(sender=current_user, receiver=request.user, content=auto_message)

        # Get all messages between the two users
        messages = Message.objects.filter(
            Q(sender=request.user, receiver=current_user) | Q(sender=current_user, receiver=request.user)
        ).order_by('timestamp')

    # Get the last message for each user in the sidebar
    for user in users:
        last_message = Message.objects.filter(
            Q(sender=request.user, receiver=user) | Q(sender=user, receiver=request.user)
        ).order_by('-timestamp').first()
        last_messages[user.id] = last_message

    context = {
        'users': users,
        'current_user': current_user,
        'messages': messages,
        'last_message': last_messages,
    }
    return render(request, 'chat/conversation.html', context)

@login_required(login_url='/login/')
def get_unread_messages_count(request):
    unread_count = Message.objects.filter(receiver=request.user, is_read=False).count()
    return JsonResponse({"count": unread_count})

@login_required(login_url='/login/')
def mark_messages_read(request):
    Message.objects.filter(receiver=request.user, is_read=False).update(is_read=True)
    return JsonResponse({"status": "success"})

@login_required(login_url='/login/')
def edit_address(request):
    profile, created = Profile.objects.get_or_create(user=request.user)
    form = DeliveryAddressForm()
    if request.method == 'POST':
        form = DeliveryAddressForm(request.POST, request.FILES, instance=profile)
        if form.is_valid():
            form.save()
            return redirect(reverse('chat:profile_detail'))
    else:
        form = DeliveryAddressForm(instance=profile)
    return render(request, 'chat/edit_address.html', {'form': form})

@login_required(login_url='/login/')
def edit_profile(request):
    profile, created = Profile.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        form = EditProfileForm(request.POST, request.FILES, instance=profile)
        if form.is_valid():
            form.save()
            return redirect(reverse('chat:profile_detail'))
    else:
        form = EditProfileForm(instance=profile)
    return render(request, 'chat/edit_profile.html', {'form': form})

@login_required(login_url='/login/')
def profile_detail(request):
    business = Business.objects.all()
    user = request.user
    profile = get_object_or_404(Profile, user=request.user)
    
    # Check if user is a customer (not a seller)
    is_customer = not user.is_seller
    
    # Only fetch wishlist and order history if user is a customer
    if is_customer:
        wishlist_items = Wishlist.objects.filter(user=request.user).select_related('product')
        order_history = Order.objects.filter(buyer=user)
    else:
        wishlist_items = []
        order_history = []
    
    unread_notifications = Notification.objects.filter(user=request.user, is_read=False).order_by('-created_at')
    read_notifications = Notification.objects.filter(user=request.user, is_read=True).order_by('-created_at')
    unread_notifications.update(is_read=True)

    # Pagination for notifications
    paginator = Paginator(read_notifications, 10)  # 10 notifications per page
    page_number = request.GET.get('page')
    notifications_page = paginator.get_page(page_number)

    context = { 
        'profile': profile,
        'user': user,
        'wishlist': wishlist_items,
        'order_history': order_history,
        "unread_notifications": unread_notifications,
        "read_notifications": notifications_page,
        "notifications_paginator": paginator,
        "is_customer": is_customer,
    }
    return render(request, 'chat/profile_detail.html', context)

@login_required(login_url='/login/')
def help(request):
    return render(request, 'chat/help.html')

@login_required(login_url='/login/')
def update_user(request, id):
    instance = get_object_or_404(User, pk=id)
    if request.method == 'POST':
        form = UpdateUser(request.POST, instance=instance)
        if form.is_valid():
            form.save()
            messages.info(request, 'successfully updated' )
            return redirect(reverse('chat:profile_detail'))
    else:
        form = UpdateUser(instance=instance)

    context = {'form':form}
    return render(request, 'chat/update-user.html', context)

@login_required(login_url='/login/')
def mark_notifications_read(request):
    if request.method == "POST":
        notifications = Notification.objects.filter(user=request.user, is_read=False).order_by('-created_at')
        notifications_list = list(notifications.values("id", "message", "created_at"))
        notifications.update(is_read=True)

        return JsonResponse({"message": "Notifications marked as read", "notifications": notifications_list})
    return JsonResponse({"error": "Invalid request"}, status=400)

@login_required(login_url='/login/')
def get_notifications(request):
    notifications = Notification.objects.filter(user=request.user, is_read=False)
    return JsonResponse({"count": notifications.count()})

@login_required(login_url='/login/')
def buyer_notification(request):
    unread_notifications = Notification.objects.filter(user=request.user, is_read=False).order_by('-created_at')
    read_notifications = Notification.objects.filter(user=request.user, is_read=True).order_by('-created_at')
    
    unread_notifications.update(is_read=True)
    return render(request, "chat/buyer_notification.html", {
        "unread_notifications": unread_notifications,
        "read_notifications": read_notifications
    })

@login_required(login_url='/login/')
def verify_user(request):
    if request.method == 'POST':
        form = VerifyUserForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data['email']
            password = form.cleaned_data['password']
            user = authenticate(request, username=email, password=password)
            if user:
                request.session['verified_user_id'] = str(user.id)
                return redirect(reverse('chat:set_new_password'))
            else:
                form.add_error(None, "Invalid email or password")
    else:
        form = VerifyUserForm()
    return render(request, 'chat/verify_user.html', {'form': form})

@login_required(login_url='/login/')
def set_new_password(request):
    user_id = request.session.get('verified_user_id')
    if not user_id:
        return redirect('verify_user')

    user = User.objects.get(id=UUID(user_id))

    if request.method == 'POST':
        form = SetNewPasswordForm(request.POST)
        if form.is_valid():
            new_password = form.cleaned_data['new_password']
            user.set_password(new_password)
            user.save()
            del request.session['verified_user_id']
            messages.success(request, 'password successfully updated')
            return redirect(reverse('chat:login'))  
    else:
        form = SetNewPasswordForm()
    return render(request, 'chat/set_new_password.html', {'form': form})

