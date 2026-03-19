import dotenv from "dotenv";
dotenv.config();

export async function loadKey() {
    const key = process.env.MISTRAL_KEY;
    if (!key) throw new Error("API_KEY_ERROR");

    return key
}