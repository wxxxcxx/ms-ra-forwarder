export async function GET(request: Request) {
    try {
        // get query
        const { searchParams } = new URL(request.url)
        const queryString = Array.from(searchParams.entries()).reduce((acc, [key, value]) => {
            acc += `${key}=${value}&`
            return acc
        }, "")
        const protocol = request.headers.get('referer')?.startsWith('https') ? 'https' : 'http'
        const host = request.headers.get('host')
        const apiUrl = `${protocol}://${host}/api/text-to-speech`
        const ttsUrl = `${apiUrl}?${encodeURIComponent(queryString)}&text=${encodeURIComponent("{{java.encodeURI(speakText)}}")}`
        const data = {
            name: 'TTS',
            contentType: 'audio/mpeg',
            id: Date.now(),
            loginCheckJs: '',
            loginUi: '',
            loginUrl: '',
            url:ttsUrl
        }
        return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
    } catch (error) {
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
    }
}