import { callAgent } from "../core/mistral.js";
import { UI_GENERATOR_PROMPT } from "../prompts/UIGenerator.prompt.js";
import type { UIGeneratorRetryContext } from "../types.js";

function buildUserMessage(spec: unknown, retryContext?: UIGeneratorRetryContext): string {
    const base = { specification: spec }
    if (retryContext) {
        Object.assign(base, { retry_context: retryContext })
    }
    return JSON.stringify(base, null, 2)
}

export async function runUIGenerator(spec: unknown, retryContext?: UIGeneratorRetryContext) {
    try {
        const result = await callAgent({
            userMessage: buildUserMessage(spec, retryContext),
            systemPrompt: UI_GENERATOR_PROMPT,
            temperature: 0.6,
        })

        return result
    } catch(error) {
        console.error("UIGenerator error:", error)
        return false
    }
}