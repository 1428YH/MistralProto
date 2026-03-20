import { runAnalyst } from "../agents/analyst.js";
import { runHypothesizer } from "../agents/hypothesizer.js";
import { runArchitect } from "../agents/architect.js";
import { runSynthesizer } from "../agents/synthesizer.js";

export async function runPipeline(userMessage: string) {
    try {
        const analyst = await runAnalyst(userMessage);
        console.log("A:", analyst);
        const hypothesizer = await runHypothesizer(analyst);
        console.log("B:", hypothesizer);
        const architect = await runArchitect(hypothesizer);
        console.log("C:", architect);
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