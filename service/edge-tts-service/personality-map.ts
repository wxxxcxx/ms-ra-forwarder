const personalityMap = new Map<string, string>([
    ["Friendly", "友好"],
    ["Positive", "乐观"],
    ["Warm", "温暖"],
    ["Lively", "活跃"],
    ["Passion", "热情"],
    ["Sunshine", "阳光"],
    ["Humorious", "幽默"],
])

export function getFirendlyPersonalityName(key?: string) {
    if (!key) {
        return "默认"
    }
    const value = personalityMap.get(key);
    if (value) {
        return value
    }
    return key
}