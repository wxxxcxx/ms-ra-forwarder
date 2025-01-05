import { EdgeTTSService } from "@/service/edge-tts-service"
import { TTSOptions, TTSOptionsSchema } from "@/service/tts-service"
import { z } from "zod"

export async function GET(request: Request) {
    try {
        const authorization = request.headers.get('authorization')
        if (process.env.TOKEN && authorization !== 'Bearer ' + process.env.TOKEN) {
            return new Response('Unauthorized', { status: 401 })
        }
        const { searchParams } = new URL(request.url)
        const text = z.string({ required_error: 'Text is required' }).parse(searchParams.get('text'))
        const voice = z.string({ required_error: 'Voice is required' }).parse(searchParams.get('voice'))
        const parseNumberParam = (paramName: string, defaultValue: number, min: number, max: number) => {
            const paramValue = searchParams.get(paramName);
            if (paramValue === null || paramValue === undefined) {
                return defaultValue;
            }
            try {
                return z.number().min(min).max(max).parse(Number(paramValue));
            } catch (error) {
                console.error(`Invalid ${paramName} value: ${paramValue}`);
                throw new Error(`Invalid ${paramName} value`);
            }
        };

        const pitch = parseNumberParam('pitch', 0, -100, 100);
        const rate = parseNumberParam('rate', 0, -100, 100);
        const volume = parseNumberParam('volume', 100, -100, 100);
        const personality = searchParams.get('personality') ?? undefined;
        const format = searchParams.get('format') ?? undefined;
        const service = new EdgeTTSService()
        const options: TTSOptions = TTSOptionsSchema.parse({
            voice,
            volume,
            rate,
            pitch,
            format,
            personality,
        })
        const speech = await service.convert(text, options)
        const audioBlob = new Blob([speech.audio], { type: 'audio/mpeg' });
        return new Response(audioBlob, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } })
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
}