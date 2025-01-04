'use client'

import useHistory, { HistoryRecord } from "@/app/hooks/history"
import React, { createContext, useContext } from "react"

export const historyContext = createContext<{
    history: HistoryRecord[],
    saveHistoryRecord: (data: HistoryRecord) => void,
    removeHistoryRecord: (id: string) => void,
    clearHistory: () => void,
}>({
    history: [],
    saveHistoryRecord: () => {
        throw Error('un')
    },
    removeHistoryRecord: () => {
        throw Error('un')
    },
    clearHistory: () => {
        throw Error('un')
    },
})

export interface TTSContextProviderProps {
    children?: React.ReactNode
}

export function useTTSContext() {
    return useContext(historyContext)
}

export default function TTSContextProvider({ children }: TTSContextProviderProps) {
    const { history, save, remove, clear } = useHistory()
    return (
        <historyContext.Provider value={{
            history,
            saveHistoryRecord: save,
            removeHistoryRecord: remove,
            clearHistory: clear
        }}>
            {children}
        </historyContext.Provider>
    )
}