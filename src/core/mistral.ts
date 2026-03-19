import { Mistral } from "@mistralai/mistralai";
import { loadKey } from "../config/load.js";

const mistral = new Mistral({apiKey: await loadKey()})

interface callAgentOptions {
    userMessage: string;
    systemPrompt: string;
    temperature:  number;
}

export async function callAgent(a:callAgentOptions) {
    try {
        const response = await mistral.chat.complete({
            model: "mistral-small-latest",
            temperature: a.temperature,
            messages: [
                { role: "system", content: a.systemPrompt},
                { role: "user", content: a.userMessage}
            ]
        })

        return response
    } catch {
        throw new Error("MISTRAL_ERROR_REQUEST")
    }
}