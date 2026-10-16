/**
 * Sec-MS-GEC 令牌生成（Edge 朗读接口的 DRM 令牌）。
 *
 * 微软已把令牌格式升级为 `Sec-MS-GEC-Version: 2-<chromium 版本>`：
 * 令牌值形如 `<16 位 cs64>-<64 位 sha256>`，两份摘要都由定制算法算出。
 * 旧格式（纯 sha256 + `1-` 前缀）现在只有 api.msedgeservices.com 还接受，
 * speech.platform.bing.com 会直接返回 403。
 *
 * 本文件是 edge-tts(python) drm.py 的移植，行为一致性与 python 实现逐一比对验证。
 */

/** Windows FILETIME 纪元到 Unix 纪元的秒数差。 */
const WIN_EPOCH = 11644473600
/** 令牌按 5 分钟对齐。 */
const TIME_WINDOW_SECONDS = 300

const SHA256_INITIAL = [
    0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A,
    0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19,
] as const
const SHA256_STATE = [
    0xFD9FBEA2, 0x91243CE7, 0xBE499094, 0xCD2E1E0A,
    0x6C006F49, 0x04BD35AB, 0xFEB0A7E4, 0x03EFFBD2,
] as const
const SHA256_SCHEDULE = [
    0xEB24BF9E, 0x1558691F, 0xA0C09EE2, 0x0CFA32BA,
    0xA622EE8C, 0xD1DD9491, 0xC0DD25A0, 0xF9E70AB6,
    0xF0C31573, 0x7058CE4E, 0x7188E606, 0x00E5AB33,
    0xD258B060, 0x72766564,
] as const
const SHA256_ROUND_CONSTANTS = [
    0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5,
    0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5,
    0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
    0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174,
    0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC,
    0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
    0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7,
    0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967,
    0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
    0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85,
    0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3,
    0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
    0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5,
    0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3,
    0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
    0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2,
] as const
const SHA256_ADJUSTMENT = 0xC9DC06A7
const SHA256_BLOCK_CONSTANTS = [
    ...SHA256_ROUND_CONSTANTS.slice(0, 14), SHA256_ADJUSTMENT, ...SHA256_ROUND_CONSTANTS.slice(15),
] as const
const SHA256_SIGMA0_ADJUSTMENT = 0x059C0B80
const SHA256_SIGMA1_ADJUSTMENT = 0x000B92C0

const CS64_COEFFICIENTS = [
    [0xE82E91B1, 0xB32700D0], [0x44DE24C6, 0x88DFF51D], [0x3BEB65BC, 0x29514038],
    [0xC89C5933, 0xB328CBDF], [0x8D1EC211, 0xD405B4D5], [0x314EF5D5, 0x26E55F3C],
    [0xE92491B1, 0x607801C6], [0xF0A5B9D5, 0x82B2C1FB], [0x06064CF3, 0xFA51A3DA],
    [0xDA79FA60, 0x207CC464], [0xBED20560, 0x3C3C74F3], [0x89F9C9F8, 0xD2D14B61],
    [0x35FA38C6, 0xBB04A2C1], [0xCB49E3C6, 0xC5626167],
] as const
const CS64_FACTOR = 0x82893933
const CS64_ADJUSTMENT0 = 0xF2F90B1A
const CS64_ADJUSTMENT1 = 0x0B1A0000

/** 32 位取模乘法。 */
function mul32(a: number, b: number): number {
    return Math.imul(a, b) >>> 0
}

/** 32 位循环左移 16 位。 */
function rol16(value: number): number {
    return ((value << 16) | (value >>> 16)) >>> 0
}

/** 32 位字节序翻转。 */
function bswap32(value: number): number {
    return (((value & 0xff) << 24) | ((value & 0xff00) << 8) | ((value >>> 8) & 0xff00) | (value >>> 24)) >>> 0
}

/** 32 位循环右移。 */
function rotr32(value: number, bits: number): number {
    return ((value >>> bits) | (value << (32 - bits))) >>> 0
}

/** SHA-256 小 sigma0。只保留低 32 位，调用方随后都会取模。 */
function sigma0(value: number): number {
    return ((value >>> 7) ^ (value << 25) ^ (value >>> 18) ^ (value << 14) ^ (value >>> 3)) >>> 0
}

