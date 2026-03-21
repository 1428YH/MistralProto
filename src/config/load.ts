import dotenv from "dotenv";
dotenv.config();
const key = process.env.MISTRAL_KEY;

export async function loadKey() {
  if (!key) throw new Error("API_KEY_ERROR");

  return key;
};