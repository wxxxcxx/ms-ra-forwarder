// EdgeTTS 聚合客户端：对外接口与原 EdgeTTSClient 完全一致，内部按 v2 → v1 顺序 fallback。
// v1/v2 是同一服务商的传输层细节，service 层的 TTSService 抽象不应感知版本差异。
import { EdgeTTSClientV1 } from './client-v1'
import { EdgeTTSClientV2 } from './client-v2'
import type { ClientOptions, ConvertResult } from './client-v1'
import { CHROMIUM_FULL_VERSION as _CHROMIUM_FULL_VERSION, TRUSTED_CLIENT_TOKEN as _TRUSTED_CLIENT_TOKEN } from './client-v1'

export const CHROMIUM_FULL_VERSION = _CHROMIUM_FULL_VERSION
export const TRUSTED_CLIENT_TOKEN = _TRUSTED_CLIENT_TOKEN
export type { ClientOptions, ConvertResult }

// 单次尝试超时：按原 client.ts 注释意图取 60 秒（原代码写的是 600000，疑似多写了一个 0）。
// 如需恢复 600 秒，改这一个常量即可。
const ATTEMPT_TIMEOUT_MS = 60000

// 模块级：记住上次走通的版本，进程内有效。默认优先 v2（微软灰度迁移方向）。
let preferV2 = true

type Backend = 'v2' | 'v1'

function orderedBackends(): Backend[] {
    return preferV2 ? ['v2', 'v1'] : ['v1', 'v2']
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => {
            setTimeout(() => reject(new Error(`${label} 超时 ${ms}ms`)), ms)
        }),
    ])
}

export class EdgeTTSClient {
    private constructor() {
    }

    public static async voices(): Promise<any> {
        const backends = orderedBackends()
        let lastError: any = null
        for (const b of backends) {
            try {
                const data = b === 'v2'
                    ? await EdgeTTSClientV2.voices()
                    : await EdgeTTSClientV1.voices()
                preferV2 = b === 'v2'
                console.log(`voices() 走通 via ${b}`)
                return data
            } catch (e) {
                lastError = e
                console.error(`voices() via ${b} 失败，尝试 fallback:`, e)
            }
        }
        throw lastError
    }

    public static async convert(ssml: string, options: ClientOptions): Promise<ConvertResult> {
        const backends = orderedBackends()
        let lastError: any = null
        for (const b of backends) {
            try {
                const task = b === 'v2'
                    ? EdgeTTSClientV2.convert(ssml, options)
                    : EdgeTTSClientV1.convert(ssml, options)
                const result = await withTimeout(task, ATTEMPT_TIMEOUT_MS, `convert() via ${b}`)
                preferV2 = b === 'v2'
                console.log(`convert() 走通 via ${b}`)
                return result
            } catch (e) {
                lastError = e
                console.error(`convert() via ${b} 失败，尝试 fallback:`, e)
                // 整句重试：convert(ssml) 是幂等的，无副作用，继续试下一个后端
            }
        }
        throw lastError
    }
}
