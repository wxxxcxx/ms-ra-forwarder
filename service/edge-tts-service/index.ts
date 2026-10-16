import { EdgeTTSClient } from './client'
import { Speech, SpeechBoundary, TTSOptions, TTSService, Voice } from '../tts-service'
import { SSML } from '../ssml'
import { hasSpeakableText, silentMp3Audio } from '../silence'


export class EdgeTTSService implements TTSService {

    async convert(text: string, options: TTSOptions): Promise<Speech> {
        const ssml = new SSML(text, options.voice, options.volume, options.rate, options.pitch)
        const speech = await this.convertSSML(ssml.toString())
        if (speech.audio.byteLength > 0) {
            return speech
        }
        // 微软对"没有可朗读内容"的文本（纯标点/空白/符号）会返回 turn.end 但不带音频数据。
        // 直接回空响应体客户端会当成坏文件并记为一次错误，这里补一段静音音频。
        if (!hasSpeakableText(text)) {
            console.warn(`[edge-tts] 文本无可朗读内容，返回静音音频: ${JSON.stringify(text.slice(0, 20))}`)
            return { ...speech, audio: silentMp3Audio() }
        }
        throw new Error('上游未返回音频数据')
    }
    private async convertSSML(ssml: string): Promise<Speech> {
        const result = await EdgeTTSClient.convert(ssml, {
            format: "audio-24khz-96kbitrate-mono-mp3",
            sentenceBoundaryEnabled: false,
            wordBoundaryEnabled: false,
        })
        const sentenceBoundaries = result.metadata.filter(data => {
            return data["Type"] === "SentenceBoundary"
        }).map(data => {
            const sb: SpeechBoundary = {
                start: data["Data"]["Offset"] / 10000,
                end: data["Data"]["Offset"] / 10000 + data["Data"]["Duration"] / 10000,
                duration: data["Data"]["Duration"] / 10000,
                text: data["Data"]["text"]["Text"],
                length: data["Data"]["text"]["Length"],
            }
            return sb
        })
        const wordBoundaries = result.metadata.filter(data => {
            return data["Type"] === "WordBoundary"
        }).map(data => {
            const sb: SpeechBoundary = {
                start: data["Data"]["Offset"] / 10000,
                end: data["Data"]["Offset"] / 10000 + data["Data"]["Duration"] / 10000,
                duration: data["Data"]["Duration"] / 10000,
                text: data["Data"]["text"]["Text"],
                length: data["Data"]["text"]["Length"],
            }
            return sb
        })
        return {
            audio: result.audio,
            sentenceBoundaries: sentenceBoundaries,
            wordBoundaries: wordBoundaries
        }
    }
    async fetchVoices(): Promise<Array<Voice>> {
        const data = await EdgeTTSClient.voices()
        let voices = data.map((item: any) => {
            const voice: Voice = {
                label: item['FriendlyName'],
                gender: item['Gender'],
                value: item['Name'],
                locale: item['Locale'],
                format: item['SuggestedCodec'],
                personalities: item['VoiceTag']['VoicePersonalities']?.map((item: string) => {
                    return item
                }),

            }
            return voice
        })
        return voices
    }

}
