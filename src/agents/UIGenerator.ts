import { callAgent } from "../core/mistral.js";
import { UI_GENERATOR_PROMPT } from "../prompts/UIGenerator.prompt.js";
import type { BRSpec, UIGeneratorRetryContext } from "../types.js";

function buildUserMessage(spec: BRSpec, retryContext?: UIGeneratorRetryContext): string {
    const base = { specification: spec }
    if (retryContext) {
        Object.assign(base, { retry_context: retryContext })
    }
    return JSON.stringify(base, null, 2)
}

export async function runUIGenerator(
    spec: BRSpec,
    retryContext?: UIGeneratorRetryContext
): Promise<string | false> {
    const msg = retryContext ? "with retry context" : "";
    console.log("  [UIGenerator] Calling Mistral API (temperature: 0.6)", msg, "...");
    const t0 = Date.now();
    try {
        const result = await callAgent({
            userMessage: buildUserMessage(spec, retryContext),
            systemPrompt: UI_GENERATOR_PROMPT,
            temperature: 0.6,
            maxTokens: 65536,
        });

        console.log("  [UIGenerator] ✓ HTML received", `(${Date.now() - t0}ms)`);
        return result;
    } catch (error) {
        console.error("  [UIGenerator] Error:", error);
        return false;
    }
}