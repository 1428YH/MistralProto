import { runBRparser } from "../agents/BRparser.js";
import { runCODEREVIEW } from "../agents/CODEREVIEW.js";
import { runUIGenerator } from "../agents/UIGenerator.js";


export async function runPipeline(userMessage: string) {
    const BRparser = await runBRparser(userMessage);
    if (!BRparser) return console.error("Unable to process request");
    console.log("A:", BRparser)
    
    const UIGenerator = await runUIGenerator(BRparser);
    if (!UIGenerator) return console.error("Unable to process request"); 
    console.log("B:", UIGenerator)

    const CODEREVIEW = await runCODEREVIEW(UIGenerator)
    if (!CODEREVIEW) return console.error("Unable to process request")
    console.log("C:", CODEREVIEW)
}