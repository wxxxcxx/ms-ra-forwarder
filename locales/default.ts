export const DEFAULT_LOCALE = {
    global: {
        title: 'Free TTS',
        description: 'Free TTS is a free text-to-speech service that allows you to convert text to speech in multiple languages and voices.',
        welcome: 'Hello {name}!',
        actions: {
            confirm: 'Confirm',
            cancel: 'Cancel',
        },
        errors: {
            unknown: 'Unknown error',
            invalid_parameter: 'Invalid parameter',
            missing_parameter: 'Missing parameter',
        },
    },
    pages: {
        login: {
            title: 'Login',
            description: 'Login with your token',
            token: 'Token',
            token_description: 'Input your token to login',
            token_placeholder: 'Enter your token',
        },
    },
} as const

export type DefaultLocale = typeof DEFAULT_LOCALE
