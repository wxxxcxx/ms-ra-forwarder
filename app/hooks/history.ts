import { TTSOptionsSchema } from "@/service/tts-service";
import { json } from "body-parser";
import { useLocalStorage } from "react-use";
import { string, z } from "zod";

export const HistoryRecordSchame = z.object({
    id: z.string().uuid(),
    uri: z.string(),
    text: z.string(),
    options: TTSOptionsSchema,
    createAt: z.date()
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
    function save(data: HistoryRecord) {
        const record = HistoryRecordSchame.parse(data)
        set(history => {
            if (history) {
                return [record, ...history]
            } else {
                return [record]
            }
        })
    }
    function remove(id: string) {
        set(history => {
            return history?.filter(h => h.id != id) ?? []
        })
    }

    return {
        history: history ?? [],
        save,
        remove,
        clear
    }
}