import { TTSOptionsSchema } from "@/service/tts-service";
import { useCallback, useEffect, useState } from "react";
import { openDB, IDBPDatabase } from 'idb';
import { z } from "zod";

const DB_NAME = 'tts-history-db';
const STORE_NAME = 'history';
const DB_VERSION = 1;

export const HistoryRecordSchame = z.object({
    id: z.string().uuid(),
    uri: z.string(),
    text: z.string(),
    options: TTSOptionsSchema,
    createAt: z.number()
})

export type HistoryRecord = z.infer<typeof HistoryRecordSchame>

export default function useHistory() {
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [db, setDb] = useState<IDBPDatabase | null>(null);

    // 初始化数据库
    useEffect(() => {
        const initDB = async () => {
            const db = await openDB(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    }
                },
            });
            setDb(db);
            // 加载初始数据
            const allRecords = await db.getAll(STORE_NAME);
            setHistory(allRecords.sort((a, b) => b.createAt - a.createAt));
        };

        initDB();
        return () => {
            db?.close();
        };
    }, []);

    const save = useCallback(async (data: HistoryRecord) => {
        if (!db) return;
        const record = HistoryRecordSchame.parse(data);
        await db.put(STORE_NAME, record);
        const allRecords = await db.getAll(STORE_NAME);
        setHistory(allRecords.sort((a, b) => b.createAt - a.createAt));
    }, [db]);

    const remove = useCallback(async (id: string) => {
        if (!db) return;
        await db.delete(STORE_NAME, id);
        const allRecords = await db.getAll(STORE_NAME);
        setHistory(allRecords.sort((a, b) => b.createAt - a.createAt));
    }, [db]);

    const clear = useCallback(async () => {
        if (!db) return;
        await db.clear(STORE_NAME);
        setHistory([]);
    }, [db]);

    return {
        history,
        save,
        remove,
        clear
    };
}