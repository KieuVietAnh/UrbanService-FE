/* Lightweight socket wrapper for inbox messaging events.
   This is intentionally minimal and provides event subscriptions for:
   - new_message
   - delivered
   - read
   - typing
   The implementation uses the browser/ReactNative WebSocket global and exposes
   connect/disconnect/on/off/send helpers. Reconnection is attempted automatically.
*/

type EventHandler = (payload: any) => void;

class SocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private reconnectInterval = 3000;
  private handlers: Record<string, Set<EventHandler>> = {};
  private shouldReconnect = true;

  constructor(url: string) {
    this.url = url;
  }

  connect() {
    if (this.ws) return;
    try {
      this.ws = new WebSocket(this.url);
    } catch (e) {
      // ignore
      return;
    }

    this.ws.onopen = () => {
      this.emitLocal('connected', null);
    };

    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string);
        const { event, payload } = data;
        this.emitLocal(event, payload);
      } catch (e) {
        // ignore non-json
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.emitLocal('disconnected', null);
      if (this.shouldReconnect) setTimeout(() => this.connect(), this.reconnectInterval);
    };

    this.ws.onerror = () => {
      // allow onclose to handle reconnect
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }

  on(event: string, handler: EventHandler) {
    this.handlers[event] = this.handlers[event] || new Set();
    this.handlers[event].add(handler);
  }

  off(event: string, handler?: EventHandler) {
    if (!this.handlers[event]) return;
    if (handler) this.handlers[event].delete(handler);
    else this.handlers[event].clear();
  }

  private emitLocal(event: string, payload: any) {
    const set = this.handlers[event];
    if (!set) return;
    set.forEach((h) => {
      try { h(payload); } catch (e) { /* ignore */ }
    });
  }

  send(event: string, payload: any) {
    const message = JSON.stringify({ event, payload });
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(message);
      return true;
    }
    return false;
  }
}

let client: SocketClient | null = null;

export const getSocketClient = (baseUrl?: string) => {
  if (client) return client;
  const normalized = (baseUrl || '').replace(/^http/, 'ws').replace(/\/$/, '');
  const url = normalized || 'wss://api.urbanservice.me/ws';
  client = new SocketClient(url);
  client.connect();
  return client;
};

export default getSocketClient;
