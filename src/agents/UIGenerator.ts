import { callAgent } from "../core/mistral.js";
import { UI_GENERATOR_PROMPT } from "../prompts/UIGenerator.prompt.js";

export async function runUIGenerator(BRparser: any) {
    try {
        const result = await callAgent({
            userMessage: JSON.stringify(BRparser), 
            systemPrompt: UI_GENERATOR_PROMPT,
            temperature: 0.6,
        })

        return result
    } catch(error) {
        console.error("UIGenerator error:", error)
        return false
    }
}