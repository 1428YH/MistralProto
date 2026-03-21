import { callAgent } from "../core/mistral.js"
import { CODEREVIEW_PROMPT } from "../prompts/CODEREVIEW.prompt.js"
import { safeParse } from "../utilities/parse.js"

export async function runCODEREVIEW(UIGenerator: string) {
    try {
        const result = await callAgent({
            userMessage: UIGenerator, 
            systemPrompt: CODEREVIEW_PROMPT,
            temperature: 0.3
        })

        return safeParse(result)
    } catch(error) {
        console.error("CODEREVIEW error:", error)
        return false
    }
}