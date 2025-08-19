'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthRequired } from '@/app/actions/login'

/**
 * 认证状态hook
 * 管理用户登录状态和token
 */
export function useAuth() {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [authRequired, setAuthRequired] = useState<boolean | null>(null)
    const router = useRouter()

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // 检查是否需要认证
                const required = await isAuthRequired()
                setAuthRequired(required)

                if (required) {
                    // 如果需要认证，检查localStorage中的token
                    const savedToken = localStorage.getItem('auth_token')
                    if (savedToken) {
                        setToken(savedToken)
                        setIsAuthenticated(true)
                    } else {
                        setIsAuthenticated(false)
                    }
                } else {
                    // 如果不需要认证，直接设置为已认证
                    setIsAuthenticated(true)
                }
            } catch (error) {
                console.error('Auth check failed:', error)
                setIsAuthenticated(false)
            }
        }

        checkAuth()
    }, [])

    /**
     * 登出功能
     */
    const logout = () => {
        localStorage.removeItem('auth_token')
        setToken(null)
        setIsAuthenticated(false)
        router.push('/login')
    }

    /**
     * 获取当前token
     */
    const getToken = () => {
        return token || localStorage.getItem('auth_token')
    }

    /**
     * 重定向到登录页面（如果需要认证且未登录）
     */
    const redirectToLoginIfNeeded = () => {
        if (authRequired && !isAuthenticated) {
            router.push('/login')
        }
    }

    return {
        isAuthenticated,
        token,
        authRequired,
        logout,
        getToken,
        redirectToLoginIfNeeded,
        isLoading: isAuthenticated === null || authRequired === null
    }
}

/**
 * 认证保护组件
 * 用于保护需要登录的页面
 */
export function useAuthGuard() {
    const { isAuthenticated, authRequired, redirectToLoginIfNeeded, isLoading } = useAuth()

    useEffect(() => {
        if (!isLoading) {
            redirectToLoginIfNeeded()
        }
    }, [isAuthenticated, authRequired, isLoading, redirectToLoginIfNeeded])

    return {
        isAuthenticated,
        authRequired,
        isLoading
    }
}