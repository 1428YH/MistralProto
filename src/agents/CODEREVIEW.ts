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
    console.log("  [CodeReview] Calling Mistral API (temperature: 0.3)...");
    const t0 = Date.now();
    try {
        const result = await callAgent({
            userMessage: buildUserMessage(html, context),
            systemPrompt: CODEREVIEW_PROMPT,
            temperature: 0.3,
            maxTokens: 65536,
        });

        console.log("  [CodeReview] Response received, parsing JSON...");
        const parsed = safeParse<CodeReviewResult>(result);
        if (parsed) {
            const status = parsed.status ?? "?";
            const critical = parsed.report?.critical?.length ?? 0;
            const warnings = parsed.report?.warnings?.length ?? 0;
            console.log("  [CodeReview] ✓", status, `— critical: ${critical}, warnings: ${warnings}`, `(${Date.now() - t0}ms)`);
        } else {
            console.log("  [CodeReview] ✗ Failed to parse response", `(${Date.now() - t0}ms)`);
        }
        return parsed ?? false;
    } catch (error) {
        console.error("  [CodeReview] Error:", error);
        return false;
    }
}