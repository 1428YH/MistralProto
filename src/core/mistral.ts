import { Mistral } from "@mistralai/mistralai";
import { loadConfig } from "../config/load.js";

let _client: Mistral | null = null;

async function getClient(): Promise<Mistral> {
    if (!_client) {
        const config = await loadConfig();
        _client = new Mistral({ apiKey: config.mistralKey });
    }
    return _client;
}

export interface CallAgentOptions {
    userMessage: string;
    systemPrompt: string;
    temperature: number;
    maxTokens?: number;
}

// Таймаут одного запроса — 5 минут
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

function isRetryableError(err: unknown): boolean {
    if (!(err instanceof Error)) return false;
    const msg = err.message.toLowerCase();
    const cause = err.cause;
    const causeCode = cause && typeof cause === "object" && "code" in cause
        ? String((cause as { code: unknown }).code)
        : "";
    return (
        msg.includes("terminated") ||
        msg.includes("socket") ||
        msg.includes("econnreset") ||
        msg.includes("etimedout") ||
        msg.includes("other side closed") ||
        msg.includes("fetch failed") ||
        msg.includes("timed out") ||
        causeCode === "UND_ERR_SOCKET" ||
        causeCode === "ECONNRESET" ||
        causeCode === "ETIMEDOUT"
    );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new Error(`Request timed out after ${ms / 1000}s`)),
            ms
        );
        promise.then(
            (val) => { clearTimeout(timer); resolve(val); },
            (err) => { clearTimeout(timer); reject(err); }
        );
    });
}

export async function callAgent(opts: CallAgentOptions): Promise<string> {
    const config = await loadConfig();
    let client = await getClient();
    let lastError: unknown;

    for (let attempt = 0; attempt <= config.apiRetries; attempt++) {
        if (attempt > 0) {
            const delay = Math.min(1000 * 2 ** attempt, 15000);
            console.log(`    [Mistral] Retry #${attempt} after ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));

            // Пересоздаём клиент при сетевых ошибках
            if (isRetryableError(lastError)) {
                console.log("    [Mistral] Reinitialising client after socket error...");
                _client = new Mistral({ apiKey: config.mistralKey });
                client = _client;
            }
        }

        try {
            const response = await withTimeout(
                client.chat.complete({
                    model: config.mistralModel,
                    temperature: opts.temperature,
                    maxTokens: opts.maxTokens ?? 8192,
                    messages: [
                        { role: "system", content: opts.systemPrompt },
                        { role: "user",   content: opts.userMessage  },
                    ],
                }),
                REQUEST_TIMEOUT_MS
            );

            const content = response.choices[0]?.message?.content;
            if (!content) throw new Error("Empty response");
            if (attempt > 0) console.log("    [Mistral] ✓ Retry succeeded");
            return content as string;

        } catch (err) {
            lastError = err;
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`    [Mistral] Attempt ${attempt + 1} failed: ${msg}`);

            if (attempt >= config.apiRetries) {
                throw new Error(`MISTRAL_ERROR_REQUEST: ${msg}`, { cause: err });
            }
        }
    }

    throw new Error("MISTRAL_ERROR_REQUEST", { cause: lastError });
}
