import { randomBytes } from 'crypto'
import { WebSocket } from 'ws'

const connectionId = randomBytes(16).toString('hex').toLowerCase()
let url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${connectionId}`
const ws = new WebSocket(url)

ws.on('open', function open() {
  let configData = {
    context: {
      synthesis: {
        audio: {
          metadataoptions: {
            sentenceBoundaryEnabled: 'false',
            wordBoundaryEnabled: 'false',
          },
          outputFormat: 'webm-24khz-16bit-mono-opus',
        },
      },
    },
  }
  let configMessage =
    `X-Timestamp:${Date()}\r\n` +
    'Content-Type:application/json; charset=utf-8\r\n' +
    'Path:speech.config\r\n\r\n' +
    JSON.stringify(configData)
  ws.send(configMessage)
  console.log('send config')
const requestId = randomBytes(16).toString('hex').toLowerCase()
  let ssmlMessage =
    `X-Timestamp:${Date()}\r\n` +
    `X-RequestId:${requestId}\r\n` +
    `Content-Type:application/ssml+xml\r\n` +
    `Path:ssml\r\n\r\n` +
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><voice  name='Microsoft Server Speech Text to Speech Voice (en-US, AriaNeural)'><prosody pitch='+0Hz' rate ='+0%' volume='+0%'> MSDN Platforms</prosody></voice></speak>`
  ws.send(ssmlMessage)
  console.log('send ssml')
})

ws.on('message', function message(data) {
  console.log('received: %s', data)
})
