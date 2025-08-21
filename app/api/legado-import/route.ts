export async function GET(request: Request) {
    try {
        const requiredToken = process.env.MS_RA_FORWARDER_TOKEN || process.env.TOKEN
        const { searchParams } = new URL(request.url)
        const token = searchParams.get('token')
        // 如果设置了环境变量，则需要验证token
        if (requiredToken) {
            if (!token || token !== requiredToken) {
                return new Response('Unauthorized', { status: 401 })
            }
        }
        // get query

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
        const volume = parseNumberParam('volume', 100, -100, 100);
        const personality = searchParams.get('personality') ?? undefined;
        const options = {
            voice,
            volume,
            pitch,
            personality,
        }
        let queryString = Object.entries(options).map(([key, value]) => {
            return `${key}=${value}`
        }).join('&')
        queryString = `${queryString}&rate={{(speakSpeed - 10) * 2}}`
        const protocol = searchParams.get('protocol') || 'http';
        const host = request.headers.get('host')
        const baseUrl = `${protocol}://${host}/api/text-to-speech`
        const apiUrl = `${baseUrl}?${queryString}&text={{java.encodeURI(speakText)}}`
        const header = {
            Authorization: 'Bearer ' + requiredToken,
        }
        const data = {
            name: voice,
            contentType: 'audio/mpeg',
            id: Date.now(),
            loginCheckJs: '',
            loginUi: '',
            loginUrl: '',
            url: apiUrl,
            header: JSON.stringify(header)
        }
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
}