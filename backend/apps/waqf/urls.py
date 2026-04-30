from django.urls import path
from . import views

urlpatterns = [
    path('', views.WaqfProductListView.as_view(), name='waqf-list'),
    path('<int:pk>/', views.WaqfProductDetailView.as_view(), name='waqf-detail'),
    path('buy/', views.BuyWaqfView.as_view(), name='waqf-buy'),
]