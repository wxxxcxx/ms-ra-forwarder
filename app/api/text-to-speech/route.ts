import { EdgeTTSService } from "@/service/edge-tts-service"
import { TTSOptions } from "@/service/tts-service"
Error.stackTraceLimit = Infinity;
export async function GET(request: Request) {
    try {
        const authorization = request.headers.get('authorization')
        const requiredToken = process.env.MS_RA_FORWARDER_TOKEN || process.env.TOKEN

        // 如果设置了环境变量，则需要验证token
        if (requiredToken) {
            if (!authorization || authorization !== 'Bearer ' + requiredToken) {
                return new Response('Unauthorized', { status: 401 })
            }
        }
        const { searchParams } = new URL(request.url)
        const text = String(searchParams.get('text') ?? '')
        if (!text) {
            return new Response(JSON.stringify({ error: 'Text is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
        }
        const voice = String(searchParams.get('voice') ?? '')
        if (!voice) {
            return new Response(JSON.stringify({ error: 'Voice is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } })
        }
        const parseNumberParam = (paramName: string, defaultValue: number, min: number, max: number) => {
            const paramValue = searchParams.get(paramName);
            if (paramValue === null || paramValue === undefined) {
                return defaultValue;
            }
            try {
                const num = Number(paramValue)
                if (Number.isNaN(num)) throw new Error('NaN')
                if (num < min || num > max) throw new Error('out of range')
                return num
            } catch {
                console.error(`Invalid ${paramName} value: ${paramValue}`);
                throw new Error(`Invalid ${paramName} value`);
            }
        };

        const pitch = parseNumberParam('pitch', 0, -100, 100);
        const rate = parseNumberParam('rate', 0, -100, 100);
        const volume = parseNumberParam('volume', 100, -100, 100);
        const personality = searchParams.get('personality') ?? undefined;
        const service = new EdgeTTSService()
        const options: TTSOptions = {
            voice,
            volume,
            rate,
            pitch,
            personality,
        }
        const speech = await service.convert(text, options)
        const audioBlob = new Blob([speech.audio], { type: 'audio/mpeg' });
        return new Response(audioBlob, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } })
    } catch (error) {
        console.log('textToSpeach error', error)
        console.log("Full stack", (error as Error).stack)
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
}