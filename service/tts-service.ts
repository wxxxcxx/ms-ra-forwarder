import { z } from "zod";

export const VoiceSchema = z.object({
    value: z.string(),
    label: z.string(),
    locale: z.string(),
    gender: z.string(),
    format: z.string(),
    personalities: z.array(z.string()),
})

export type Voice = z.infer<typeof VoiceSchema>

export const TTSOptionsSchema = z.object({
    voice: z.string({ message: 'Voice is required' }),
    volume: z.number().min(-100).max(100).default(0),
    rate: z.number().min(-100).max(100).default(0),
    pitch: z.number().min(-100).max(100).default(0),
    personality: z.string().optional(),
})

export type TTSOptions = z.infer<typeof TTSOptionsSchema>

export const SpeechBoundarySchema = z.object({
    text: z.string(),
    start: z.number(),
    end: z.number(),
    duration: z.number(),
    length: z.string(),
})

export type SpeechBoundary = z.infer<typeof SpeechBoundarySchema>

export const SpeechSchema = z.object({
    audio: z.instanceof(ArrayBuffer),
    sentenceBoundaries: z.array(SpeechBoundarySchema),
    wordBoundaries: z.array(SpeechBoundarySchema)
})

export type Speech = z.infer<typeof SpeechSchema>

export interface TTSService {
    convert(text: string, options: TTSOptions): Promise<Speech>
    fetchVoices(): Promise<Array<Voice>>
}