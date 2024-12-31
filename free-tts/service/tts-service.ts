export interface Voice {
    value: string,
    label: string,
    locale: string,
    gender: string,
    format: string,
    voicePersonalities: Record<string, string>,
    contentCategories: Record<string, string>
}

export interface TTSOptions {
    voice: string;
    volume: number;
    rate: number;
    pitch: number;
    personality?: string;
}

export interface SpeechBoundary {
    text: string,
    start: number,
    end: number,
    duration: number,
    length: string,
}

export interface Speech {
    audio: ArrayBuffer,
    sentenceBoundaries: Array<SpeechBoundary>,
    wordBoundaries: Array<SpeechBoundary>
}

export interface TTSService {
    convert(text: string, options: TTSOptions): Promise<Speech>
    voices(): Promise<Array<Voice>>
}