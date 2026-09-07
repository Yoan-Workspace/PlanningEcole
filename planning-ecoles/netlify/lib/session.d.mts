export declare const COOKIE_NAME: string
export declare const MAX_AGE_SEC: number
export declare function getAccessCode(): string
export declare function getSessionSecret(): string
export declare function isAuthConfigured(): boolean
export declare function isSecureRequest(headers: Record<string, unknown>): boolean
export declare function parseCookies(cookieHeader: string | undefined): Record<string, string>
export declare function signSession(secret: string): string
export declare function verifySession(secret: string, token: string | undefined): boolean
export declare function codesMatch(provided: unknown, expected: string): boolean
export declare function sessionCookie(token: string, opts: { secure: boolean }): string
export declare function clearSessionCookie(opts: { secure: boolean }): string
export declare function hasValidSession(cookieHeader: string | undefined): boolean
export declare function cookieHeaderFromEvent(headers: Record<string, string | undefined>): string
