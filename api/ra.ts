import { Request, Response } from 'express'
import log = require('log')
import { client } from 'websocket'
import { service, FORMAT_CONTENT_TYPE } from '../ra'

module.exports = async (request: Request, response: Response) => {
  let logger = log.get('api')
  logger.debug(`请求头：${request.headers}`)
  logger.debug(`请求正文：${request.body}`)
  let token = process.env.TOKEN
  if (token) {
    let authorization = request.headers['authorization']
    if (authorization != `Bearer ${token}`) {
      logger.error('无效的TOKEN')
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
    let result = await service.convert(ssml, format)
    response.sendDate = true
    response
      .status(200)
      .setHeader('Content-Type', FORMAT_CONTENT_TYPE.get(format))
      .send(result)
  } catch (error) {
    logger.error(error)
    response.status(503).json({
      message: error,
    })
  }
}
