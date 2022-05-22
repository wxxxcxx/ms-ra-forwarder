import { VercelRequest, VercelResponse } from '@vercel/node';
import { FORMAT_CONTENT_TYPE } from '../ra';
import { encode, decode } from '../base64/base64';
module.exports = async (request: VercelRequest, response: VercelResponse) => {
    let jsonstr = request.query['json'];
    let jsondatastr = decode(jsonstr.trim());
    let jsondata = JSON.parse(jsondatastr) ?? '';
    let api = decodeURIComponent(jsondata['url']) ?? '';
    let token = jsondata['token'] ?? '';
    const alldata = [];
    jsondata['ttsdata'].forEach(item =>{
        let name = decodeURIComponent(item['name']) ?? '大声朗读';
        let voiceName = item['voiceName'] ?? 'zh-CN-XiaoxiaoNeural';
        let voiceFormat = item['voiceFormat'] ?? 'audio-16khz-32kbitrate-mono-mp3';
        let styleName = item['styleName'] ?? 'normal';
        let styleDegree = item['styleDegree'] ?? 1.00;
        let speakSpeed = item['speakSpeed'] ?? 25;

        if (Array.isArray(voiceFormat)) {
            throw `Invalid format ${voiceFormat}`;
        }
        if (!FORMAT_CONTENT_TYPE.has(voiceFormat)) {
            throw `Invalid format ${voiceFormat}`;
        }
        let data = {};
        data['name'] = name == '' ? '大声朗读' : name;
        data['concurrentRate'] = '1';
        data['contentType'] = FORMAT_CONTENT_TYPE.get(voiceFormat);
        data['id'] = Date.now();
        data['loginCheckJs'] = '';
        data['loginUi'] = '';
        data['loginUrl'] = '';

        let header = {
            'Content-Type': 'text/plain',
            'Authorization': 'Bearer ' + token,
            'Format': voiceFormat
        }
        data['header'] = JSON.stringify(header);

        let ssml = '\
            <speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US">\
              <voice name="'+ voiceName + '">\
                <mstts:express-as style="'+ styleName + '" styledegree="' + styleDegree + '" >\
                  <prosody rate="{{speakSpeed + ' + speakSpeed + '}}%" pitch="0%" volume="+100%">\<lang xml:lang="zh-CN">\
                    {{String(speakText).replace(/&/g, \'&amp;\').replace(/\"/g, \'&quot;\').replace(/\'/g, \'&apos;\').replace(/</g, \'&lt;\').replace(/>/g, \'&gt;\')}}\</lang>\
                  </prosody>\
                </mstts:express-as>\
              </voice>\
            </speak>'
        let body = {
            'method': 'POST',
            'body': ssml
        }
        data['url'] = api + '/api/ra,' + JSON.stringify(body);
        alldata.push(data);
    })
    response.status(200).json(alldata);
}
