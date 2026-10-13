import {
    EdgeTTSCore,
    type ClientOptions,
    type ConvertResult,
    type EdgeVoiceInfo,
    type EndpointConfig,
} from './base'

const V2_CONFIG: EndpointConfig = {
    name: 'v2',
    voicesUrl: 'https://api.msedgeservices.com/tts/cognitiveservices/voices/list?Ocp-Apim-Subscription-Key=6A5AA1D4EAFF4E9FB37E23D68491D6F4',
    wsBaseUrl: 'wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1',
    tokenParamName: 'Ocp-Apim-Subscription-Key',
    host: 'api.msedgeservices.com',
}

export class EdgeTTSClientV2 {
    private constructor() {
    }
    public static async voices(): Promise<EdgeVoiceInfo[]> {
        return EdgeTTSCore.voices(V2_CONFIG)
    }
    public static async convert(ssml: string, options: ClientOptions): Promise<ConvertResult> {
        return EdgeTTSCore.convert(V2_CONFIG, ssml, options)
    }
}
