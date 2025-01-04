import { WebSocket } from 'ws';

class WebSocketClient {
    private ws: WebSocket;

    constructor(ws: WebSocket) {
        this.ws = ws;
    }

    

    send(data: string | ArrayBufferLike): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws.send(data, (error) => {
                if (error) {
                    reject(error)
                } else {
                    resolve()
                }
            });
        });
    }

    close(code?: number, reason?: string): Promise<void> {
        return new Promise((resolve) => {
            this.ws.close(code, reason);
            this.ws.onclose = () => resolve();
        });
    }
}
