import { runBRparser } from "../agents/BRparser.js";
import { runCODEREVIEW } from "../agents/CODEREVIEW.js";
import { runUIGenerator } from "../agents/UIGenerator.js";
import { runServer } from "./server.js";

interface CodeReviewResult {
    status?: "pass" | "fail";
    launch_server?: boolean;
    file?: string;
}

export async function runPipeline(userMessage: string) {
    const BRparser = await runBRparser(userMessage);
    if (!BRparser) return console.error("Unable to process request");

    const UIGenerator = await runUIGenerator(BRparser);
    if (!UIGenerator) return console.error("Unable to process request");

    const CODEREVIEW = await runCODEREVIEW(UIGenerator) as CodeReviewResult | false;
    if (!CODEREVIEW) return console.error("Unable to process request");

    if (CODEREVIEW.launch_server && CODEREVIEW.status === "pass" && CODEREVIEW.file) {
        runServer(CODEREVIEW.file);
    } else {
        console.log("Code review did not approve launch. Status:", CODEREVIEW.status);
    }

    return CODEREVIEW;
}