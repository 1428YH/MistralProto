import { runAnalyst } from "../agents/analyst.js";
import { runHypothesizer } from "../agents/hypothesizer.js";
import { runArchitect } from "../agents/architect.js";
import { runSynthesizer } from "../agents/synthesizer.js";

export async function runPipeline(userMessage: string) {
    try {
        const analyst = await runAnalyst(userMessage);
        console.log("Analyst ✅");
        const hypothesizer = await runHypothesizer(analyst);
        console.log("Hypothesizer ✅");
        const architect = await runArchitect(hypothesizer);
        console.log("Architect ✅");
        const synthesizer = await runSynthesizer(
            JSON.stringify({
                analyst,
                hypothesizer,
                architect,
            })
        )

        return await synthesizer
    } catch(error) {
        console.error(`Analyst`);
    }
}