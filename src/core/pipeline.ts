import { runBRparser } from "../agents/BRparser.js";
import { runCODEREVIEW } from "../agents/CODEREVIEW.js";
import { runUIGenerator } from "../agents/UIGenerator.js";
import { runServer } from "./server.js";
import type { BRSpec, CodeReviewResult, UIGeneratorRetryContext } from "../types.js";
import { isBRSpec } from "../types.js";

export interface PipelineOptions {
    spec?: BRSpec;
    retryContext?: UIGeneratorRetryContext;
}

export interface PipelineResult {
    codeReview: CodeReviewResult;
    spec: BRSpec;
}

export async function runPipeline(
    userMessage: string,
    options?: PipelineOptions
): Promise<PipelineResult | null> {
    const spec = options?.spec ?? (await runBRparser(userMessage));
    if (!spec || !isBRSpec(spec)) {
        console.error("Unable to process request");
        return null;
    }

    const uiOutput = await runUIGenerator(spec, options?.retryContext);
    if (!uiOutput) {
        console.error("Unable to process request");
        return null;
    }

    const codeReview = await runCODEREVIEW(uiOutput, {
        spec,
        userMessage
    });
    if (!codeReview) {
        console.error("Unable to process request");
        return null;
    }

    if (codeReview.launch_server && codeReview.status === "pass" && codeReview.file) {
        await runServer(codeReview.file);
    }

    return { codeReview, spec };
}