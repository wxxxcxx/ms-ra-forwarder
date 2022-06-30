import { Request, Response } from 'express';
import { convert, FORMAT_CONTENT_TYPE } from '../ra';


module.exports = async (request: Request, response: Response) => {

    let token = process.env.TOKEN;
    if (token) {
        let authorization = request.headers['authorization'];
        console.log('verify token...', authorization);
        if (authorization != `Bearer ${token}`) {
            console.error('Invalid token');
            response.status(401).json('Invalid token');
            return;
        }
    }

    try {

        let format = request.headers['format'] || 'audio-16khz-32kbitrate-mono-mp3';
        if (Array.isArray(format)) {
            throw `Invalid format ${format}`;
        }
        if (!FORMAT_CONTENT_TYPE.has(format)) {
            throw `Invalid format ${format}`;
        }
        console.log(request.body);
        let ssml = request.body;
        if (ssml == null) {
            throw `Invalid ssml: ${ssml}`;
        }
        let result = await convert(ssml, format);
        response.sendDate = true;
        response.status(200)
            .setHeader('Content-Type', FORMAT_CONTENT_TYPE.get(format))
            .send(result);
    } catch (error) {
        console.error(error);
        response.status(503)
            .json(error);
    }

}