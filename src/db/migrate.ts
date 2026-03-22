import "dotenv/config";
import { runMigrations } from "./client.js";

const url = process.env.DATABASE_URL;
if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
}

runMigrations(url)
    .then(() => console.log("Migrations completed"))
    .catch((err) => {
        console.error("Migration failed:", err);
        process.exit(1);
    });
