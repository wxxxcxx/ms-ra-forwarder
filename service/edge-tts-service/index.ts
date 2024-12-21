import { EdgeTTSClient } from './client'
import { Speech, SpeechBoundary, TTSOptions, TTSService, Voice } from '../tts-service'
import { SSML } from '@/utils/ssml'


export class EdgeTTSService implements TTSService {
    async convertWithOptions(text: string, options: TTSOptions): Promise<Speech> {
        const ssml = new SSML(text, options.voice, options.volume, options.rate, options.pitch)
        return await this.convert(ssml.toString())
    }
    private async convert(ssml: string): Promise<Speech> {
        const result = await EdgeTTSClient.convert(ssml, {
            format: "audio-24khz-96kbitrate-mono-mp3",
            sentenceBoundaryEnabled: true,
            wordBoundaryEnabled: true,
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
    async voices(): Promise<Array<Voice>> {
        const data = await EdgeTTSClient.voices()
        let voices = data.map((item: any) => {
            const voice: Voice = {
                label: item['FriendlyName'],
                gender: item['Gender'],
                value: item['ShortName'],
                locale: item['Locale'],
                format: item['SuggestedCodec'],
                voicePersonalities: item['VoiceTag']['VoicePersonalities']?.reduce((acc, item) => {
                    acc[item] = item;
                    return acc;
                }, {}),
                contentCategories: item['VoiceTag']['ContentCategories']?.reduce((acc, item) => {
                    acc[item] = item;
                    return acc;
                }, {}),
            }
            return voice
        })
        return voices
    }

}
