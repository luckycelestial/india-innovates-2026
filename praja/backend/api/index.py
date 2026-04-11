# Vercel entrypoint for PRAJA Backend
import sys
import os

# Ensure the root folder (/praja/backend) is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

try:
    from app.main import app
except Exception as e:
    import traceback
    _error_trace = traceback.format_exc()
    
    # Fallback to a simple WSGI/ASGI app that returns the error
    async def app(scope, receive, send):
        assert scope['type'] == 'http'
        error_msg = f"Backend initialization failed:\n{_error_trace}".encode('utf-8')
        await send({
            'type': 'http.response.start',
            'status': 500,
            'headers': [
                [b'content-type', b'text/plain'],
                [b'content-length', str(len(error_msg)).encode('utf-8')]
            ]
        })
        await send({
            'type': 'http.response.body',
            'body': error_msg
        })

# Vercel needs 'app' to be exported at the top level
app = app
