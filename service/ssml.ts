import { XMLBuilder } from "fast-xml-parser";

export class SSML {
    private builder: XMLBuilder
    private text: string
    private voiceName: string
    private volume: number
    private rate: number
    private pitch: number
    constructor(text: string, voiceName: string = 'zh-CN-XiaoxiaoNeural', volume: number = 100, rate: number = 0, pitch: number = 0) {
        this.builder = new XMLBuilder({
            ignoreAttributes: false,
            attributeNamePrefix: "@",
            textNodeName: "text",
        });
        this.text = text
        this.voiceName = voiceName
        this.volume = volume
        this.rate = rate
        this.pitch = pitch
    }
    toString(): string {
        const obj = {
            "speak":
            {
                "voice":
                {
                    "prosody":
                    {
                        "text": this.text,
                        "@volume": `${this.volume}%`,
                        "@rate": `${this.rate}%`,
                        "@pitch": `${this.pitch}%`
                    },
                    "@name": this.voiceName
                },
                "@xmlns": "http://www.w3.org/2001/10/synthesis",
                "@xmlns:mstts": "http://www.w3.org/2001/mstts",
                "@xmlns:emo": "http://www.w3.org/2009/10/emotionml",
                "@version": "1.0",
                "@xml:lang": "en-US"
            }
        }
        return this.builder.build(obj)
    }
}