/** SHA-256 小 sigma1。只保留低 32 位，调用方随后都会取模。 */
function sigma1(value: number): number {
    return ((value >>> 17) ^ (value << 15) ^ (value >>> 19) ^ (value << 13) ^ (value >>> 10)) >>> 0
}

/** 展开 SHA-256 消息调度表。 */
function expandSha256Schedule(words: number[], firstWord = 16): void {
    for (let index = firstWord; index < 64; index++) {
        const x = words[index - 2]
        const y = words[index - 15]
        words.push((sigma1(x) + words[index - 7] + sigma0(y) + words[index - 16]) >>> 0)
    }
}

/** 执行 SHA-256 轮函数。 */
function sha256Rounds(state: readonly number[], words: readonly number[], firstRound = 0): number[] {
    const constants = firstRound === 14 ? SHA256_BLOCK_CONSTANTS : SHA256_ROUND_CONSTANTS
    let a = state[0], b = state[1], c = state[2], d = state[3]
    let e = state[4], f = state[5], g = state[6], h = state[7]
    for (let index = firstRound; index < 64; index++) {
        const t1 = (h + ((rotr32(e, 6) ^ rotr32(e, 11) ^ rotr32(e, 25)) >>> 0)
            + (g ^ (e & (f ^ g))) + constants[index] + words[index]) >>> 0
        const t2 = (((rotr32(a, 2) ^ rotr32(a, 13) ^ rotr32(a, 22)) >>> 0) + ((a & b) | (c & (a | b)))) >>> 0
        h = g; g = f; f = e; e = (d + t1) >>> 0
        d = c; c = b; b = a; a = (t1 + t2) >>> 0
    }
    return [a, b, c, d, e, f, g, h]
}

/** 按 token salt（前 7 字节）计算初始哈希状态。 */
function sha256Init(data: Uint8Array): number[] {
    const words: number[] = new Array(14).fill(0)
    words.push(((data[0] << 16) | (data[1] << 8) | data[2]) >>> 0)
    words.push(((data[3] << 24) | (data[4] << 16) | (data[5] << 8) | data[6]) >>> 0)
    for (let index = 16; index < 30; index++) {
        let value = SHA256_SCHEDULE[index - 16]
        if (index - 2 >= 14) {
            value += index === 16
                ? (sigma1(words[index - 2]) ^ SHA256_SIGMA1_ADJUSTMENT)
                : sigma1(words[index - 2])
        }
        if (index - 7 >= 14) {
            value += words[index - 7]
        }
        if (index - 15 >= 14) {
            value += index === 29
                ? (sigma0(words[index - 15]) ^ SHA256_SIGMA0_ADJUSTMENT)
                : sigma0(words[index - 15])
        }
        words.push(value >>> 0)
    }
    words.push((sigma1(words[28]) + words[23] + sigma0(words[15]) + words[14]
        + SHA256_ADJUSTMENT - SHA256_ROUND_CONSTANTS[14]) >>> 0)
    expandSha256Schedule(words, 31)
    const working = sha256Rounds(SHA256_STATE, words, 14)
    return SHA256_INITIAL.map((value, index) => (value + working[index]) >>> 0)
}

/** 计算定制 SHA-256 摘要。 */
function sha256Digest(data: Uint8Array): number[] {
    if (data.length < 7) {
        throw new Error('Token salt must contain at least seven bytes')
    }
    const length = 57 + data.length
    const padded = new Uint8Array(Math.ceil((data.length - 6) / 64) * 64)
    // padded = data[7:] + 0x80 + zero padding + 8 字节大端位长
    padded.set(data.subarray(7), 0)
    padded[data.length - 7] = 0x80
    const bitLength = length * 8
    const view = new DataView(padded.buffer, padded.byteOffset, padded.byteLength)
    view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000))
    view.setUint32(padded.length - 4, bitLength % 0x100000000)

    let state = sha256Init(data.subarray(0, 7))
    for (let offset = 0; offset < padded.length; offset += 64) {
        const words: number[] = []
        for (let index = 0; index < 16; index++) {
            words.push(view.getUint32(offset + index * 4))
        }
        expandSha256Schedule(words)
        const working = sha256Rounds(state, words)
        state = state.map((value, index) => (value + working[index]) >>> 0)
    }
    return state
}

