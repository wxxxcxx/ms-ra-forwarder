// locales/server.ts
import 'server-only'
import { createI18nServer } from 'next-international/server'

export const { getI18n: getTranslation, getScopedI18n: getScopedTranslation, getCurrentLocale, getStaticParams } = createI18nServer({
    'en': () => import('./en'),
    'zh': () => import('./zh')
})