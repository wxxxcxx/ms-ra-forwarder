'use server'
export async function login(token: string) {
    if (process.env.TOKEN === token || token !== '') {
        return true
    }
    else {
        throw new Error('Token is invalid')
    }
}