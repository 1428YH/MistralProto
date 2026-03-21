import dotenv from "dotenv";
dotenv.config();

export async function loadKey(): Promise<string> {
    const key = process.env.MISTRAL_KEY;
    if (!key) throw new Error("API_KEY_ERROR");
    return key;
}

export interface AppConfig {
    mistralKey: string;
    mistralModel: string;
    serverPort: number;
    apiRetries: number;
}

export async function loadConfig(): Promise<AppConfig> {
    const key = await loadKey();
    return {
        mistralKey: key,
        mistralModel: process.env.MISTRAL_MODEL ?? "mistral-small-latest",
        serverPort: Number(process.env.SERVER_PORT) || 3000,
        apiRetries: Math.max(0, Number(process.env.API_RETRIES) || 3),
    };
}