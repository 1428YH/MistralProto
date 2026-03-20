import { callAgent } from "../core/mistral.js";
import { SYNTHESIZER_PROMPT } from "../prompts/synthesizer.prompt.js";

export async function runSynthesizer(data: string) {
    try {
        const result = await callAgent({
            userMessage: data,
            systemPrompt: SYNTHESIZER_PROMPT,
            temperature: 0.6,
        })

        return result 
    } catch(error) {
        console.error(`Synthesizer error: ${error}`)
        throw new Error("ERROR_SYNTHESIZER")
    }
}