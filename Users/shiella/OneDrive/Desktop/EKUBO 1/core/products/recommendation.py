# products/recommendation.py

import numpy as np
from .models import Product, Order
from django.db.models import Q

def knn_recommend_products(user, k=10):
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.neighbors import NearestNeighbors
    except Exception:
        # scikit-learn not available in the environment (e.g., on limited build)
        # return empty recommendations so the app can still start.
        return []
    user_orders = Order.objects.filter(buyer=user, status__in=["Accepted", "Pending"])
    user_products = Product.objects.filter(order__in=user_orders).distinct()

    if not user_products.exists():
        return Product.objects.none()

    all_products = Product.objects.exclude(id__in=user_products.values_list('id', flat=True))
    if not all_products.exists():
        return Product.objects.none()

    all_products_list = list(all_products)
    corpus = [f"{p.product_name} {p.product_description} {p.product_category.name}" for p in all_products_list]

    vectorizer = TfidfVectorizer(stop_words='english')
    X = vectorizer.fit_transform(corpus)

    knn = NearestNeighbors(n_neighbors=min(k, len(all_products)), metric='cosine', n_jobs=-1)
    knn.fit(X)

    recommendations = set()
    for user_product in user_products:
        user_text = f"{user_product.product_name} {user_product.product_description} {user_product.product_category.name}"
        user_vec = vectorizer.transform([user_text])
        distances, indices = knn.kneighbors(user_vec)

        for idx in indices[0]:
            recommendations.add(all_products_list[idx])

    return list(recommendations)



