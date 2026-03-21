import { runBRparser } from "../agents/BRparser.js";
import { runUIGenerator } from "../agents/UIGenerator.js";


export async function runPipeline(userMessage: string) {
    const BRparser = await runBRparser(userMessage);
    if (!BRparser) return console.error("Unable to process request");
    console.log("A:", BRparser)
    
    const UIGenerator = await runUIGenerator(BRparser);
    if (!UIGenerator) return console.error("Unable yo process"); 
    console.log("B:", UIGenerator)
}