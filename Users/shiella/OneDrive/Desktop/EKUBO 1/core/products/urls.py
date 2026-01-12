from django.urls import path
from . import views

app_name = 'products'

urlpatterns = [
    path('add-new-product/', views.add_new_product, name='add_new_products'),
    # path('edit-my-product?/<uuid:product_id>/', views.edit_product, name='edit_products'),
    path('add-new-business/', views.createBusiness, name='create_business'),
    path('<uuid:id>/', views.view_product, name='view_product'),
    path('wishlist/add/<uuid:product_id>/', views.add_to_wishlist, name='add_to_wishlist'),
    path('wishlist/remove/<int:wishlist_id>/', views.remove_from_wishlist, name='remove_from_wishlist'),
    path('place-order/<uuid:product_id>/', views.place_order, name='place_order'),
    path('order-details/<uuid:product_id>/', views.order_details, name='order_details'),
    path('success-purchase/', views.success_purchase, name='success_purchase'),
    path('add-category/', views.add_category, name='add_category'),
    path('product_category/<uuid:category_id>/', views.show_products_category, name='show_products_category'),
    path('sumbit_report/', views.submit_report, name='submit_report')
]











