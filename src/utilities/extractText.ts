import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

export type ExtractFormat = "txt" | "pdf" | "docx";

export async function extractTextFromBuffer(
    buffer: Buffer,
    format: ExtractFormat
): Promise<string | null> {
    try {
        if (format === "txt") {
            return buffer.toString("utf-8");
        }

        if (format === "pdf") {
            const parser = new PDFParse({ data: buffer });
            try {
                const result = await parser.getText();
                return result.text ?? "";
            } finally {
                await parser.destroy();
            }
        }

        if (format === "docx") {
            const result = await mammoth.extractRawText({ buffer });
            return result.value ?? "";
        }

        return null;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[extractText] Failed: ${msg}`);
        return null;
    }
}

export function getFormatFromMime(mime: string): ExtractFormat | null {
    const map: Record<string, ExtractFormat> = {
        "text/plain": "txt",
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    };
    return map[mime] ?? null;
}

export function getFormatFromFilename(filename: string): ExtractFormat | null {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".txt")) return "txt";
    if (lower.endsWith(".pdf")) return "pdf";
    if (lower.endsWith(".docx")) return "docx";
    return null;
}
