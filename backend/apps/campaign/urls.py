from django.urls import path
from . import views

urlpatterns = [
    path('', views.CampaignListView.as_view(), name='campaign-list'),
    path('create/', views.CampaignCreateView.as_view(), name='campaign-create'),
    path('<slug:slug>/', views.CampaignDetailView.as_view(), name='campaign-detail'),
    path('<slug:slug>/manage/', views.CampaignUpdateView.as_view(), name='campaign-manage'),
]