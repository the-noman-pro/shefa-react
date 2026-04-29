from django.urls import path
from . import views

urlpatterns = [
    path('', views.WalletDetailView.as_view(), name='wallet-detail'),
    path('top-up/', views.WalletTopUpView.as_view(), name='wallet-top-up'),
    path('transactions/', views.WalletTransactionListView.as_view(), name='wallet-transactions'),
]