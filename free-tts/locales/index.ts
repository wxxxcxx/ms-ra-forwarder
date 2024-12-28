const localeMap = {
    'en': 'en',
    'zh': 'zh'
}

export type Locale = keyof typeof localeMap
export const LOCALES: Locale[] = Object.keys(localeMap) as Locale[];
export const DEFAULT_LOCALE: Locale = LOCALES[1];

