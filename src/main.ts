import PromptSync from "prompt-sync";
import { runPipeline } from "./core/pipeline.js";

const prompt = PromptSync();

console.log("Welcome to the Mistral prototype! Enter your query or type 'exit' to quit.");

async function loop() {
    const message = prompt("Enter your query:");
    if (message === "exit") {
        console.log("Goodbye!");
        process.exit(0);
    }
    try {
        const result = await runPipeline(message);
        console.log("Pipeline completed ✅");
        console.log(result);
    } catch (error) {
        console.error("Error:", error);
    }
    loop();
}

loop();