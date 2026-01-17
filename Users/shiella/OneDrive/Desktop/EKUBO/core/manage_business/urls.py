from django.urls import path
from . import views

app_name = 'manage_business'

urlpatterns = [
    path('seller/dashboard/', views.seller_dashboard, name='home'),
    path('order/accept/<int:order_id>/', views.accept_order, name='accept_order'),
    path('order/reject/<int:order_id>/', views.reject_order, name='reject_order'),
    path('delete-product/<uuid:product_id>/', views.delete_product, name='delete_product'),
    path('view/products/', views.view_product, name='view_product'),
    path('view/categories/', views.view_category, name='view_category'),
    path('orders/accepted/', views.accepted_orders, name='accepted_orders'),
    path('orders/rejected/', views.rejected_orders, name='rejected_orders'),
    path('orders/fetch-next/', views.fetch_next_order, name='fetch_next_order'),
    path('counts/', views.counts_api, name='counts_api'),
]

























