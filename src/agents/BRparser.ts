import { callAgent } from "../core/mistral.js";
import { BR_PARSER_PROMPT } from "../prompts/BRparser.prompt.js";
import { safeParse } from "../utilities/parse.js";
import { isBRSpec, type BRSpec } from "../types.js";

export async function runBRparser(message: string): Promise<BRSpec | false> {
    try {
        const result = await callAgent({
            userMessage: message,
            systemPrompt: BR_PARSER_PROMPT, 
            temperature: 0.2,
        })

        const parsed = safeParse<BRSpec>(result);
        return parsed && isBRSpec(parsed) ? parsed : false;
    } catch (error) {
        console.error("BRparser error:", error)
        return false
    }
}