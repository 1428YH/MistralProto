import { Mistral } from "@mistralai/mistralai";
import { loadKey } from "../config/load.js";

const mistral = new Mistral({ apiKey: await loadKey() });

interface callAgentOptions {
  userMessage: string;
  systemPrompt: string;
  temperature: number;
};

export async function callAgent(a: callAgentOptions) {
  try {
    const response = await mistral.chat.complete({
      model: "mistral-small-latest",
      temperature: a.temperature,
      messages: [
        { role: "system", content: a.systemPrompt },
        { role: "user", content: a.userMessage }
      ]
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("Empty response");

    return content as string;
  } catch (error) {
    console.error("Mistral error: ", error);
    throw new Error("MISTRAL_ERROR_REQUEST");
  };
};