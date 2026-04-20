from django.urls import path
from . import views

urlpatterns = [
    path('', views.CharityListView.as_view(), name='charity-list'),
    path('create/', views.CharityCreateView.as_view(), name='charity-create'),
    path('<slug:slug>/', views.CharityDetailView.as_view(), name='charity-detail'),
    path('<slug:slug>/manage/', views.CharityUpdateView.as_view(), name='charity-manage'),
]