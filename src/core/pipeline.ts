import { runBRparser } from "../agents/BRparser.js";
import { runCODEREVIEW } from "../agents/CODEREVIEW.js";
import { runUIGenerator } from "../agents/UIGenerator.js";
import { runServer, waitForServerStop } from "./server.js";
import type { BRSpec, CodeReviewResult, UIGeneratorRetryContext } from "../types.js";
import { isBRSpec } from "../types.js";

export interface PipelineOptions {
    spec?: BRSpec;
    retryContext?: UIGeneratorRetryContext;
    skipServer?: boolean;
}

export interface PipelineResult {
    codeReview: CodeReviewResult;
    spec: BRSpec;
    html: string;
}

export async function runPipeline(
    userMessage: string,
    options?: PipelineOptions
): Promise<PipelineResult | null> {
    console.log("\n[Pipeline] Starting...");
    console.log("[Pipeline] User message:", userMessage.slice(0, 80) + (userMessage.length > 80 ? "..." : ""));

    console.log("[Pipeline] Step 1/4: BRparser — parsing requirements into JSON spec");
    const spec = options?.spec ?? (await runBRparser(userMessage));
    if (!spec || !isBRSpec(spec)) {
        console.error("[Pipeline] ❌ BRparser failed to process request");
        return null;
    }
    console.log("[Pipeline] ✓ Spec received:", spec.project_name, "—", spec.screens.length, "screens");

    console.log("[Pipeline] Step 2/4: UIGenerator — generating HTML from spec");
    if (options?.retryContext) {
        console.log("[Pipeline]   (retry with Code Review feedback)");
    }
    const uiOutput = await runUIGenerator(spec, options?.retryContext);
    if (!uiOutput) {
        console.error("[Pipeline] ❌ UIGenerator failed to produce HTML");
        return null;
    }
    console.log("[Pipeline] ✓ HTML generated, size:", uiOutput.length, "chars");

    console.log("[Pipeline] Step 3/4: Code Review — validating code");
    const codeReview = await runCODEREVIEW(uiOutput, {
        spec,
        userMessage
    });
    if (!codeReview) {
        console.error("[Pipeline] ❌ Code Review failed to process result");
        return null;
    }
    console.log("[Pipeline] ✓ Code Review done:", codeReview.status === "pass" ? "PASS" : "FAIL");

    const html = codeReview.file ?? uiOutput;

    if (!options?.skipServer && codeReview.launch_server && codeReview.status === "pass" && html) {
        console.log("[Pipeline] Step 4/4: Starting local server for preview");
        await runServer(html);
        await waitForServerStop();
    } else {
        console.log("[Pipeline] Step 4/4: Skipped (server only launches on pass)");
    }

    console.log("[Pipeline] Done.\n");
    return { codeReview, spec, html };
}