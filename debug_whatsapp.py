import sys
import os
import traceback
from neonize.client import NewClient
from neonize.events import MessageEv, ConnectedEv

client = NewClient("whatsapp_session.db")

@client.event(ConnectedEv)
def on_connected(*args, **kwargs):
    print("⚡ Connected to WhatsApp")

@client.event(MessageEv)
def on_message(cl, message: MessageEv):
    try:
        with open("whatsapp_debug.log", "a", encoding="utf-8") as f:
            f.write("=== NEW MESSAGE EVENT ===\n")
            f.write(f"Type: {type(message)}\n")
            
            # Log message.Info properties
            if hasattr(message, "Info"):
                f.write("--- Info ---\n")
                for attr in dir(message.Info):
                    if not attr.startswith("_"):
                        try:
                            val = getattr(message.Info, attr)
                            f.write(f"Info.{attr}: {val}\n")
                        except Exception:
                            pass
                
                # Log MessageSource properties
                ms = getattr(message.Info, "MessageSource", None)
                if ms:
                    f.write("--- MessageSource ---\n")
                    for attr in dir(ms):
                        if not attr.startswith("_"):
                            try:
                                val = getattr(ms, attr)
                                f.write(f"MessageSource.{attr}: {val}\n")
                            except Exception:
                                pass
                                
                    # Log Chat/Sender attributes
                    for node in ["Chat", "Sender"]:
                        node_val = getattr(ms, node, None)
                        if node_val:
                            f.write(f"--- MessageSource.{node} attributes ---\n")
                            for attr in dir(node_val):
                                if not attr.startswith("_"):
                                    try:
                                        val = getattr(node_val, attr)
                                        f.write(f"{node}.{attr}: {val}\n")
                                    except Exception:
                                        pass

            # Log message.Message properties
            if hasattr(message, "Message"):
                f.write("--- Message ---\n")
                for attr in dir(message.Message):
                    if not attr.startswith("_"):
                        try:
                            val = getattr(message.Message, attr)
                            # Truncate very long representations
                            rep = str(val)[:150]
                            f.write(f"Message.{attr}: {rep}\n")
                        except Exception:
                            pass
                            
            f.write("=========================\n\n")
            f.flush()
        print("Logged event details to whatsapp_debug.log")
    except Exception as e:
        with open("whatsapp_debug.log", "a", encoding="utf-8") as f:
            f.write(f"Error in debugger: {e}\n")
            traceback.print_exc(file=f)
            f.flush()

if __name__ == "__main__":
    client.connect()
