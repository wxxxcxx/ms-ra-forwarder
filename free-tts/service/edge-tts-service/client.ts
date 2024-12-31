import { arrayBufferToString, concatArrayBuffers } from '../misc'
import axios from 'axios'
import { WebSocket } from 'ws'

class MessageHeader {
    requestId: string
    contentType?: string
    path: string
    streamId?: string
    constructor(requestId: string, path: string, contentType?: string, streamId?: string) {
        this.requestId = requestId
        this.contentType = contentType
        this.path = path
        this.streamId = streamId
    }
    public static parse(data: string): MessageHeader {
        const requestIdPattern = /X-RequestId:(?<id>[a-z|0-9]*)/
        const contentTypePattern = /Content-Type:(?<type>.*)/
        const pathPattern = /Path:(?<path>.*)\s/
        const streamIdPattern = /X-StreamId:(?<id>.*)/
        const requestIdMatch = requestIdPattern.exec(data)
        if (requestIdMatch === null) {
            throw new Error('RequestId not found: \n' + data,)
        }
        const contentTypeMatch = contentTypePattern.exec(data)
        const pathMatch = pathPattern.exec(data)
        if (pathMatch === null) {
            throw new Error('Path not found: \n' + data)
        }
        const streamIdMatch = streamIdPattern.exec(data)
        return new MessageHeader(requestIdMatch.groups!.id, pathMatch.groups!.path, contentTypeMatch?.groups?.type, streamIdMatch?.groups?.id)
    }

    public toString(): string {
        let header = `X-RequestId:${this.requestId}\r\n`
        header += `Content-Type:${this.contentType}; charset=UTF-8\r\n`
        if (this.streamId) {
            header += `X-StreamId:${this.streamId}\r\n`
        }
        header += `Path:${this.path}\r\n`
        return header
    }
}

function createConfigMessage(options: ClientOptions) {
    return {
        context: {
            synthesis: {
                audio: {
                    metadataoptions: {
                        sentenceBoundaryEnabled: options.sentenceBoundaryEnabled ? 'true' : 'false',
                        wordBoundaryEnabled: options.wordBoundaryEnabled ? 'true' : 'false',
                    },
                    outputFormat: options.format,
                },
            },
        },
    }
}

export interface ClientOptions {
    format: string
    sentenceBoundaryEnabled?: boolean
    wordBoundaryEnabled?: boolean
}

export interface ConvertResult {
    audio: ArrayBuffer
    metadata: any[]
}

export class EdgeTTSClient {
    private constructor() {
    }
    public static async voices(): Promise<any> {
        const url = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4'
        const response = await axios.get(url)
        const data = response.data
        return data
    }
    private static generateId(): String {
        const charset = "abcdef0123456789";
        let randomString = "";
        for (let i = 0; i < 32; i++) { // 16字节 * 2字符/字节 = 32字符
            const randomIndex = Math.floor(Math.random() * charset.length);
            randomString += charset.charAt(randomIndex);
        }
        return randomString;
    }
    private static async createWS(): Promise<WebSocket> {
        const connectionId = this.generateId()
        let url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${connectionId}`
        const client = new WebSocket(url, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.66 Safari/537.36 Edg/103.0.1264.44',
                'Host': 'speech.platform.bing.com',
                "Origin": 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
            },
        })
        return new Promise((resolve, reject) => {
            client.onopen = () => {
                resolve(client)
            }

            client.onerror = (error) => {
                reject(error)
            }
        })
    }

    public static async convert(ssml: string, options: ClientOptions): Promise<ConvertResult> {
        let convertResult = new Promise<ConvertResult>(async (resolve, reject) => {
            try {

                let audio = new ArrayBuffer(0)
                let metadata: any = []
                const requestId = this.generateId()
                const ws = await this.createWS()
                ws.onclose = (r) => {
                    if (r.code !== 1000) {
                        reject(new Error(`WebSocket closed with code ${r.code}: ${r.reason}`))
                    }
                }
                ws.onmessage = (message) => {
                    if (message.data instanceof ArrayBuffer) {
                        let data = message.data
                        const headerRangeByteCount = 2
                        let [headerStart, headerLength] = Array.from(new Uint8Array(data.slice(0, 2)))
                        const headerData = data.slice(headerStart, headerRangeByteCount + headerLength)
                        const headerPayload = headerData.slice(headerRangeByteCount, headerData.byteLength)
                        let headerString = arrayBufferToString(headerPayload)
                        const header = MessageHeader.parse(headerString)
                        console.debug('收到消息：', header)
                        data = data.slice(headerLength + headerRangeByteCount)
                        if (header.requestId === requestId) {
                            audio = concatArrayBuffers(audio, data)
                        }
                    } else if (typeof message.data === 'string') {
                        const spliter = '\r\n\r\n';
                        const headerStringEnd = message.data.indexOf(spliter) + spliter.length
                        const headerString = message.data.slice(0, headerStringEnd)
                        const header = MessageHeader.parse(headerString)
                        const body = message.data.slice(headerStringEnd)
                        console.debug('收到消息：', body)
                        switch (header.path) {
                            case 'turn.start': {
                                break
                            }
                            case 'audio.metadata': {
                                const data = JSON.parse(body)
                                if (!data) {
                                    return
                                }
                                if (data["Metadata"] instanceof Array) {
                                    metadata.push(...data["Metadata"])
                                }
                                break
                            }
                            case 'turn.end': {
                                if (header.requestId === requestId) {
                                    resolve({ audio, metadata })
                                    ws.close(1000, '正常关闭')
                                }
                                break
                            }
                        }
                    }
                }
                // 发送配置消息
                let config = createConfigMessage(options)
                let configMessage =
                    `X-Timestamp:${Date()}\r\n` +
                    'Content-Type:application/json; charset=utf-8\r\n' +
                    'Path:speech.config\r\n\r\n' +
                    JSON.stringify(config)
                console.debug(`开始转换：${requestId}...`)
                console.debug(`准备发送配置请求：${requestId}\n`, configMessage)
                ws!.send(
                    configMessage,
                    (error) => {
                        if (error) {
                            reject(error)
                        } else {
                            // 发送SSML消息
                            let ssmlMessage =
                                `X-Timestamp:${Date()}\r\n` +
                                `X-RequestId:${requestId}\r\n` +
                                `Content-Type:application/ssml+xml\r\n` +
                                `Path:ssml\r\n\r\n` +
                                ssml
                            console.debug(`发送转换信息：${requestId}\n`, ssmlMessage)
                            ws.send(
                                ssmlMessage, (error) => {
                                    if (error) {
                                        reject(error)
                                    }
                                })
                        }
                    }
                )
            } catch (e) {
                reject(e)
            }

        })
        const result: Promise<ConvertResult> = Promise.race([
            convertResult,
            new Promise<ConvertResult>((_, reject) => {
                // 如果超过 60 秒没有返回结果，则清除请求并返回超时
                setTimeout(() => {
                    reject(new Error('请求超时'))
                }, 600000)
            }),
        ])

        return await result
    }
}
