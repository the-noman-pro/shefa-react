from django.urls import path
from . import views

urlpatterns = [
    path('donate/', views.DonateView.as_view(), name='donate'),
    path('my-donations/', views.UserDonationListView.as_view(), name='my-donations'),
    path('campaign/<slug:slug>/donors/', views.CampaignDonorsView.as_view(), name='campaign-donors'),
]