import { readFile } from "fs/promises";
import { resolve } from "path";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const SUPPORTED_EXT = [".pdf", ".docx", ".txt"] as const;

export type SupportedFormat = (typeof SUPPORTED_EXT)[number];

export function isSupportedFile(path: string): path is `${string}${SupportedFormat}` {
    const lower = path.toLowerCase();
    return SUPPORTED_EXT.some((ext) => lower.endsWith(ext));
}

export function getFormat(path: string): SupportedFormat | null {
    const lower = path.toLowerCase();
    const ext = SUPPORTED_EXT.find((e) => lower.endsWith(e));
    return ext ?? null;
}

export async function readFileContent(filePath: string): Promise<string | null> {
    const format = getFormat(filePath);
    if (!format) {
        console.error(`Unsupported format. Supported: ${SUPPORTED_EXT.join(", ")}`);
        return null;
    }

    const resolved = resolve(filePath.trim());

    try {
        if (format === ".txt") {
            const buffer = await readFile(resolved, "utf-8");
            return buffer;
        }

        if (format === ".pdf") {
            const buffer = await readFile(resolved);
            const parser = new PDFParse({ data: buffer });
            try {
                const result = await parser.getText();
                return result.text ?? "";
            } finally {
                await parser.destroy();
            }
        }

        if (format === ".docx") {
            const buffer = await readFile(resolved);
            const result = await mammoth.extractRawText({ buffer });
            return result.value ?? "";
        }

        return null;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Failed to read file "${filePath}": ${msg}`);
        return null;
    }
}
