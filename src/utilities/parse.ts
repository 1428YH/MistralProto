export function safeParse<T = unknown>(json: string): T | false {
    const cleaned = json.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
    try {
        return JSON.parse(cleaned) as T;
    } catch {
        console.error("Parse failed on:", cleaned.slice(0, 200));
        return false;
    }
}