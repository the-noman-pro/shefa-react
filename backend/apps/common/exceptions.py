from rest_framework.views import exception_handler
from rest_framework.response import Response

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        if isinstance(response.data, dict):
            if 'detail' in response.data:
                response.data = {
                    'errors': [str(response.data['detail'])],
                    'status_code': response.status_code,
                }
            else:
                errors = []
                for field, messages in response.data.items():
                    if isinstance(messages, list):
                        for msg in messages:
                            errors.append(f"{field}: {msg}")
                    else:
                        errors.append(f"{field}: {messages}")
                response.data = {
                    'errors': errors,
                    'status_code': response.status_code,
                }
        elif isinstance(response.data, list):
            response.data = {
                'errors': [str(e) for e in response.data],
                'status_code': response.status_code,
            }
    
    return response