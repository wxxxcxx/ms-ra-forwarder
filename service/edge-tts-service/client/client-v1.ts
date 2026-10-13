import {
    CHROMIUM_FULL_VERSION,
    TRUSTED_CLIENT_TOKEN,
    EdgeTTSCore,
    type ClientOptions,
    type ConvertResult,
    type EdgeVoiceInfo,
    type EndpointConfig,
} from './base'

export { CHROMIUM_FULL_VERSION, TRUSTED_CLIENT_TOKEN }
export type { ClientOptions, ConvertResult }

const V1_CONFIG: EndpointConfig = {
    name: 'v1',
    voicesUrl: 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/voices/list?trustedclienttoken=6A5AA1D4EAFF4E9FB37E23D68491D6F4',
    wsBaseUrl: 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1',
    tokenParamName: 'TrustedClientToken',
    host: 'speech.platform.bing.com',
}

export class EdgeTTSClientV1 {
    private constructor() {
    }
    public static async voices(): Promise<EdgeVoiceInfo[]> {
        return EdgeTTSCore.voices(V1_CONFIG)
    }
    public static async convert(ssml: string, options: ClientOptions): Promise<ConvertResult> {
        return EdgeTTSCore.convert(V1_CONFIG, ssml, options)
    }
}
