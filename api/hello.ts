import { VercelRequest, VercelResponse } from '@vercel/node';
module.exports = async (request: VercelRequest, response: VercelResponse) => {

    let name = request.query['name']
    const data = {
        message: `hello ${name}!`
    };
    response.status(200).json(data);
}