import { runBRparser } from "../agents/BRparser.js";


export async function runPipeline(userMessage: string) {
    const BRparser = await runBRparser(userMessage);
    if (!BRparser) return console.error("Unable to process request");
    
    
}