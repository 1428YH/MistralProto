import pg from "pg";
import { readFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let pool: pg.Pool | null = null;

export function getPool(databaseUrl: string): pg.Pool {
    if (!pool) {
        pool = new pg.Pool({
            connectionString: databaseUrl,
            max: 10,
        });
    }
    return pool;
}

export async function runMigrations(databaseUrl: string): Promise<void> {
    const client = new pg.Client({ connectionString: databaseUrl });
    await client.connect();
    try {
        const sql = await readFile(
            join(__dirname, "../../migrations/001_init.sql"),
            "utf-8"
        );
        await client.query(sql);
    } finally {
        await client.end();
    }
}

export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
