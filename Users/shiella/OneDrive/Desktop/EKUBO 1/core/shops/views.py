from django.shortcuts import render, redirect, get_object_or_404
from products.models import Business
from products.forms import UpdateBusinessForm
from django.urls import reverse
from products.models import Product
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from products.models import Category
User = get_user_model()

@login_required(login_url='/login/')
def shops_list(request):
    shop = Business.objects.filter(business_name__isnull=False) | Business.objects.filter(business_name__isnull=False)
    total_shop = shop.count()
    
    context = {'shop':shop,'total_shop':total_shop}
    return render(request, 'shops/shop_list.html', context)

@login_required(login_url='/login/')
def update_shop(request, pk):
    instance = get_object_or_404(Business, pk=pk)
    if request.method == 'POST':
        form = UpdateBusinessForm(request.POST, request.FILES, instance=instance)
        if form.is_valid():
            form.save()
            return redirect(reverse('chat:profile_detail'))
    else:
        form = UpdateBusinessForm(instance=instance)
    return render(request, 'shops/update-shop.html', {'form': form})

@login_required(login_url='/login/')
def view_shop(request, pk):
    shop = get_object_or_404(Business, pk=pk)
    products = Product.objects.filter(seller=shop)
    total_products = products.count()
    user = request.user
    query = request.GET.get('q', '')
    results = Product.objects.filter(product_name__icontains=query) if query else []

    context = {
        'shop': shop,
        'product': products,
        'total_product': total_products,
        'user': user,
        'query':query,
        'results':results,
    }
    return render(request, 'shops/view-shop.html', context)








