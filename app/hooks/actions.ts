import { useMutation, useQuery } from "@tanstack/react-query";
import { listVoices, listLocales, textToSpeach } from "../actions/tts";
import { TTSOptions } from "@/service/tts-service";

export function useVoices(locale?: string) {
    return useQuery({
        queryKey: ['list-voices', locale],
        queryFn: () => listVoices(locale),
    })
}

export function useVoiceLocale(voice: string) {
    const { data: voices } = useVoices()
    return voices?.find(v => v.value === voice)?.locale
}

export function useVoice(voice: string) {
    const { data: voices } = useVoices()
    return voices?.find(v => v.value === voice)
}

export function useLocales() {
    return useQuery({
        queryKey: ['list-locales'],
        queryFn: listLocales,
    })
}

export function useTextToSpeach() {
    return useMutation({
        mutationFn: async ({ text, options }: { text: string, options: TTSOptions }) => { return await textToSpeach(text, options) },
    })
}
