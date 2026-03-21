export function safeParse<T = unknown>(json: string): T {
    try {
        return JSON.parse(json) as T
    } catch {
        throw new Error("INVALID_JSON_FROM_AGENT")
    }
}