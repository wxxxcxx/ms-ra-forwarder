import { VercelRequest, VercelResponse } from '@vercel/node';
module.exports = async (request: VercelRequest, response: VercelResponse) => {
    console.log(request.headers);
    let api = request.query['api'];
    let voiceName = request.query['voiceName'] ?? 'zh-CN-XiaoxiaoNeural';
    let styleName = request.query['styleName'] ?? 'normal';
    let styleDegree = request.query['styleDegree'] ?? 1.00;
    let token = request.query['token'] ?? '';
    const data = {};
    data['concurrentRate'] = '1';
    data['contentType'] = 'audio/mpeg';
    data['id'] = Date.now();
    data['loginCheckJs'] = '';
    data['loginUi'] = '';
    data['loginUrl'] = '';
    data['name'] = '大声朗读';

    let header = {
        'Content-Type': 'text/plain',
        'Authorization': 'Bearer ' + token
    }
    data['header'] = JSON.stringify(header);

    let ssml = '\
        <speak xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xmlns:emo="http://www.w3.org/2009/10/emotionml" version="1.0" xml:lang="en-US">\
          <voice name="'+ voiceName + '">\
            <mstts:express-as style="'+ styleName + '" styledegree="' + styleDegree + '" >\
              <prosody rate="{{speakSpeed * 2}}%" pitch="0%">\
                {{String(speakText).replace(/&/g, \'&amp;\').replace(/\"/g, \'&quot;\').replace(/\'/g, \'apos;\').replace(/</g, \'&lt;\').replace(/>/g, \'&gt;\')}}\
              </prosody>\
            </mstts:express-as>\
          </voice>\
        </speak>'
    let body = {
        'method': 'POST',
        'body': ssml
    }
    data['url'] = api + ',' + JSON.stringify(body);
    response.status(200).json(data);
}
