'use server'

import { EdgeTTSService } from '@/service/edge-tts-service'
import { TTSOptions } from '@/service/tts-service'

export async function fetchVoices() {
    const service = new EdgeTTSService()
    return await service.voices()
}

export async function textToSpeach(text: string, options: TTSOptions) {
    const service = new EdgeTTSService()
    return await service.convert(text, options)
}