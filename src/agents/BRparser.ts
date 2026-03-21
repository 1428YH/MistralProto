import { callAgent } from "../core/mistral.js";
import { BR_PARSER_PROMPT } from "../prompts/BRparser.prompt.js";
import { safeParse } from "../utilities/parse.js";

export async function runBRparser(message: string) {
    try {
        const result = await callAgent({
            userMessage: message,
            systemPrompt: BR_PARSER_PROMPT, 
            temperature: 0.2,
        })

        return safeParse(result)
    } catch (error) {
        console.error("BRparser error:", error)
        return false
    }
}