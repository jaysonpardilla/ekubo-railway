from django.shortcuts import render, redirect, get_object_or_404
from products.models import Product, Business, Notification, Category, Order
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.contrib import messages
from django.urls import reverse
from django.db import models
from django.core.paginator import Paginator
from django.db.models import Q
from django.template.loader import render_to_string
import json

@login_required
def seller_dashboard(request):
    if request.user.is_authenticated:
        products = Product.objects.filter(seller__user=request.user).order_by('-created_at')
    else:
        products = Product.objects.none()
    notifications = Notification.objects.filter(user=request.user, is_read=False)
    orders_qs = Order.objects.filter(product__seller__user=request.user).order_by('-created_at')

    # Filtering
    q = request.GET.get('q', '').strip()
    status_filter = request.GET.get('status', 'Pending').strip()  # Default to Pending
    if q:
        orders_qs = orders_qs.filter(
            Q(product__product_name__icontains=q) | Q(buyer__first_name__icontains=q) | Q(buyer__last_name__icontains=q)
        )
    if status_filter in ['Pending', 'Accepted', 'Rejected']:
        orders_qs = orders_qs.filter(status=status_filter)

    # Pagination (5 per page)
    paginator = Paginator(orders_qs, 5)
    page_number = request.GET.get('page')
    orders_page = paginator.get_page(page_number)

    # Dashboard counts
    total_products = products.count()
    total_categories = Category.objects.filter(products__seller__user=request.user).distinct().count()
    pending_count = Order.objects.filter(product__seller__user=request.user, status='Pending').count()
    accepted_count = Order.objects.filter(product__seller__user=request.user, status='Accepted').count()
    rejected_count = Order.objects.filter(product__seller__user=request.user, status='Rejected').count()

    context = {
        "orders_page": orders_page,
        "paginator": paginator,
        "notifications": notifications,
        'products': products,
        'total_products': total_products,
        'total_categories': total_categories,
        'pending_count': pending_count,
        'accepted_count': accepted_count,
        'rejected_count': rejected_count,
        'filter_q': q,
        'filter_status': status_filter,
    }
    
    return render(request, "manage_business/seller_dashboard.html", context)
@login_required
def accept_order(request, order_id):
    order = Order.objects.get(id=order_id)
    order.status = "Accepted"
    order.save()
    print(f"Order Accepted by Seller: {request.user.username}")
    print(f"Buyer: {order.buyer.username}")
    Notification.objects.create(
        user=order.buyer,
        message=f"Your order for {order.product.product_name} has been accepted."
    )
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        total_products = Product.objects.filter(seller__user=request.user).count()
        total_categories = Category.objects.filter(products__seller__user=request.user).distinct().count()
        pending_count = Order.objects.filter(product__seller__user=request.user, status='Pending').count()
        accepted_count = Order.objects.filter(product__seller__user=request.user, status='Accepted').count()
        rejected_count = Order.objects.filter(product__seller__user=request.user, status='Rejected').count()
        return JsonResponse({'status': 'ok', 'order_id': str(order.id), 'new_status': order.status,
                             'counts': {
                                 'total_products': total_products,
                                 'total_categories': total_categories,
                                 'pending_count': pending_count,
                                 'accepted_count': accepted_count,
                                 'rejected_count': rejected_count,
                             }})
    return redirect(reverse('manage_business:home'))

@login_required(login_url='/login/')
def reject_order(request, order_id):
    order = Order.objects.get(id=order_id)
    order.status = "Rejected"
    order.save()

    Notification.objects.create(
        user=order.buyer,
        message=f"Your order for {order.product.product_name} has been rejected."
    )
    if request.headers.get('x-requested-with') == 'XMLHttpRequest':
        total_products = Product.objects.filter(seller__user=request.user).count()
        total_categories = Category.objects.filter(products__seller__user=request.user).distinct().count()
        pending_count = Order.objects.filter(product__seller__user=request.user, status='Pending').count()
        accepted_count = Order.objects.filter(product__seller__user=request.user, status='Accepted').count()
        rejected_count = Order.objects.filter(product__seller__user=request.user, status='Rejected').count()
        return JsonResponse({'status': 'ok', 'order_id': str(order.id), 'new_status': order.status,
                             'counts': {
                                 'total_products': total_products,
                                 'total_categories': total_categories,
                                 'pending_count': pending_count,
                                 'accepted_count': accepted_count,
                                 'rejected_count': rejected_count,
                             }})
    return redirect(reverse('manage_business:home'))

@login_required(login_url='/login/')
def delete_product(request, product_id):
    product = get_object_or_404(Product, id=product_id)
    product.delete()
    messages.error(request, 'product deleted!')
    return redirect('manage_business:home')


@login_required
def view_product(request):
    products = Product.objects.filter(seller__user=request.user).order_by('-created_at')
    return render(request, 'manage_business/view_products.html', {'products': products})


@login_required
def view_category(request):
    categories = Category.objects.filter(products__seller__user=request.user).distinct()
    return render(request, 'manage_business/view_categories.html', {'categories': categories})


@login_required
def accepted_orders(request):
    orders_qs = Order.objects.filter(product__seller__user=request.user, status='Accepted').order_by('-created_at')
    q = request.GET.get('q', '').strip()
    if q:
        orders_qs = orders_qs.filter(
            Q(product__product_name__icontains=q) | Q(buyer__first_name__icontains=q) | Q(buyer__last_name__icontains=q)
        )
    paginator = Paginator(orders_qs, 5)
    page = request.GET.get('page')
    orders_page = paginator.get_page(page)
    return render(request, 'manage_business/view_accepted.html', {'orders_page': orders_page, 'filter_q': q})


@login_required
def rejected_orders(request):
    orders_qs = Order.objects.filter(product__seller__user=request.user, status='Rejected').order_by('-created_at')
    q = request.GET.get('q', '').strip()
    if q:
        orders_qs = orders_qs.filter(
            Q(product__product_name__icontains=q) | Q(buyer__first_name__icontains=q) | Q(buyer__last_name__icontains=q)
        )
    paginator = Paginator(orders_qs, 5)
    page = request.GET.get('page')
    orders_page = paginator.get_page(page)
    return render(request, 'manage_business/view_rejected.html', {'orders_page': orders_page, 'filter_q': q})


@login_required
def fetch_next_order(request):
    # expects POST with JSON body: { displayed_ids: [id1,id2,...] }
    if request.method != 'POST':
        return JsonResponse({'found': False, 'error': 'POST required'}, status=400)
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = {}
    displayed = data.get('displayed_ids', [])
    # find next pending order not in displayed list
    qs = Order.objects.filter(product__seller__user=request.user, status='Pending').exclude(id__in=displayed).order_by('-created_at')
    next_order = qs.first()
    if not next_order:
        return JsonResponse({'found': False})
    row_html = render_to_string('manage_business/_order_row.html', {'order': next_order, 'user': request.user})
    return JsonResponse({'found': True, 'html': row_html, 'order_id': str(next_order.id)})


@login_required
def counts_api(request):
    total_products = Product.objects.filter(seller__user=request.user).count()
    total_categories = Category.objects.filter(products__seller__user=request.user).distinct().count()
    pending_count = Order.objects.filter(product__seller__user=request.user, status='Pending').count()
    accepted_count = Order.objects.filter(product__seller__user=request.user, status='Accepted').count()
    rejected_count = Order.objects.filter(product__seller__user=request.user, status='Rejected').count()
    return JsonResponse({'total_products': total_products, 'total_categories': total_categories,
                         'pending_count': pending_count, 'accepted_count': accepted_count, 'rejected_count': rejected_count})


