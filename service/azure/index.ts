import { randomBytes } from 'crypto'
import { WebSocket } from 'ws'
import axios from 'axios'
import { config } from 'process'

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

interface PromiseExecutor {
  resolve: (value?: any) => void
  reject: (reason?: any) => void
}

export class Service {
  private ws: WebSocket | null = null

  private executorMap: Map<string, PromiseExecutor>
  private bufferMap: Map<string, Buffer>

  private heartbeatTimer: NodeJS.Timer | null = null
  constructor() {
    this.executorMap = new Map()
    this.bufferMap = new Map()
  }

  private async sendHeartbeat() {
    if (this.ws && this.ws.readyState == WebSocket.OPEN) {
      const requestId = randomBytes(16).toString('hex').toLowerCase()
      console.debug(`发送心跳：${requestId}`)
      let ssml =
        '<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US"><voice name="en-US-JennyNeural"><prosody rate="0%" pitch="0%">滴答</prosody></voice></speak>'
      let ssmlMessage =
        `X-Timestamp:${Date()}\r\n` +
        `X-RequestId:${requestId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `Path:ssml\r\n\r\n` +
        ssml
      await this.ws.ping()
      await this.ws.send(ssmlMessage, (ssmlError) => {})
    }
  }

  private async connect(): Promise<WebSocket> {
    const connectionId = randomBytes(16).toString('hex').toUpperCase()
    let url = `wss://eastus.api.speech.microsoft.com/cognitiveservices/websocket/v1?TrafficType=AzureDemo&X-ConnectionId=${connectionId}`
    let ws = new WebSocket(url, {
      host: 'eastus.tts.speech.microsoft.com',
      origin: 'https://azure.microsoft.com',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.66 Safari/537.36 Edg/103.0.1264.44',
      },
    })
    return new Promise((resolve, reject) => {
      ws.on('open', () => {
        resolve(ws)
      })
      ws.on('close', (code, reason) => {
        // 服务器会自动断开空闲的连接
        this.ws = null
        if (this.heartbeatTimer) {
          clearTimeout(this.heartbeatTimer)
          this.heartbeatTimer = null
        }
        for (let [key, value] of this.executorMap) {
          value.reject(`连接已关闭: ${reason} ${code}`)
        }
        this.executorMap.clear()
        this.bufferMap.clear()
        console.info(`连接已关闭： ${reason} ${code}`)
      })

      ws.on('message', (message, isBinary) => {
        let pattern = /X-RequestId:(?<id>[a-z|0-9]*)/
        if (!isBinary) {
          console.debug('收到文本消息：%s', message)
          let data = message.toString()
          if (data.includes('Path:turn.start')) {
            // 开始传输
            let matches = data.match(pattern)
            let requestId = matches.groups.id
            console.debug(`开始传输：${requestId}……`)
            this.bufferMap.set(requestId, Buffer.from([]))
          } else if (data.includes('Path:turn.end')) {
            // 结束传输
            let matches = data.match(pattern)
            let requestId = matches.groups.id

            let executor = this.executorMap.get(requestId)
            if (executor) {
              this.executorMap.delete(matches.groups.id)
              let result = this.bufferMap.get(requestId)
              executor.resolve(result)
            }
            console.debug(`传输完成：${requestId}`)
          }
        } else if (isBinary) {
          let separator = 'Path:audio\r\n'
          let data = message as Buffer
          let contentIndex = data.indexOf(separator) + separator.length

          let headers = data.slice(2, contentIndex).toString()
          let matches = headers.match(pattern)
          let requestId = matches.groups.id

          let content = data.slice(contentIndex)

          console.debug(
            `收到音频片段：${requestId} Length: ${content.length}\n${headers}`,
          )
          let buffer = this.bufferMap.get(requestId)
          if (buffer) {
            buffer = Buffer.concat([buffer, content])
            this.bufferMap.set(requestId, buffer)
            console.debug(`保存片段：${requestId}`)
          } else {
            console.debug(`忽略片段：${requestId}`)
          }
        }
      })
      ws.on('error', (error) => {
        console.log(error)
        console.error(`连接失败： ${error}`)
        reject(`连接失败： ${error}`)
      })
      ws.on('ping', (data) => {
        console.debug('received ping %s', data)
        ws.pong(data)
        console.debug('sent pong %s', data)
      })
      ws.on('pong', (data) => {
        console.debug('received pong %s', data)
      })
    })
  }

  public async convert(ssml: string, format: string) {
    if (this.ws == null || this.ws.readyState != WebSocket.OPEN) {
      console.info('准备连接服务器……')
      let connection = await this.connect()
      this.ws = connection
      console.info('连接成功！')
    }
    const requestId = randomBytes(16).toString('hex').toLowerCase()
    let result = new Promise((resolve, reject) => {
      // 等待服务器返回后这个方法才会返回结果
      this.executorMap.set(requestId, {
        resolve,
        reject,
      })
      // 发送配置消息
      let configData = {
        context: {
          synthesis: {
            audio: {
              metadataoptions: {
                sentenceBoundaryEnabled: 'false',
                wordBoundaryEnabled: 'false',
              },
              outputFormat: format,
            },
          },
        },
      }
      let configMessage =
        `X-Timestamp:${Date()}\r\n` +
        'Content-Type:application/json; charset=utf-8\r\n' +
        'Path:speech.config\r\n\r\n' +
        JSON.stringify(configData)
      console.info(`开始转换：${requestId}……`)
      console.debug(`准备发送配置请求：${requestId}\n`, configMessage)
      this.ws.send(configMessage, (configError) => {
        if (configError) {
          console.error(`配置请求发送失败：${requestId}\n`, configError)
        }

        // 发送SSML消息
        let ssmlMessage =
          `X-Timestamp:${Date()}\r\n` +
          `X-RequestId:${requestId}\r\n` +
          `Content-Type:application/ssml+xml\r\n` +
          `Path:ssml\r\n\r\n` +
          ssml
        console.debug(`准备发送SSML消息：${requestId}\n`, ssmlMessage)
        this.ws.send(ssmlMessage, (ssmlError) => {
          if (ssmlError) {
            console.error(`SSML消息发送失败：${requestId}\n`, ssmlError)
          }
        })
      })
    })

    // 收到请求，清除超时定时器
    if (this.heartbeatTimer) {
      console.debug('收到新的请求，清除超时定时器')
      clearTimeout(this.heartbeatTimer)
    }
    // 设置定时器，超过10秒没有收到请求，发送一个请求以维持连接。
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat()
    }, 10000)

    let data = await Promise.race([
      result,
      new Promise((resolve, reject) => {
        // 如果超过 60 秒没有返回结果，则清除请求并返回超时
        setTimeout(() => {
          this.executorMap.delete(requestId)
          this.bufferMap.delete(requestId)
          reject('转换超时')
        }, 60000)
      }),
    ])
    console.info(`转换完成：${requestId}`)
    console.info(`剩余 ${this.executorMap.size} 个任务`)
    return data
  }
}

export const service = new Service()
