import { callAgent } from "../core/mistral.js";
import { safeParse } from "../utilities/parse.js";
import { HYPOTHESIZER_PROMPT } from "../prompts/hypothesizer.prompt.js";

export async function runHypothesizer(analyst: any) {
    try {
        const result = await callAgent({
            userMessage: JSON.stringify(analyst), 
            systemPrompt: HYPOTHESIZER_PROMPT,
            temperature: 0.4
        });

        return await safeParse(result);
    } catch(error) {
        console.error(`Hypothesizer error: ${error}`)
        throw new Error("ERROR_HYPOTHESIZER")
    }
}