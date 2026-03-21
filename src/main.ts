import PromptSync from "prompt-sync";
import { runPipeline } from "./core/pipeline.js";
import type { UIGeneratorRetryContext } from "./types.js";

const prompt = PromptSync();

console.log("Welcome to the Mistral prototype! Enter your query or type 'exit' to quit.");

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

async function runWithRetry(userMessage: string, spec?: unknown, retryContext?: UIGeneratorRetryContext) {
    const result = await runPipeline(userMessage, { spec, retryContext });
    if (!result) return null;

    if (result.codeReview.status === "fail" && result.codeReview.report) {
        console.log("\n--- Code Review не прошёл ---");
        printReport(result.codeReview.report);
        const answer = prompt("\nДобавить уточнения и повторить? (да/нет): ");
        if (answer?.toLowerCase().startsWith("д") || answer?.toLowerCase() === "y" || answer?.toLowerCase() === "yes") {
            const userContext = prompt("Введите дополнительный контекст или уточнения: ");
            const report = result.codeReview.report;
            return runWithRetry(userMessage, result.spec, {
                report: {
                    critical: report.critical ?? [],
                    warnings: report.warnings ?? [],
                    info: report.info ?? []
                },
                changes: result.codeReview.changes,
                userContext: userContext?.trim() || undefined
            });
        }
    } else if (result.codeReview.status === "pass") {
        console.log("Pipeline completed ✅");
    }

    return result;
}

async function loop() {
    const message = prompt("Enter your query: ");
    if (message === "exit") {
        console.log("Goodbye!");
        process.exit(0);
    }
    try {
        const result = await runWithRetry(message);
        if (result) console.log(result);
    } catch (error) {
        console.error("Error:", error);
    }
    loop();
}

loop();