// EdgeTTS 聚合客户端：对外接口与原 EdgeTTSClient 完全一致，内部按 v2/v1 顺序 fallback + 重试。
// v1/v2 是同一服务商的传输层细节，service 层的 TTSService 抽象不应感知版本差异。
import { EdgeTTSClientV1 } from './client-v1'
import { EdgeTTSClientV2 } from './client-v2'
import type { ClientOptions, ConvertResult } from './client-v1'
import { CHROMIUM_FULL_VERSION as _CHROMIUM_FULL_VERSION, TRUSTED_CLIENT_TOKEN as _TRUSTED_CLIENT_TOKEN } from './client-v1'

export const CHROMIUM_FULL_VERSION = _CHROMIUM_FULL_VERSION
export const TRUSTED_CLIENT_TOKEN = _TRUSTED_CLIENT_TOKEN
export type { ClientOptions, ConvertResult }

// 单次尝试（握手 + 合成）超时。
const ATTEMPT_TIMEOUT_MS = 20000
// 每个后端最多尝试次数：微软接口偶发 5xx/断连，重试一次能挡掉大部分抖动。
const ATTEMPTS_PER_BACKEND = 2
// 一次请求的总预算：超预算就不再重试，避免把函数拖到平台超时。
const TOTAL_BUDGET_MS = 45000
// 重试前的短暂等待，避免连续撞同一个故障节点。
const RETRY_BACKOFF_MS = 300

// 模块级（进程内有效）：记住上次走通的后端，下次优先用它。
// 音色列表和语音合成是两个独立端点，灰度状态可能不同，因此分开记忆。
let preferV2ForVoices = false
let preferV2ForConvert = true

type Backend = 'v2' | 'v1'

function orderedBackends(preferV2: boolean): Backend[] {
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

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 把错误压缩成一行，方便在部署日志里检索。 */
function describeError(error: unknown): string {
    if (!(error instanceof Error)) {
        return String(error)
    }
    const extra = ['code', 'statusCode', 'status']
        .map((key) => (error as unknown as Record<string, unknown>)[key])
        .filter((value) => value !== undefined)
        .map((value) => ` ${value}`)
        .join('')
    return `${error.message}${extra}`
}

export class EdgeTTSClient {
    private constructor() {
    }

    public static async voices(): Promise<any> {
        let lastError: any = null
        for (const backend of orderedBackends(preferV2ForVoices)) {
            try {
                const task = backend === 'v2' ? EdgeTTSClientV2.voices() : EdgeTTSClientV1.voices()
                const data = await withTimeout(task, ATTEMPT_TIMEOUT_MS, `voices() via ${backend}`)
                preferV2ForVoices = backend === 'v2'
                console.log(`[edge-tts] voices ok via ${backend} count=${Array.isArray(data) ? data.length : 'unknown'}`)
                return data
            } catch (error) {
                lastError = error
                console.error(`[edge-tts] voices fail via ${backend}: ${describeError(error)}`)
            }
        }
        throw lastError
    }

    public static async convert(ssml: string, options: ClientOptions): Promise<ConvertResult> {
        const startedAt = Date.now()
        let lastError: any = null
        let attempts = 0
        backends:
        for (const backend of orderedBackends(preferV2ForConvert)) {
            for (let attempt = 1; attempt <= ATTEMPTS_PER_BACKEND; attempt++) {
                const spent = Date.now() - startedAt
                if (spent >= TOTAL_BUDGET_MS) {
                    console.error(`[edge-tts] 放弃重试，已耗时 ${spent}ms（预算 ${TOTAL_BUDGET_MS}ms）`)
                    break backends
                }
                attempts++
                try {
                    const task = backend === 'v2' ? EdgeTTSClientV2.convert(ssml, options) : EdgeTTSClientV1.convert(ssml, options)
                    const result = await withTimeout(
                        task,
                        Math.min(ATTEMPT_TIMEOUT_MS, TOTAL_BUDGET_MS - spent),
                        `convert() via ${backend}`,
                    )
                    preferV2ForConvert = backend === 'v2'
                    console.log(`[edge-tts] synth ok via ${backend} attempt=${attempt} bytes=${result.audio.byteLength} ms=${Date.now() - startedAt}`)
                    return result
                } catch (error) {
                    lastError = error
                    console.error(`[edge-tts] synth fail via ${backend} attempt=${attempt} after ${Date.now() - startedAt}ms: ${describeError(error)}`)
                    await sleep(RETRY_BACKOFF_MS)
                }
            }
        }
        console.error(`[edge-tts] synth exhausted after ${attempts} attempts / ${Date.now() - startedAt}ms`)
        throw lastError
    }
}
