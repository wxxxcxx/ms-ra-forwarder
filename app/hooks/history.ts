import { TTSOptionsSchema } from "@/service/tts-service";
import { useCallback, useEffect, useRef, useState } from "react";
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
    // const [db, setDb] = useState<IDBPDatabase | null>(null);
    const dbRef = useRef<IDBPDatabase | null>(null)

    // 初始化数据库
    useEffect(() => {
        const initDB = async () => {
            const newDb = await openDB(DB_NAME, DB_VERSION, {
                upgrade(db) {
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                    }
                },
            });
            // setDb(newDb);
            dbRef.current = newDb
            // 加载初始数据
            const allRecords = await newDb.getAll(STORE_NAME);
            setHistory(allRecords.sort((a, b) => b.createAt - a.createAt));
        };

        initDB();
        return () => {
            dbRef.current?.close();
        };
    }, []);

    const save = useCallback(async (data: HistoryRecord) => {
        if (!dbRef.current) return;
        const record = HistoryRecordSchame.parse(data);
        await dbRef.current.put(STORE_NAME, record);
        const allRecords = await dbRef.current.getAll(STORE_NAME);
        setHistory(allRecords.sort((a, b) => b.createAt - a.createAt));
    }, []);

    const remove = useCallback(async (id: string) => {
        if (!dbRef.current) return;
        await dbRef.current.delete(STORE_NAME, id);
        const allRecords = await dbRef.current.getAll(STORE_NAME);
        setHistory(allRecords.sort((a, b) => b.createAt - a.createAt));
    }, []);

    const clear = useCallback(async () => {
        if (!dbRef.current) return;
        await dbRef.current.clear(STORE_NAME);
        setHistory([]);
    }, []);

    return {
        history,
        save,
        remove,
        clear
    };
}