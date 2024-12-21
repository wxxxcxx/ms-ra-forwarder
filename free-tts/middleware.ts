import 'server-only'
import { NextRequest, NextResponse } from "next/server";
import { LOCALES } from "./locales";
import { DEFAULT_LOCALE } from './locales';

let locales = LOCALES

// Get the preferred locale, similar to the above or using a library
function getLocale(request: NextRequest) {
    const cookie = request.cookies.get('NEXT_LOCALE');
    let locale = DEFAULT_LOCALE;
    if (cookie) {
        locale = cookie.value;
        if (LOCALES.includes(locale)) {
            return locale;
        }
    }
    const acceptLanguage = request.headers.get('accept-language');
    if (acceptLanguage) {
        const languages = acceptLanguage.split(';');
        for (const language of languages) {
            const items = language.split(',');
            for (const item of items) {
                if (LOCALES.find(locale => locale == item)) {
                    return item;
                }
            }
        }
    }
    return DEFAULT_LOCALE;
}

function isStaticAsset(pathname: string) {
    const STATIC_ASSET_MATCHER = /\.(ico|svg|png|gif|webp|webm)$/
    return STATIC_ASSET_MATCHER.test(pathname)
}

export function middleware(request: NextRequest) {
    // Check if there is any supported locale in the pathname
    const { pathname } = request.nextUrl
    const pathnameHasLocale = locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    )

    if (pathnameHasLocale) return

    if (isStaticAsset(pathname)) {
        return NextResponse.next(); // 继续请求处理
    }

    // Redirect if there is no locale

    const locale = getLocale(request)
    const url = new URL(
        `/${locale}${pathname.startsWith("/") ? "" : "/"}${pathname}`,
        request.url,
    );
    if (locale === DEFAULT_LOCALE) {
        return NextResponse.rewrite(url);
    } else {
        return NextResponse.redirect(url);
    }
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}