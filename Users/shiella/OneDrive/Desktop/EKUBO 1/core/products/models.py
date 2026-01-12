from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
import uuid
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
import uuid
from django.utils import timezone
from django.db.models import Sum



class Business(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    business_name = models.CharField(max_length=255)
    business_description = models.CharField(max_length=255)
    business_contact_number = models.CharField(max_length=255, blank=True)
    business_address = models.CharField(max_length=255, blank=True)
    business_image = models.ImageField(upload_to='business_image/', default='default_business_image.png')
    business_logo = models.ImageField(upload_to='business_logo/', default='default_business_logo.png')
    business_created = models.DateTimeField(auto_now_add=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)

    @property
    def business_image_url(self):
        try:
            url = self.business_image.url
        except:
            url = ''
        return url

    @property
    def business_logo_url(self):
        try:
            url = self.business_logo.url
        except:
            url = ''
        return url

    def __str__(self):
        return self.business_name

class Order(models.Model):
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True)
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    order_quantity = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=[
        ("Pending", "Pending"),
        ("Accepted", "Accepted"),
        ("Rejected", "Rejected")
    ], default="Pending")
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order by {self.buyer} - Status: {self.status}"

class Notification(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='notifications')
    message = models.TextField()
    quantity = models.IntegerField(default=1)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    class Meta:
        ordering = ['created_at']

class Wishlist(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('user', 'product')  # To prevent duplicate entries

class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    image = models.ImageField(upload_to='product_category/', blank=False, default='default_category/')

    def __str__(self):
        return self.name
    
    def category_image_url(self):
        try:
            url = self.image.url
        except:
            url = ''
        return url

# Modify the Product Model to Add Method for Sales Reporting
class Product(models.Model):
    MEASUREMENT_CHOICES = [
        ('Kilo', 'Per Kilo'),
        ('Gram', 'Per Gram'),
        ('Kiece', 'Per Piece'),
        ('Pack', 'Per Pack'),
        ('Liter', 'Per Liter')
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    seller = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='products')
    product_category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')  # Category field added
    product_name = models.CharField(max_length=255)
    product_measurement = models.CharField(
        max_length=10,
        choices=MEASUREMENT_CHOICES,
        default='Per Kilo'
    )
    product_description = models.TextField()
    product_price = models.DecimalField(max_digits=10, decimal_places=2)
    product_stock = models.PositiveIntegerField()
    product_image = models.ImageField(upload_to='product_images/', blank=False, default='default_product.png')
    product_image1 = models.ImageField(upload_to='product_images/', blank=False, default='default_product.png', null=True)
    product_image2 = models.ImageField(upload_to='product_images/', blank=False, default='default_product.png', null=True)
    product_image3 = models.ImageField(upload_to='product_images/', blank=False, default='default_product.png', null=True)
    product_image4 = models.ImageField(upload_to='product_images/', blank=False, default='default_product.png', null=True)
    created_at = models.DateTimeField(default=timezone.now)


    @property
    def average_rating(self):
        reviews = self.reviews.all()
        if reviews:
            return sum(review.rating for review in reviews) / len(reviews)
        return 0  # If no reviews exist, return 0
    

    def product_image_url(self):
        try:
            url = self.product_image.url
        except:
            url = ''
        return url
    
    def product1_image_url(self):
        try:
            url = self.product_image1.url
        except:
            url = ''
        return url
    def product2_image_url(self):
        try:
            url = self.product_image2.url
        except:
            url = ''
        return url
    def product3_image_url(self):
        try:
            url = self.product_image3.url
        except:
            url = ''
        return url
    def product4_image_url(self):
        try:
            url = self.product_image4.url
        except:
            url = ''
        return url

    def __str__(self):
        return self.product_name



class Review(models.Model):
    product = models.ForeignKey(Product, related_name='reviews', on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating = models.PositiveIntegerField(choices=[(i, i) for i in range(1, 6)]) 
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    # class Meta:
    #     unique_together = ('product', 'user')  

    def __str__(self):
        return f'Review by {self.user.username} for {self.product.product_name}'


class SellerReport(models.Model):
    buyer_name = models.CharField(max_length=100)
    buyer_email = models.EmailField()
    seller_name = models.CharField(max_length=100)
    shop_name = models.CharField(max_length=100)
    message = models.TextField()
    evidence_image = models.ImageField(upload_to='evidence_images/')
    submitted_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"{self.buyer_name} - {self.shop_name} report"





