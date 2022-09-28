import { Request, Response } from 'express'
import { retry } from '../retry'
import { service, FORMAT_CONTENT_TYPE } from '../service/edge'

module.exports = async (request: Request, response: Response) => {
  console.debug(`请求正文：${request.body}`)
  let token = process.env.TOKEN
  if (token) {
    let authorization = request.headers['authorization']
    if (authorization != `Bearer ${token}`) {
      console.error('无效的TOKEN')
      response.status(401).json('无效的TOKEN')
      return
    }
  }

  try {
    let format = request.headers['format'] || 'audio-16khz-32kbitrate-mono-mp3'
    if (Array.isArray(format)) {
      throw `无效的音频格式：${format}`
    }
    if (!FORMAT_CONTENT_TYPE.has(format)) {
      throw `无效的音频格式：${format}`
    }

    let ssml = request.body
    if (ssml == null) {
      throw `转换参数无效`
    }
    let result = await retry(
      async () => {
        let result = await service.convert(ssml, format as string)
        return result
      },
      3,
      (index, error) => {
        console.warn(`第${index}次转换失败：${error}`)
      },
      '服务器多次尝试后转换失败',
    )
    response.sendDate = true
    response
      .status(200)
      .setHeader('Content-Type', FORMAT_CONTENT_TYPE.get(format))
    response.end(result)
  } catch (error) {
    console.error(`发生错误, ${error.message}`)
    response.status(503).json(error)
  }
}
