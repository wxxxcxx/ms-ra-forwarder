// locales/client.ts
"use client"
import { createI18nClient } from 'next-international/client'

export const { useI18n: useTranslation, useScopedI18n: useScopedTranslation, I18nProviderClient: TranslationProviderClient, useCurrentLocale, useChangeLocale } = createI18nClient({
    'en': () => import('./en'),
    'zh': () => import('./zh')
})

