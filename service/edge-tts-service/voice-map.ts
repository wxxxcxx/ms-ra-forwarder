const voiceMap = new Map<string, string>([
    ["zh-HK-HiuGaaiNeural", "曉佳"],
    ["zh-HK-HiuMaanNeural", "曉曼"],
    ["zh-HK-WanLungNeural", "雲龍"],
    ["zh-CN-XiaoxiaoNeural", "晓晓"],
    ["zh-CN-XiaoyiNeural", "晓伊"],
    ["zh-CN-YunjianNeural", "云健"],
    ["zh-CN-YunxiNeural", "云希"],
    ["zh-CN-YunxiaNeural", "云夏"],
    ["zh-CN-YunyangNeural", "云扬"],
    ["zh-CN-liaoning-XiaobeiNeural", "晓北"],
    ["zh-TW-HsiaoChenNeural", "曉臻"],
    ["zh-TW-YunJheNeural", "雲哲"],
    ["zh-TW-HsiaoYuNeural", "曉雨"],
    ["zh-CN-shaanxi-XiaoniNeural", "晓妮"]
])

export function getFriendlyVoiceName(key: string, defaultName: string) {
    if (voiceMap.has(key)) {
        return voiceMap.get(key)!
    }
    const items = defaultName.split("-")
    if (items.length != 2) {
        return defaultName
    } else {
        const name = items[0].trim()
        return name
    }
}