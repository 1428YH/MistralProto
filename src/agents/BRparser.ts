import { callAgent } from "../core/mistral.js";
import { BR_PARSER_PROMPT } from "../prompts/BRparser.prompt.js";
import { safeParse } from "../utilities/parse.js";
import { isBRSpec, type BRSpec } from "../types.js";

export async function runBRparser(message: string): Promise<BRSpec | false> {
    console.log("  [BRparser] Calling Mistral API (temperature: 0.2)...");
    const t0 = Date.now();
    try {
        const result = await callAgent({
            userMessage: message,
            systemPrompt: BR_PARSER_PROMPT,
            temperature: 0.2,
        });

        console.log("  [BRparser] Response received, parsing JSON...");
        const parsed = safeParse<BRSpec>(result);
        const ok = parsed && isBRSpec(parsed);
        console.log("  [BRparser]", ok ? "✓ Success" : "✗ Invalid JSON or structure", `(${Date.now() - t0}ms)`);
        return ok ? parsed : false;
    } catch (error) {
        console.error("  [BRparser] Error:", error);
        return false;
    }
}