import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import PromptSync from "prompt-sync";
import { runPipeline } from "./core/pipeline.js";
import { runServer, waitForServerStop } from "./core/server.js";
import type { BRSpec, UIGeneratorRetryContext } from "./types.js";

const prompt = PromptSync();

const MIN_QUERY_LEN = 10;
const MAX_QUERY_LEN = 5000;
const OUTPUT_DIR = "output";

console.log("Welcome to the Mistral prototype! Enter your query or type 'exit' to quit.");
console.log("Commands: exit — quit, save — save last result to file");

function printReport(report: { critical?: string[]; warnings?: string[]; info?: string[] } | undefined) {
    if (!report) return;
    if (report.critical?.length) {
        console.log("\n❌ Critical:", report.critical.join("; "));
    }
    if (report.warnings?.length) {
        console.log("⚠️  Warnings:", report.warnings.join("; "));
    }
    if (report.info?.length) {
        console.log("ℹ️  Info:", report.info.join("; "));
    }
}

function validateInput(msg: string): { ok: boolean; error?: string } {
    const trimmed = msg.trim();
    if (!trimmed) return { ok: false, error: "Query cannot be empty." };
    if (trimmed.length < MIN_QUERY_LEN)
        return { ok: false, error: `Query too short (min ${MIN_QUERY_LEN} chars). Add more details.` };
    if (trimmed.length > MAX_QUERY_LEN)
        return { ok: false, error: `Query too long (max ${MAX_QUERY_LEN} chars). Summarize.` };
    return { ok: true };
}

async function saveToFile(html: string, projectName?: string): Promise<string> {
    await mkdir(OUTPUT_DIR, { recursive: true });
    const safeName = (projectName ?? "prototype").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
    const filename = `${safeName}-${Date.now()}.html`;
    const filepath = join(OUTPUT_DIR, filename);
    await writeFile(filepath, html, "utf-8");
    return filepath;
}

async function runWithRetry(
    userMessage: string,
    initialSpec?: BRSpec,
    initialRetryContext?: UIGeneratorRetryContext
) {
    let spec: BRSpec | undefined = initialSpec;
    let retryContext: UIGeneratorRetryContext | undefined = initialRetryContext;

    while (true) {
        const result = await runPipeline(userMessage, {
            ...(spec !== undefined && { spec }),
            ...(retryContext !== undefined && { retryContext }),
            skipServer: true,
        });
        if (!result) return null;

        if (result.codeReview.status === "fail" && result.codeReview.report) {
            console.log("\n--- Code Review failed, see feedback below ---");
            printReport(result.codeReview.report);
            console.log("\nOptions: retry (add context) | spec (re-parse requirements) | launch (preview anyway) | done (abort)");

            const action = prompt("\nYour choice (retry/spec/launch/done): ")?.trim().toLowerCase();

            if (action === "spec") {
                const clarification = prompt("Describe what's wrong with the requirements or add missing details: ");
                if (clarification?.trim()) {
                    spec = undefined;
                    retryContext = undefined;
                    return runWithRetry(
                        userMessage + "\n\n--- Additional clarifications ---\n" + clarification.trim()
                    );
                }
            }

            if (action === "launch" && result.html) {
                await runServer(result.html);
                await waitForServerStop();
                return result;
            }

            if (action === "done") return result;

            const userContext = prompt("Enter additional context or clarifications (for UI retry): ");
            const report = result.codeReview.report;
            spec = result.spec;
            retryContext = {
                report: {
                    critical: report.critical ?? [],
                    warnings: report.warnings ?? [],
                    info: report.info ?? [],
                },
                ...(result.codeReview.changes !== undefined && { changes: result.codeReview.changes }),
                ...(userContext?.trim() && { userContext: userContext.trim() }),
                ...(result.html && { currentHtml: result.html }),
            };
            continue;
        }

        if (result.codeReview.status === "pass" && result.html) {
            console.log("Pipeline completed successfully ✅");
            console.log("[Pipeline] Step 4/4: Starting local server for preview");
            await runServer(result.html);
            await waitForServerStop();
        }

        return result;
    }
}

async function main() {
    let lastResult: { html: string; spec: BRSpec } | null = null;

    while (true) {
        const message = prompt("\nEnter your query: ");
        const trimmed = message?.trim() ?? "";

        if (trimmed === "exit") {
            console.log("Goodbye!");
            process.exit(0);
        }

        if (trimmed === "save") {
            if (lastResult?.html) {
                const filepath = await saveToFile(lastResult.html, lastResult.spec.project_name);
                console.log("Saved to", filepath);
            } else {
                console.log("No result to save. Run a query first.");
            }
            continue;
        }

        const validation = validateInput(trimmed);
        if (!validation.ok) {
            console.log(validation.error);
            continue;
        }

        try {
            const result = await runWithRetry(trimmed);
            if (result) {
                lastResult = { html: result.html, spec: result.spec };
                const saveChoice = prompt("\nSave to file? (y/n): ");
                if (saveChoice?.toLowerCase().startsWith("y")) {
                    const filepath = await saveToFile(result.html, result.spec.project_name);
                    console.log("Saved to", filepath);
                }
            }
        } catch (error) {
            console.error("Error:", error);
        }
    }
}

await main();
