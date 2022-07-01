import { randomBytes } from 'crypto'
import { client as WebSocketClient, connection as Conntection } from 'websocket'
import * as log from 'log'

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

const logger = log.get('service')

export class Service {
  private ws: WebSocketClient

  private connection: Conntection | null = null

  private executorMap: Map<string, PromiseExecutor>
  private bufferMap: Map<string, Buffer>

  private timer: NodeJS.Timer | null = null

  constructor() {
    this.executorMap = new Map()
    this.bufferMap = new Map()
  }

  private async connect(): Promise<Conntection> {
    this.ws = new WebSocketClient({
      webSocketVersion: 13,
    })
    return new Promise((resolve, reject) => {
      this.ws.on('connect', (connection) => {
        connection.on('close', (code, desc) => {
          // 服务器会自动断开空闲超过30秒的连接
          this.connection = null
          if (this.timer) {
            clearTimeout(this.timer)
            this.timer = null
          }
          for (let [key, value] of this.executorMap) {
            value.reject(`连接已关闭: ${desc} ${code}`)
          }
          this.executorMap.clear()
          this.bufferMap.clear()
          logger.notice(`连接已关闭： ${desc} ${code}`)
        })

        connection.on('message', (message) => {
          let pattern = /X-RequestId:(?<id>[a-z|0-9]*)/
          if (message.type == 'utf8') {
            logger.debug('收到文本消息：', message.utf8Data)
            let data = message.utf8Data
            if (data.includes('Path:turn.start')) {
              // 开始传输

              let matches = data.match(pattern)
              let requestId = matches.groups.id
              logger.debug(`开始传输：${requestId}……`)
              this.bufferMap.set(requestId, Buffer.from([]))
            } else if (data.includes('Path:turn.end')) {
              // 结束传输
              let matches = data.match(pattern)
              let requestId = matches.groups.id
              let result = this.bufferMap.get(requestId)
              logger.debug(`传输完成：${requestId}……`)

              let executor = this.executorMap.get(matches.groups.id)
              this.executorMap.delete(matches.groups.id)
              logger.info(`剩余 ${this.executorMap.size} 个任务`)
              executor.resolve(result)
            }
          } else if (message.type == 'binary') {
            let separator = 'Path:audio\r\n'
            let contentIndex =
              message.binaryData.indexOf(separator) + separator.length

            let headers = message.binaryData.slice(0, contentIndex).toString()
            let matches = headers.match(pattern)
            let requestId = matches.groups.id

            logger.debug(`收到音频片段：${requestId}……`)

            let content = message.binaryData.slice(
              contentIndex,
              message.binaryData.length,
            )

            let buffer = this.bufferMap.get(requestId)
            buffer = Buffer.concat([buffer, content])
            this.bufferMap.set(requestId, buffer)
          }
        })

        resolve(connection)
      })
      this.ws.on('connectFailed', (error) => {
        logger.error(`连接失败： ${error}`)
        reject(`连接失败： ${error}`)
      })
      this.ws.on('httpResponse', (response, client) => {
        logger.debug('收到响应：', response.statusCode, response.statusMessage)
      })
      const connectionId = randomBytes(16).toString('hex').toLowerCase()
      let url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${connectionId}`
      this.ws.connect(
        url,
        null,
        'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        {
          'Host': 'speech.platform.bing.com',
          'Connection': 'Upgrade',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.66 Safari/537.36 Edg/103.0.1264.44',
          'Upgrade': 'websocket',
          'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
          'Sec-WebSocket-Version': '13',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cookie': 'MUID=1BE48574F82A60192B0094A0F96F61CA; SUID=M; SRCHD=AF=NOFORM; SRCHUID=V=2&GUID=695BC3605ECD4386856523A79DC456AE&dmnchg=1; USRLOC=HS=1; SRCHUSR=DOB=20220701&T=1656668571000; ABDEF=V=13&ABDV=11&MRNB=1656669297926&MRB=0; SRCHS=PC=U531; _RwBf=ilt=5&ihpd=0&ispd=5&rc=0&rb=0&gb=0&rg=0&pc=0&mtu=0&rbb=0&g=0&cid=&clo=0&v=5&l=2022-07-01T07:00:00.0000000Z&lft=20220701&aof=0&o=2&p=&c=&t=0&s=0001-01-01T00:00:00.0000000+00:00&ts=2022-07-01T10:09:02.7670532+00:00&rwred=0; _SS=SID=1BE013E40213630525CB023003566201&PC=U531&R=0&RB=0&GB=0&RG=0&RP=0; SRCHHPGUSR=SRCHLANG=en&PV=7.0.0&BRW=S&BRH=M&CW=1034&CH=752&SW=1440&SH=900&DPR=1&UTC=0&DM=0&EXLTT=5&HV=1656670143&WTS=63792265371; ipv6=hit=1656673744600&t=4',
          'Sec-WebSocket-Extensions': 'permessage-deflate; client_max_window_bits',
        }
      )
    })
  }

  public async convert(ssml: string, format: string) {
    if (this.connection == null || this.connection.connected == false) {
      logger.notice('准备连接服务器……')
      let connection = await this.connect()
      this.connection = connection
      logger.notice('连接成功！')
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
      logger.notice(`开始转换：${requestId}……`)
      logger.debug(`准备发送配置请求：${requestId}\n`, configMessage)
      this.connection.send(configMessage, (configError) => {
        if (configError) {
          logger.error(`配置请求发送失败：${requestId}\n`, configError)
        }

        // 发送SSML消息
        let ssmlMessage =
          `X-Timestamp:${Date()}\r\n` +
          `X-RequestId:${requestId}\r\n` +
          `Content-Type:application/ssml+xml\r\n` +
          `Path:ssml\r\n\r\n` +
          ssml
        logger.debug(`准备发送SSML消息：${requestId}\n`, ssmlMessage)
        this.connection.send(ssmlMessage, (ssmlError) => {
          if (ssmlError) {
            logger.error(`SSML消息发送失败：${requestId}\n`, ssmlError)
          }
        })
      })
    })
    // 收到请求，清除超时定时器
    if (this.timer) {
      logger.debug('收到新的请求，清除超时定时器')
      clearTimeout(this.timer)
    }
    // 设置定时器，超过10秒没有收到请求，主动断开连接
    logger.debug('创建新的超时定时器')
    this.timer = setTimeout(() => {
      if (this.connection && this.connection.connected) {
        logger.debug('已经 10 秒没有请求，主动关闭连接')
        this.connection.close(1000)
        this.timer = null
      }
    }, 10000)

    // 创建超时结果
    let timeout = new Promise((resolve, reject) => {
      // 如果超过 20 秒没有返回结果，则清除请求并返回超时
      setTimeout(() => {
        this.executorMap.delete(requestId)
        this.bufferMap.delete(requestId)
        reject('转换超时')
      }, 10000)
    })
    let data = await Promise.race([result, timeout])
    logger.notice(`转换完成：${requestId}`)
    return data
  }
}

export const service = new Service()
