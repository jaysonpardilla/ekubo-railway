from django import template
from products.models import Wishlist

register = template.Library()

@register.filter
def get_item(dictionary, key):
    return dictionary.get(key)


@register.filter
def in_wishlist(product, user):
    """Return True if the given product is in the user's wishlist."""
    if not user or user.is_anonymous:
        return False
    return Wishlist.objects.filter(user=user, product=product).exists()
