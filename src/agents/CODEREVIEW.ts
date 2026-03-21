import { callAgent } from "../core/mistral.js"
import { CODEREVIEW_PROMPT } from "../prompts/CODEREVIEW.prompt.js"
import { safeParse } from "../utilities/parse.js"
import type { CodeReviewContext, CodeReviewResult } from "../types.js"

function buildUserMessage(html: string, context: CodeReviewContext): string {
    const parts: string[] = ["## HTML Prototype\n```html\n", html, "\n```"]
    if (context.spec) {
        parts.push("\n## Original Specification (JSON)\n```json\n", JSON.stringify(context.spec, null, 2), "\n```")
    }
    if (context.userMessage) {
        parts.push("\n## User's Original Message\n", context.userMessage)
    }
    return parts.join("")
}

export async function runCODEREVIEW(html: string, context: CodeReviewContext): Promise<CodeReviewResult | false> {
    try {
        const result = await callAgent({
            userMessage: buildUserMessage(html, context),
            systemPrompt: CODEREVIEW_PROMPT,
            temperature: 0.3
        })

        return safeParse<CodeReviewResult>(result)
    } catch(error) {
        console.error("CODEREVIEW error:", error)
        return false
    }
}