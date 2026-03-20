import { runAnalyst } from "../agents/analyst.js";
import { runHypothesizer } from "../agents/hypothesizer.js";

export async function runPipeline(userMessage: string) {
    try {
        const analyst = await runAnalyst(userMessage);
        console.log("A:", analyst)
        const hypothesizer = await runHypothesizer(analyst);
        console.log("B:", hypothesizer)
        
        return {
            analyst,
            hypothesizer
        }
    } catch(error) {
        console.error(`Analyst`);
    }
}