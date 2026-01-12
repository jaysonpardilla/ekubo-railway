from django import forms
from .models import Product, Business, Review, Category

from django import forms
from .models import Product

class ProductForm(forms.ModelForm):
    class Meta:
        model = Product
        fields = ['product_name', 'product_category', 'product_measurement', 
                  'product_description', 'product_price', 'product_stock', 
                  'product_image', 'product_image1', 'product_image2', 
                  'product_image3', 'product_image4']
        widgets = {
            'product_image': forms.ClearableFileInput(attrs={'class': 'form-control'}),
            'product_image1': forms.ClearableFileInput(attrs={'class': 'form-control'}),
            'product_image2': forms.ClearableFileInput(attrs={'class': 'form-control'}),
            'product_image3': forms.ClearableFileInput(attrs={'class': 'form-control'}),
            'product_image4': forms.ClearableFileInput(attrs={'class': 'form-control'}),
        }


class BusinessForm(forms.ModelForm):
    class Meta:
        model = Business
        fields = '__all__'
        exclude = ['user']

class UpdateBusinessForm(forms.ModelForm):
    class Meta:
        model = Business
        fields = '__all__'
        exclude = ['user']

class ReviewForm(forms.ModelForm):
    class Meta:
        model = Review
        fields = ['rating', 'comment']

class AddCategory(forms.ModelForm):
     class Meta:
        model = Category
        fields = [
            'name', 'image'
        ]









