from products.models import Business  # Import your Store model

def store_context(request):
    stores = Business.objects.all()  # Fetch all stores
    return {'stores': stores}  # Make it available in all templates
