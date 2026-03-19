import dotenv from "dotenv";
dotenv.config()

export function loadKey() {
    const token = process.env.TOKEN 
    if (!token) throw new Error("Token is not set .env")

    return token
}