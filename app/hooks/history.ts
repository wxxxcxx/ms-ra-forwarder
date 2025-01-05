import { TTSOptionsSchema } from "@/service/tts-service";
import { useCallback } from "react";
import { useLocalStorage } from "react-use";
import { z } from "zod";

export const HistoryRecordSchame = z.object({
    id: z.string().uuid(),
    uri: z.string(),
    text: z.string(),
    options: TTSOptionsSchema,
    createAt: z.number()
})

export type HistoryRecord = z.infer<typeof HistoryRecordSchame>

export default function useHistory() {
    const [history, set, clear] = useLocalStorage<HistoryRecord[]>('tts-history', [], {
        raw: false,
        serializer(value) {
            return JSON.stringify(value)
        },
        deserializer(value) {
            try {
                const list = JSON.parse(value)
                if (Array.isArray(list)) {
                    return list.slice(0, 50).map(item => {
                        return HistoryRecordSchame.parse(item)
                    })
                } else {
                    return []
                }
            } catch (error) {
                return []
            }
        },
    })

    const save = useCallback((data: HistoryRecord) => {
        const record = HistoryRecordSchame.parse(data)
        if (history) {
            set([record, ...history])
        } else {
            set([record])
        }
    }, [set, history])
    const remove = useCallback((id: string) => {
        set(history?.filter(h => h.id != id) ?? [])
    }, [set, history])

    return {
        history: history ?? [],
        save,
        remove,
        clear
    }
}