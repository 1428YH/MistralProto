import { oneLine } from "common-tags"
import { callAgent } from "../core/mistral.js"
import { safeParse } from "../utilities/parse.js"
import { ANALYST_PROMPT } from "../prompts/analyst.prompt.js"

export async function runAnalyst(message:string) {
    try {
        const result = await callAgent({
            userMessage: message,
            systemPrompt: ANALYST_PROMPT,
            temperature: 0.2
        })
        return await safeParse(result)
    } catch(error) {
        console.error(`Analyst error: ${error}`)
        throw new Error("ERROR_ANALYST")
    }
}