'use server'

/**
 * 验证用户登录token
 * 如果设置了MS_RA_FORWARDER_TOKEN环境变量，则需要验证token
 * 如果未设置环境变量，则允许任何非空token登录
 */
export async function login(token: string) {
    // 检查是否设置了MS_RA_FORWARDER_TOKEN环境变量
    const requiredToken = process.env.MS_RA_FORWARDER_TOKEN || process.env.TOKEN
    
    if (requiredToken) {
        // 如果设置了环境变量，必须验证token
        if (requiredToken === token) {
            return { success: true, token }
        } else {
            throw new Error('Token is invalid')
        }
    } else {
        // 如果未设置环境变量，允许任何非空token
        if (token && token.trim() !== '') {
            return { success: true, token }
        } else {
            throw new Error('Token is required')
        }
    }
}

/**
 * 检查是否需要认证（是否设置了MS_RA_FORWARDER_TOKEN环境变量）
 */
export async function isAuthRequired() {
    return !!(process.env.MS_RA_FORWARDER_TOKEN || process.env.TOKEN)
}