import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

User = get_user_model()



@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_data():
    return {
        'email': 'test@shefa.com',
        'username': 'testuser',
        'first_name': 'Test',
        'last_name': 'User',
        'password': 'TestPass123!',
        'password_confirm': 'TestPass123!',
    }


@pytest.mark.django_db
class TestRegistration:
    def test_register_success(self, api_client, user_data):
        url = reverse('auth-register')
        response = api_client.post(url, user_data, format='json')
        assert response.status_code == 201
        assert 'tokens' in response.data
        assert 'access' in response.data['tokens']
        assert User.objects.filter(email='test@shefa.com').exists()

    def test_register_duplicate_email(self, api_client, user_data):
        User.objects.create_user(
            email='test@shefa.com',
            username='existing',
            password='Pass123!',
        )
        url = reverse('auth-register')
        response = api_client.post(url, user_data, format='json')
        assert response.status_code == 400

    def test_register_password_mismatch(self, api_client, user_data):
        user_data['password_confirm'] = 'DifferentPass123!'
        url = reverse('auth-register')
        response = api_client.post(url, user_data, format='json')
        assert response.status_code == 400


@pytest.mark.django_db
class TestLogin:
    def test_login_success(self, api_client):
        User.objects.create_user(
            email='login@shefa.com',
            username='loginuser',
            password='TestPass123!',
        )
        url = reverse('auth-login')
        response = api_client.post(url, {
            'email': 'login@shefa.com',
            'password': 'TestPass123!',
        }, format='json')
        assert response.status_code == 200
        assert 'tokens' in response.data

    def test_login_wrong_password(self, api_client):
        url = reverse('auth-login')
        response = api_client.post(url, {
            'email': 'login@shefa.com',
            'password': 'WrongPass!',
        }, format='json')
        assert response.status_code == 401

    def test_profile_requires_auth(self, api_client):
        url = reverse('auth-profile')
        response = api_client.get(url)
        assert response.status_code == 401