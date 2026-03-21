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
    /** Max tokens in response; default 8192. Use 32768+ for Code Review (outputs full HTML). */
    maxTokens?: number;
}

export async function callAgent(opts: CallAgentOptions): Promise<string> {
    const config = await loadConfig();
    const client = await getClient();
    let lastError: unknown;

    for (let attempt = 0; attempt <= config.apiRetries; attempt++) {
        if (attempt > 0) {
            console.log(`    [Mistral] Retry #${attempt}...`);
        }
        try {
            const response = await client.chat.complete({
                model: config.mistralModel,
                temperature: opts.temperature,
                maxTokens: opts.maxTokens ?? 8192,
                messages: [
                    { role: "system", content: opts.systemPrompt },
                    { role: "user", content: opts.userMessage },
                ],
            });
            const content = response.choices[0]?.message?.content;
            if (!content) throw new Error("Empty response");
            if (attempt > 0) console.log("    [Mistral] ✓ Retry succeeded");
            return content as string;
        } catch (err) {
            lastError = err;
            if (attempt < config.apiRetries) {
                const delay = Math.min(1000 * 2 ** attempt, 10000);
                await new Promise((r) => setTimeout(r, delay));
            } else {
                const msg = err instanceof Error ? err.message : String(err);
                console.error("Mistral error:", msg);
                throw new Error(`MISTRAL_ERROR_REQUEST: ${msg}`, { cause: err });
            }
        }
    }

    throw new Error("MISTRAL_ERROR_REQUEST", { cause: lastError });
}