import { arrayBufferToString, concatArrayBuffers } from '../utils'
import axios from 'axios'
import { createHash } from 'node:crypto'
import { WebSocket } from 'ws'

export const CHROMIUM_FULL_VERSION = '130.0.2849.68'
export const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const WINDOWS_FILE_TIME_EPOCH = 11644473600n

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

    private static generateSecMsGecToken() {
        const ticks = BigInt(Math.floor((Date.now() / 1000) + Number(WINDOWS_FILE_TIME_EPOCH))) * 10000000n
        const roundedTicks = ticks - (ticks % 3000000000n)

        const strToHash = `${roundedTicks}${TRUSTED_CLIENT_TOKEN}`

        const hash = createHash('sha256')
        hash.update(strToHash, 'ascii')

        return hash.digest('hex').toUpperCase()
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
        const secMsGec = this.generateSecMsGecToken()
        let url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}&ConnectionId=${connectionId}`
        // let url = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&Sec-MS-GEC=3354FF87541D813A7A03BFA8F5CD8B0DEE6A396F4F1BCC85950A833875F756FE&Sec-MS-GEC-Version=1-131.0.2903.112&ConnectionId=2b492d9fa38b65b24c77b930eb7f6622'
        const client = new WebSocket(url, {
            host: 'speech.platform.bing.com',
            origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
            },
        })
        return new Promise((resolve, reject) => {
            client.onopen = () => {
                console.debug('WebSocket connected')
                resolve(client)
            }

            client.onerror = (error) => {
                console.error('WebSocket error:', error)
                reject(error)
            }
        })
    }

    public static async convert(ssml: string, options: ClientOptions): Promise<ConvertResult> {
        console.debug('start convert', JSON.stringify(ssml), JSON.stringify(options))
        let convertResult = new Promise<ConvertResult>(async (resolve, reject) => {
            try {
                let audio = new ArrayBuffer(0)
                let metadata: any = []
                const requestId = this.generateId()
                const ws = await this.createWS()
                ws.onclose = (r) => {
                    console.debug(`Websocket closed with ${r.code}`)
                    if (r.code !== 1000) {
                        reject(new Error(`WebSocket closed with code ${r.code}: ${r.reason}`))
                    }
                }
                ws.onmessage = (message) => {
                    const messageType = message.data.valueOf()
                    let typeName = 'unknow'
                    if (messageType instanceof Buffer) {
                        typeName = 'buffer'
                    } else if (typeof messageType === 'string') {
                        typeName = 'string'
                    } else {
                        typeName = 'object'
                    }
                    console.debug(`Received ${typeName} message`,)
                    if (message.data instanceof Buffer) {
                        let messageData = new Uint8Array(message.data).buffer
                        const headerRangeByteCount = 2
                        let [headerStart, headerLength] = Array.from(new Uint8Array(messageData.slice(0, 2)))
                        const headerData = messageData.slice(headerStart, headerRangeByteCount + headerLength)
                        const headerPayload = headerData.slice(headerRangeByteCount, headerData.byteLength)
                        let headerString = arrayBufferToString(headerPayload)
                        const header = MessageHeader.parse(headerString)
                        const data = messageData.slice(headerLength + headerRangeByteCount)
                        console.debug('Received binary data:', header.requestId, 'StreamId:', header.streamId, 'Path:', header.path, 'Length:', data.byteLength)
                        if (header.requestId === requestId) {
                            audio = concatArrayBuffers(audio, data)
                        }
                    } else if (typeof message.data === 'string') {
                        const spliter = '\r\n\r\n';
                        const messageData = message.data as string
                        const headerStringEnd = messageData.indexOf(spliter) + spliter.length
                        const headerString = messageData.slice(0, headerStringEnd)
                        const header = MessageHeader.parse(headerString)
                        const body = messageData.slice(headerStringEnd)
                        console.debug('Received text data:', header.requestId, 'StreamId:', header.streamId, 'Path:', header.path, 'Body', body)
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
                                    console.debug(`Client close requestId:${requestId}`)
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
                console.debug(`准备发送配置请求：\n${configMessage}`)
                ws.send(
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
                            console.debug(`发送转换信息：\n${ssmlMessage}`)
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
