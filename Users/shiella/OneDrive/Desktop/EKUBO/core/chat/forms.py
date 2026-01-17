from django import forms
from .models import     Profile
from django.contrib.auth import get_user_model

User = get_user_model()

class EditProfileForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields  = ['profile']

class DeliveryAddressForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ['province', 'municipality', 'street', 'postal_code']

class UpdateUser(forms.ModelForm):
    phone = forms.CharField(
        max_length=15,
        required=True,
        widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter phone number'})
    )

    class Meta:
        model = User
        fields = ['username', 'first_name', 'last_name', 'phone']
        widgets = {
            'username': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Enter username'}),
        }
class VerifyUserForm(forms.Form):
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)


# forms.py (add below the previous form)
class SetNewPasswordForm(forms.Form):
    new_password = forms.CharField(widget=forms.PasswordInput)
    confirm_password = forms.CharField(widget=forms.PasswordInput)

    def clean(self):
        cleaned_data = super().clean()
        new = cleaned_data.get("new_password")
        confirm = cleaned_data.get("confirm_password")
        if new != confirm:
            raise forms.ValidationError("Passwords do not match")
        return cleaned_data
