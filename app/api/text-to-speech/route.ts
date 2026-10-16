import { EdgeTTSService } from "@/service/edge-tts-service"
import { TTSOptions } from "@/service/tts-service"
Error.stackTraceLimit = Infinity;
/** 日志里只保留文本前若干字符，便于对账又避免写满日志。 */
function textPreview(text: string, length = 20): string {
    return JSON.stringify(text.length > length ? `${text.slice(0, length)}…` : text)
}

export async function GET(request: Request) {
    const startedAt = Date.now()
    let requestSummary = ''
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
        const userAgent = (request.headers.get('user-agent') ?? '').slice(0, 60)
        requestSummary = `voice=${voice} rate=${rate} chars=${text.length} ua=${JSON.stringify(userAgent)} text=${textPreview(text)}`
        const speech = await service.convert(text, options)
        console.log(`[tts] ok ${requestSummary} bytes=${speech.audio.byteLength} ms=${Date.now() - startedAt}`)
        const audioBlob = new Blob([speech.audio], { type: 'audio/mpeg' });
        return new Response(audioBlob, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } })
    } catch (error) {
        const message = (error as Error).message
        console.error(`[tts] fail ${requestSummary} ms=${Date.now() - startedAt} error=${message}`)
        // 构建期 Next 会探测路由是否可静态化，这类"错误"不是真实故障，不打堆栈免得淹没日志。
        if (!message.startsWith('Dynamic server usage')) {
            console.error("Full stack", (error as Error).stack)
        }
        return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
}