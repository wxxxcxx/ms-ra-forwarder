import { Request, Response } from 'express'
import { FORMAT_CONTENT_TYPE } from '../service/edge'
module.exports = async (request: Request, response: Response) => {
  console.log('Import url: ' + request.url)
  let api = request.query['api']
  let name = request.query['name'] ?? '大声朗读'
  let voiceName = request.query['voiceName'] ?? 'zh-CN-XiaoxiaoNeural'
  let styleName = request.query['styleName']
  let styleDegree = request.query['styleDegree']
  let voiceFormat = request.query['voiceFormat']
  let lexicon = request.query['lexicon'] ?? ''
  let token = request.query['token'] ?? ''

  if (Array.isArray(voiceFormat)) {
    throw `Invalid format ${voiceFormat}`
  }
  if (!FORMAT_CONTENT_TYPE.has(voiceFormat as string)) {
    throw `Invalid format ${voiceFormat}`
  }

  const data = {}
  data['name'] = name == '' ? 'TTS' : name
  data['contentType'] = FORMAT_CONTENT_TYPE.get(voiceFormat as string)
  data['id'] = Date.now()
  data['loginCheckJs'] = ''
  data['loginUi'] = ''
  data['loginUrl'] = ''

  let header = {
    'Content-Type': 'text/plain',
    Authorization: 'Bearer ' + token,
    Format: voiceFormat,
  }
  data['header'] = JSON.stringify(header)
  let ssml =
    `<speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US">` +
    `<voice name="${voiceName}">` +
    (lexicon === '' ? '' : `<lexicon uri="${lexicon}"/>`) +
    (styleName
      ? `<mstts:express-as style="${styleName}" styledegree="${styleDegree}">`
      : ``) +
    `<prosody rate="{{(speakSpeed - 10) * 2}}%" pitch="+0Hz">` +
    `{{String(speakText).replace(/&/g, '&amp;').replace(/\"/g, '&quot;').replace(/'/g, '&apos;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}}` +
    `</prosody>` +
    (styleName ? ` </mstts:express-as>` : ``) +
    `</voice>` +
    `</speak>`
  let body = {
    method: 'POST',
    body: ssml,
  }

  data['url'] = api + ',' + JSON.stringify(body)
  response.status(200).json(data)
}
