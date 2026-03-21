import { callAgent } from "../core/mistral.js";
import { ARCHITECT_PROMPT } from "../prompts/architect.prompt.js";
import { safeParse } from "../utilities/parse.js";

export async function runArchitect(hypothesizer: any) {
  try {
    const result = await callAgent({
      userMessage: JSON.stringify(hypothesizer),
      systemPrompt: ARCHITECT_PROMPT,
      temperature: 0.4,
    });

    return safeParse(result);
  } catch (error) {
    console.error("Architect error: ", error);
    throw new Error("ERROR_ARCHITECT");
  };
};