/** 把小端字节流按 32 位字拆开，奇数个时补零。 */
function wordsLe4Even(data: Uint8Array): number[] {
    const padded = new Uint8Array(Math.ceil(data.length / 4) * 4)
    padded.set(data)
    const view = new DataView(padded.buffer, padded.byteOffset, padded.byteLength)
    const words: number[] = []
    for (let offset = 0; offset < padded.length; offset += 4) {
        words.push(view.getUint32(offset, true))
    }
    if (words.length % 2) {
        words.push(0)
    }
    return words
}

/** 计算 cs64 摘要的两个 32 位字。 */
function cs64Digest(data: Uint8Array, digest: readonly number[]): [number, number] {
    const keyA = (bswap32(digest[0]) | 1) >>> 0
    const keyB = (bswap32(digest[1]) | 1) >>> 0
    const factors = [mul32(keyA, CS64_FACTOR), mul32(keyB, CS64_FACTOR)]

    const terms: number[] = CS64_COEFFICIENTS.map(([coefficient], index) => mul32(coefficient, factors[index % 2]))
    const offsets: number[] = CS64_COEFFICIENTS.map(([, offset]) => offset)

    const payload = new Uint8Array(data.length + 1)
    payload.set(data, 1)
    wordsLe4Even(payload).forEach((word, index) => {
        let term = mul32(word, index % 2 === 0 ? keyA : keyB)
        let offset = mul32(rol16(word), index % 2 === 0 ? 0xEF0569FB : 0xC31713DB)
        if (index === 0) {
            term = (term + mul32(CS64_ADJUSTMENT0, factors[0])) >>> 0
            offset = (offset + CS64_ADJUSTMENT1) >>> 0
        }
        terms.push(term >>> 0)
        offsets.push(offset >>> 0)
    })

    let swapAcc = 0
    let swapLast = 0
    let state = 0
    let acc = 0
    for (let index = 0; index < terms.length; index += 2) {
        const x = terms[index]
        const y = terms[index + 1]
        let t = rol16((offsets[index] + x) >>> 0)
        let q = mul32(t, 0x76F50F34)
        swapAcc = (swapAcc + ((mul32(rol16(q), 0xC3EFEA97) + q) >>> 0)) >>> 0
        t = rol16((offsets[index + 1] + y) >>> 0)
        q = mul32(t, 0x1881CE3C)
        swapLast = (mul32(rol16(q), 0x35BD1EC9) + q) >>> 0
        swapAcc = (swapAcc + swapLast) >>> 0

        state = (mul32(state, keyA) + x) >>> 0
        state = mul32(rol16(state), 0xCF98B111)
        state = mul32(rol16(state), 0x87085B9F)
        state = mul32(rol16(state), 0x12CEB96D)
        state = mul32(rol16(state), 0x257E1D83)
        acc = (acc + state) >>> 0
        t = (mul32(state, keyB) + y) >>> 0
        t = mul32(rol16(t), 0xA27416F5)
        t = mul32(rol16(t), 0xD38396FF)
        state = mul32(rol16(mul32(rol16(t), 0x7C932B89)), 0xBFA49F69)
        acc = (acc + state) >>> 0
    }
    return [(swapLast ^ state) >>> 0, (swapAcc ^ acc) >>> 0]
}

function toHex(value: number, bytes: number): string {
    return value.toString(16).padStart(bytes * 2, '0')
}

/** 计算令牌的两段摘要，均返回大写十六进制字符串。 */
export function tokenHash(data: Uint8Array): { cs64: string; sha256: string } {
    const digest = sha256Digest(data)
    const [first, second] = cs64Digest(data, digest)
    return {
        cs64: (toHex(bswap32(first), 4) + toHex(bswap32(second), 4)).toUpperCase(),
        sha256: digest.map(value => toHex(value, 4)).join('').toUpperCase(),
    }
}

/**
 * 生成 Sec-MS-GEC 令牌值（v2 格式）。
 *
 * @param unixTimestamp 仅用于测试；默认取当前时间。
 * @param trustedClientToken Edge 朗读接口的固定客户端令牌。
 */
export function generateSecMsGec(unixTimestamp?: number, trustedClientToken = ''): string {
    let ticks = unixTimestamp ?? (Date.now() / 1000)
    ticks += WIN_EPOCH
    ticks -= ticks % TIME_WINDOW_SECONDS
    ticks *= 1e7
    const strToHash = `${ticks.toFixed(0)}${trustedClientToken}`
    const { cs64, sha256 } = tokenHash(new TextEncoder().encode(strToHash))
    return `${cs64}-${sha256}`
}
