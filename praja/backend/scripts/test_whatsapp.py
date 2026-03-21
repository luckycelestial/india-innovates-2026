import asyncio
from app.routes.whatsapp import _handle_message

class MockResp:
    def message(self, text):
        print("RESPONSE MESSAGE:")
        print(text)

async def run():
    resp = MockResp()
    try:
        await _handle_message("YES", "whatsapp:+910000111122", resp)
        await _handle_message("paani nahi aaya", "whatsapp:+910000111122", resp)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(run())
