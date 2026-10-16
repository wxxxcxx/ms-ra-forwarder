import { arrayBufferToString, concatArrayBuffers } from '../../utils'
import axios from 'axios'
import { randomBytes } from 'node:crypto'
import { WebSocket } from 'ws'
import { generateSecMsGec } from '../sec-ms-gec'

export const CHROMIUM_FULL_VERSION = '144.0.3719.82'
export const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
/** 微软当前只接受 "2-<chromium 版本>" 形式的令牌版本号，旧的 "1-" 会直接 403。 */
export const SEC_MS_GEC_VERSION = `2-${CHROMIUM_FULL_VERSION}`
const USER_AGENT =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0'
/** 握手超时：拿不到 upgrade 响应时尽早失败，交给聚合层换后端重试。 */
const WS_HANDSHAKE_TIMEOUT_MS = 12000

/**
 * 详细协议日志（每条 WS 消息的收发），默认关闭：Vercel Hobby 的日志窗口很小，
 * 全开会被噪音淹没。深度排查时置 EDGE_TTS_DEBUG=1 再部署。
 */
function debugLog(...args: unknown[]): void {
    if (process.env.EDGE_TTS_DEBUG === '1') {
        console.debug('[edge-tts-debug]', ...args)
    }
}

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
    return `${base}?${config.tokenParamName}=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connectionId}`
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

    private static generateId(): string {
        const charset = "abcdef0123456789";
        let randomString = "";
        for (let i = 0; i < 32; i++) { // 16字节 * 2字符/字节 = 32字符
            const randomIndex = Math.floor(Math.random() * charset.length);
            randomString += charset.charAt(randomIndex);
        }
        return randomString;
    }

    /** 生成 32 位十六进制的 MUID，微软新版接口要求带上它。 */
    private static generateMuid(): string {
        return randomBytes(16).toString('hex').toUpperCase()
    }

    private static async createWS(config: EndpointConfig): Promise<WebSocket> {
        const connectionId = this.generateId()
        const secMsGec = generateSecMsGec(undefined, TRUSTED_CLIENT_TOKEN)
        const url = buildWsUrl(config, secMsGec, connectionId)
        const client = new WebSocket(url, {
            host: config.host,
            origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
            handshakeTimeout: WS_HANDSHAKE_TIMEOUT_MS,
            headers: {
                'User-Agent': USER_AGENT,
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cookie': `muid=${this.generateMuid()};`,
            },
        })
        return new Promise((resolve, reject) => {
            client.onopen = () => {
                debugLog('WebSocket connected')
                resolve(client)
            }

            client.onerror = (error) => {
                reject(error)
            }

            // 握手被拒（例如 403）时带上状态码，便于在部署日志里定位。
            client.on('unexpected-response', (_request, response) => {
                const error = new Error(`${config.name} 握手被拒绝: HTTP ${response.statusCode}`)
                response.resume()
                client.terminate()
                reject(error)
            })
        })
    }

    public static async convert(config: EndpointConfig, ssml: string, options: ClientOptions): Promise<ConvertResult> {
        debugLog('start convert', JSON.stringify(ssml), JSON.stringify(options))
        const convertResult = new Promise<ConvertResult>(async (resolve, reject) => {
            try {
                let audio = new ArrayBuffer(0)
                const metadata: SpeechMetadata[] = []
                const requestId = this.generateId()
                const ws = await this.createWS(config)
                ws.onclose = (r) => {
                    debugLog(`Websocket closed with ${r.code}`)
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
                    debugLog(`Received ${typeName} message`,)
                    if (message.data instanceof Buffer) {
                        const messageData = new Uint8Array(message.data).buffer
                        const headerRangeByteCount = 2
                        const [headerStart, headerLength] = Array.from(new Uint8Array(messageData.slice(0, 2)))
                        const headerData = messageData.slice(headerStart, headerRangeByteCount + headerLength)
                        const headerPayload = headerData.slice(headerRangeByteCount, headerData.byteLength)
                        const headerString = arrayBufferToString(headerPayload)
                        const header = MessageHeader.parse(headerString)
                        const data = messageData.slice(headerLength + headerRangeByteCount)
                        debugLog('Received binary data:', header.requestId, 'StreamId:', header.streamId, 'Path:', header.path, 'Length:', data.byteLength)
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
                        debugLog('Received text data:', header.requestId, 'StreamId:', header.streamId, 'Path:', header.path, 'Body', body)
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
                                    debugLog(`Client close requestId:${requestId}`)
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
                debugLog(`开始转换：${requestId}...`)
                debugLog(`准备发送配置请求：\n${configMessage}`)
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
                            debugLog(`发送转换信息：\n${ssmlMessage}`)
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
