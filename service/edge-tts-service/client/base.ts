import { arrayBufferToString, concatArrayBuffers } from '../../utils'
import axios from 'axios'
import { createHash } from 'node:crypto'
import { WebSocket } from 'ws'

export const CHROMIUM_FULL_VERSION = '144.0.3719.82'
export const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const WINDOWS_FILE_TIME_EPOCH = 11644473600n

/** 仅允许向微软这两台 TTS 主机发请求：EndpointConfig 是模块内硬编码常量，
 *  这里再加一道校验，防止未来新增配置时把内部 token 送到别处。 */
const ALLOWED_TTS_HOSTS = new Set(['speech.platform.bing.com', 'api.msedgeservices.com'])

/** 校验通过后原样返回该 URL；主机不在白名单或 URL 非法则抛错（调用方不再直传未校验 URL）。 */
function allowlistedTtsUrl(url: string): string {
    let host: string
    try {
        host = new URL(url).hostname.toLowerCase()
    } catch {
        throw new Error('Refused outbound TTS request with invalid URL')
    }
    if (!ALLOWED_TTS_HOSTS.has(host)) {
        throw new Error(`Refused outbound TTS request to non-allowlisted host: ${host}`)
    }
    return url
}

/** 组装 WebSocket 完整 URL：基址先过白名单，其余 query 均为本机生成的鉴权值与常量。 */
function buildWsUrl(config: EndpointConfig, secMsGec: string, connectionId: string): string {
    const base = allowlistedTtsUrl(config.wsBaseUrl)
    return `${base}?${config.tokenParamName}=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}&ConnectionId=${connectionId}`
}

export interface EndpointConfig {
    /** 日志与调试用名，如 'v1' / 'v2' */
    name: string
    /** 音色列表完整 URL（含鉴权 query） */
    voicesUrl: string
    /** WebSocket 基址（不含 query），如 wss://.../edge/v1 */
    wsBaseUrl: string
    /** token 的 query 参数名：v1 用 TrustedClientToken，v2 用 Ocp-Apim-Subscription-Key */
    tokenParamName: string
    /** 握手 host 头 */
    host: string
}

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

/** 微软音色列表条目（audio.metadata 以外的另一个 JSON 边界）。 */
export interface EdgeVoiceInfo {
    Name: string
    ShortName: string
    Gender: string
    Locale: string
    FriendlyName: string
    SuggestedCodec: string
    VoiceTag: {
        VoicePersonalities?: string[]
    }
}

export interface SpeechMetadataText {
    Text: string
    // 微软实际下发的是 number；service/edge-tts-service/index.ts 按 string 消费（历史现状，保持不动）。
    Length: string
}

export interface SpeechMetadataData {
    Offset: number
    Duration: number
    text: SpeechMetadataText
}

/** audio.metadata 消息里的单条元数据（100ns ticks，见 service/edge-tts-service/index.ts 换算）。 */
export interface SpeechMetadata {
    Type: string
    Data: SpeechMetadataData
}

export interface ConvertResult {
    audio: ArrayBuffer
    metadata: SpeechMetadata[]
}

/** v1/v2 共享的协议实现：唯一差异由 EndpointConfig 注入。 */
export class EdgeTTSCore {
    private constructor() {
    }

    public static async voices(config: EndpointConfig): Promise<EdgeVoiceInfo[]> {
        const response = await axios.get(allowlistedTtsUrl(config.voicesUrl))
        const data = response.data as EdgeVoiceInfo[]
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

    private static generateId(): string {
        const charset = "abcdef0123456789";
        let randomString = "";
        for (let i = 0; i < 32; i++) { // 16字节 * 2字符/字节 = 32字符
            const randomIndex = Math.floor(Math.random() * charset.length);
            randomString += charset.charAt(randomIndex);
        }
        return randomString;
    }

    private static async createWS(config: EndpointConfig): Promise<WebSocket> {
        const connectionId = this.generateId()
        const secMsGec = this.generateSecMsGecToken()
        const url = buildWsUrl(config, secMsGec, connectionId)
        const client = new WebSocket(url, {
            host: config.host,
            origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0',
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

    public static async convert(config: EndpointConfig, ssml: string, options: ClientOptions): Promise<ConvertResult> {
        console.debug('start convert', JSON.stringify(ssml), JSON.stringify(options))
        const convertResult = new Promise<ConvertResult>(async (resolve, reject) => {
            try {
                let audio = new ArrayBuffer(0)
                const metadata: SpeechMetadata[] = []
                const requestId = this.generateId()
                const ws = await this.createWS(config)
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
                        const messageData = new Uint8Array(message.data).buffer
                        const headerRangeByteCount = 2
                        const [headerStart, headerLength] = Array.from(new Uint8Array(messageData.slice(0, 2)))
                        const headerData = messageData.slice(headerStart, headerRangeByteCount + headerLength)
                        const headerPayload = headerData.slice(headerRangeByteCount, headerData.byteLength)
                        const headerString = arrayBufferToString(headerPayload)
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
                const configMessagePayload = createConfigMessage(options)
                const configMessage =
                    `X-Timestamp:${Date()}\r\n` +
                    'Content-Type:application/json; charset=utf-8\r\n' +
                    'Path:speech.config\r\n\r\n' +
                    JSON.stringify(configMessagePayload)
                console.debug(`开始转换：${requestId}...`)
                console.debug(`准备发送配置请求：\n${configMessage}`)
                ws.send(
                    configMessage,
                    (error) => {
                        if (error) {
                            reject(error)
                        } else {
                            // 发送SSML消息
                            const ssmlMessage =
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
