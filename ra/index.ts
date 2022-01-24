import { randomBytes } from "crypto";
import { client as WebSocketClient } from "websocket";


export const FORMAT_CONTENT_TYPE = new Map([
    ['raw-16khz-16bit-mono-pcm', 'audio/basic'],
    ['raw-48khz-16bit-mono-pcm', 'audio/basic'],
    ['raw-8khz-8bit-mono-mulaw', 'audio/basic'],
    ['raw-8khz-8bit-mono-alaw', 'audio/basic'],

    ['raw-16khz-16bit-mono-truesilk', 'audio/SILK'],
    ['raw-24khz-16bit-mono-truesilk', 'audio/SILK'],

    ['riff-16khz-16bit-mono-pcm', 'audio/x-wav'],
    ['riff-24khz-16bit-mono-pcm', 'audio/x-wav'],
    ['riff-48khz-16bit-mono-pcm', 'audio/x-wav'],
    ['riff-8khz-8bit-mono-mulaw', 'audio/x-wav'],
    ['riff-8khz-8bit-mono-alaw', 'audio/x-wav'],

    ['audio-16khz-32kbitrate-mono-mp3', 'audio/mpeg'],
    ['audio-16khz-64kbitrate-mono-mp3', 'audio/mpeg'],
    ['audio-16khz-128kbitrate-mono-mp3', 'audio/mpeg'],
    ['audio-24khz-48kbitrate-mono-mp3', 'audio/mpeg'],
    ['audio-24khz-96kbitrate-mono-mp3', 'audio/mpeg'],
    ['audio-24khz-160kbitrate-mono-mp3', 'audio/mpeg'],
    ['audio-48khz-96kbitrate-mono-mp3', 'audio/mpeg'],
    ['audio-48khz-192kbitrate-mono-mp3', 'audio/mpeg'],

    ['webm-16khz-16bit-mono-opus', 'audio/webm; codec=opus'],
    ['webm-24khz-16bit-mono-opus', 'audio/webm; codec=opus'],

    ['ogg-16khz-16bit-mono-opus', 'audio/ogg; codecs=opus; rate=16000'],
    ['ogg-24khz-16bit-mono-opus', 'audio/ogg; codecs=opus; rate=24000'],
    ['ogg-48khz-16bit-mono-opus', 'audio/ogg; codecs=opus; rate=48000'],

])


export function convert(ssml: string, format: string) {
    return new Promise((resolve, reject) => {
        let buffers: Array<Buffer> = [];
        let ws = new WebSocketClient();
        ws.on('connect', connection => {
            console.log('ws connected');
            connection.on('close', (code, desc) => {
                if (code == 1000) {
                    // console.log('ws disconnected');
                } else {
                    console.log('ws connection was closed by', code, desc);
                    reject(`ws connection was closed by: [${code} ${desc}]`);
                }
            });

            connection.on('message', message => {
                if (message.type == 'utf8') {
                    console.log('ws received text:', JSON.stringify(message.utf8Data));
                    if (message.utf8Data.includes('Path:turn.end')) {
                        let result = Buffer.concat(buffers);
                        console.log('ws total received binary', result.length);

                        console.log('ws task complete');
                        connection.close(1000, 'CLOSE_NORMAL');

                        resolve(result);
                    }
                } else if (message.type == 'binary') {
                    // console.log('ws received binary:', message.binaryData.length);
                    let separator = 'Path:audio\r\n';
                    let contentIndex = message.binaryData.indexOf(separator) + separator.length;
                    let content = message.binaryData.slice(contentIndex, message.binaryData.length);
                    buffers.push(content);
                }
            });
            let configMessage = `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n
            {
                "context": {
                    "synthesis": {
                        "audio": {
                            "metadataoptions": {
                                "sentenceBoundaryEnabled": "false",
                                "wordBoundaryEnabled": "false"
                            },
                            "outputFormat": "${format}" 
                        }
                    }
                }
            }`

            console.log('ws send:', JSON.stringify(configMessage));
            connection.send(configMessage, () => {
                const requestId = randomBytes(16).toString("hex");
                let message = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n` + ssml;
                console.log('ws send:', JSON.stringify(message));
                connection.send(message, (error) => {
                    if (error) {
                        console.log('ws send failed', error);
                        reject(`ws send failed: ${error}`);
                    }
                });
            });

        });

        ws.on('connectFailed', error => {
            console.log('ws connect failed', error);
            reject(`ws connect failed: ${error}`);
        });
        ws.on('httpResponse', (response, client) => {
            console.log('ws response status', response.statusCode, response.statusMessage);
        });

        ws.connect('wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4');
    });

}
