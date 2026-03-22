import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import multer from "multer";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { runPipeline } from "./core/pipeline.js";
import { loadConfig } from "./config/load.js";
import { getPool, runMigrations } from "./db/client.js";
import * as db from "./db/repositories.js";
import { runBRparser } from "./agents/BRparser.js";
import { runUIGenerator } from "./agents/UIGenerator.js";
import { runCODEREVIEW } from "./agents/CODEREVIEW.js";
import {
    extractTextFromBuffer,
    getFormatFromFilename,
    type ExtractFormat,
} from "./utilities/extractText.js";
import type {
    BRSpec,
    UIGeneratorRetryContext,
    CodeReviewReport,
} from "./types.js";
import { isBRSpec } from "./types.js";

const MIN_QUERY_LEN = 10;
const MAX_QUERY_LEN = 5000;
const MAX_FILE_SIZE = 10 * 1024 * 1024; 
const OUTPUT_DIR = "output";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        const format = getFormatFromFilename(file.originalname);
        if (format) {
            cb(null, true);
        } else {
            cb(new Error("Unsupported format. Use .txt, .pdf, or .docx"));
        }
    },
});

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

let _pool: import("pg").Pool | null = null;
app.use((req, _res, next) => {
    if (_pool) req.pool = _pool;
    next();
});

declare global {
    namespace Express {
        interface Request {
            pool?: import("pg").Pool;
            sessionId?: string;
            dialogueId?: string;
        }
    }
}

function apiError(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) {
    console.error("[API] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
}

function strParam(val: unknown): string | null {
    return typeof val === "string" ? val : null;
}

function validateMessage(
    message: unknown
): { ok: true; value: string } | { ok: false; error: string } {
    if (!message || typeof message !== "string") {
        return { ok: false, error: "Field 'message' (string) is required" };
    }
    const trimmed = message.trim();
    if (!trimmed) return { ok: false, error: "Message cannot be empty" };
    if (trimmed.length < MIN_QUERY_LEN) {
        return {
            ok: false,
            error: `Message too short (min ${MIN_QUERY_LEN} chars)`,
        };
    }
    if (trimmed.length > MAX_QUERY_LEN) {
        return {
            ok: false,
            error: `Message too long (max ${MAX_QUERY_LEN} chars)`,
        };
    }
    return { ok: true, value: trimmed };
}

app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Sessions ──────────────────────────────────────────────────────────────

app.post("/api/sessions", async (req: Request, res: Response) => {
    const pool = req.pool;
    if (!pool) {
        res.status(503).json({ error: "Database not configured" });
        return;
    }
    const session = await db.createSession(pool);
    res.status(201).json({ id: session.id, created_at: session.created_at });
});

app.get("/api/sessions/:id", async (req: Request, res: Response) => {
    const pool = req.pool;
    if (!pool) {
        res.status(503).json({ error: "Database not configured" });
        return;
    }
    const id = strParam(req.params.id);
    if (!id) {
        res.status(400).json({ error: "Invalid session id" });
        return;
    }
    const session = await db.getSession(pool, id);
    if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
    }
    res.json(session);
});

// ─── Dialogues ─────────────────────────────────────────────────────────────

app.post("/api/sessions/:sessionId/dialogues", async (req: Request, res: Response) => {
    const pool = req.pool;
    if (!pool) {
        res.status(503).json({ error: "Database not configured" });
        return;
    }
    const sessionId = strParam(req.params.sessionId);
    if (!sessionId) {
        res.status(400).json({ error: "Invalid session id" });
        return;
    }
    const { title } = req.body as { title?: string };
    const session = await db.getSession(pool, sessionId);
    if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
    }
    const dialogue = await db.createDialogue(pool, sessionId, title);
    res.status(201).json(dialogue);
});

app.get("/api/sessions/:sessionId/dialogues", async (req: Request, res: Response) => {
    const pool = req.pool;
    if (!pool) {
        res.status(503).json({ error: "Database not configured" });
        return;
    }
    const sessionId = strParam(req.params.sessionId);
    if (!sessionId) {
        res.status(400).json({ error: "Invalid session id" });
        return;
    }
    const session = await db.getSession(pool, sessionId);
    if (!session) {
        res.status(404).json({ error: "Session not found" });
        return;
    }
    const dialogues = await db.listDialogues(pool, sessionId);
    res.json({ dialogues });
});

app.get("/api/dialogues/:id", async (req: Request, res: Response) => {
    const pool = req.pool;
    if (!pool) {
        res.status(503).json({ error: "Database not configured" });
        return;
    }
    const id = strParam(req.params.id);
    if (!id) {
        res.status(400).json({ error: "Invalid dialogue id" });
        return;
    }
    const sessionId = typeof req.query.session_id === "string" ? req.query.session_id : undefined;
    const dialogue = await db.getDialogue(pool, id, sessionId);
    if (!dialogue) {
        res.status(404).json({ error: "Dialogue not found" });
        return;
    }
    const messages = await db.listMessagesWithGenerations(pool, id);
    res.json({ ...dialogue, messages });
});

app.post("/api/dialogues/:id/send", async (req: Request, res: Response) => {
    const pool = req.pool;
    if (!pool) {
        res.status(503).json({ error: "Database not configured" });
        return;
    }
    const dialogueId = strParam(req.params.id);
    if (!dialogueId) {
        res.status(400).json({ error: "Invalid dialogue id" });
        return;
    }
    const { message, spec, retryContext } = req.body as {
        message?: unknown;
        spec?: import("./types.js").BRSpec;
        retryContext?: import("./types.js").UIGeneratorRetryContext;
    };

    const validation = validateMessage(message);
    if (!validation.ok) {
        res.status(400).json({ error: validation.error });
        return;
    }

    const dialogue = await db.getDialogue(pool, dialogueId);
    if (!dialogue) {
        res.status(404).json({ error: "Dialogue not found" });
        return;
    }

    const userMessage = await db.createUserMessage(pool, dialogueId, validation.value);
    const result = await runPipeline(validation.value, {
        ...(spec && { spec }),
        ...(retryContext && { retryContext }),
        skipServer: true,
    });

    if (!result) {
        res.status(500).json({ error: "Pipeline failed to process request" });
        return;
    }

    const generation = await db.createGeneration(
        pool,
        result.spec,
        result.html,
        result.codeReview
    );
    const title = dialogue.title || result.spec.project_name?.slice(0, 80) || "Dialogue";
    if (!dialogue.title) {
        await db.updateDialogueTitle(pool, dialogueId, title);
    }
    await db.touchDialogue(pool, dialogueId);
    await db.createAssistantMessage(
        pool,
        dialogueId,
        generation.id,
        result.spec.project_name ?? ""
    );

    res.status(201).json({
        messageId: userMessage.id,
        spec: result.spec,
        html: result.html,
        codeReview: result.codeReview,
    });
});

// ─── Generate (full pipeline) ─────────────────────────────────────────────

interface GenerateBody {
    message: string;
    spec?: BRSpec;
    retryContext?: UIGeneratorRetryContext;
}

app.post("/api/generate", async (req: Request, res: Response) => {
    const body = req.body as GenerateBody;
    const { message, spec, retryContext } = body;

    const validation = validateMessage(message);
    if (!validation.ok) {
        res.status(400).json({ error: validation.error });
        return;
    }

    const result = await runPipeline(validation.value, {
        ...(spec && { spec }),
        ...(retryContext && { retryContext }),
        skipServer: true,
    });

    if (!result) {
        res.status(500).json({ error: "Pipeline failed to process request" });
        return;
    }

    res.json({
        spec: result.spec,
        html: result.html,
        codeReview: result.codeReview,
    });
});

// ─── Parse (BRparser only) ────────────────────────────────────────────────

app.post("/api/parse", async (req: Request, res: Response) => {
    const { message } = req.body as { message?: unknown };

    const validation = validateMessage(message);
    if (!validation.ok) {
        res.status(400).json({ error: validation.error });
        return;
    }

    const spec = await runBRparser(validation.value);
    if (!spec || !isBRSpec(spec)) {
        res.status(500).json({ error: "BRparser failed to produce valid spec" });
        return;
    }

    res.json({ spec });
});

// ─── Generate UI (UIGenerator from spec) ──────────────────────────────────

interface GenerateUIBody {
    spec: BRSpec;
    retryContext?: UIGeneratorRetryContext;
}

app.post("/api/generate-ui", async (req: Request, res: Response) => {
    const body = req.body as GenerateUIBody;
    const { spec, retryContext } = body;

    if (!spec || !isBRSpec(spec)) {
        res.status(400).json({ error: "Field 'spec' (valid BRSpec) is required" });
        return;
    }

    const html = await runUIGenerator(spec, retryContext);
    if (!html) {
        res.status(500).json({ error: "UIGenerator failed to produce HTML" });
        return;
    }

    res.json({ html });
});

// ─── Review (Code review only) ────────────────────────────────────────────

interface ReviewBody {
    html: string;
    spec: BRSpec;
    userMessage?: string;
}

app.post("/api/review", async (req: Request, res: Response) => {
    const body = req.body as ReviewBody;
    const { html, spec, userMessage } = body;

    if (!html || typeof html !== "string") {
        res.status(400).json({ error: "Field 'html' (string) is required" });
        return;
    }
    if (!spec || !isBRSpec(spec)) {
        res.status(400).json({ error: "Field 'spec' (valid BRSpec) is required" });
        return;
    }

    const codeReview = await runCODEREVIEW(html, {
        spec,
        ...(userMessage !== undefined && userMessage !== "" && { userMessage }),
    });
    if (!codeReview) {
        res.status(500).json({ error: "Code review failed" });
        return;
    }

    res.json({
        codeReview,
        fixedHtml: codeReview.file ?? html,
    });
});

// ─── Upload (extract text from file) ──────────────────────────────────────

app.post(
    "/api/upload",
    upload.single("file"),
    async (req: Request, res: Response) => {
        if (!req.file) {
            res.status(400).json({
                error: "No file. Send multipart/form-data with field 'file' (.txt, .pdf, .docx)",
            });
            return;
        }

        const format = getFormatFromFilename(req.file.originalname) as ExtractFormat;
        const text = await extractTextFromBuffer(req.file.buffer, format);

        if (!text) {
            res.status(500).json({ error: "Failed to extract text from file" });
            return;
        }

        if (text.length < MIN_QUERY_LEN) {
            res.status(400).json({
                error: `Extracted text too short (${text.length} chars, min ${MIN_QUERY_LEN})`,
            });
            return;
        }

        res.json({
            filename: req.file.originalname,
            content: text,
            length: text.length,
        });
    }
);

// ─── Save (write HTML to file) ────────────────────────────────────────────

interface SaveBody {
    html: string;
    projectName?: string;
}

app.post("/api/save", async (req: Request, res: Response) => {
    const body = req.body as SaveBody;
    const { html, projectName } = body;

    if (!html || typeof html !== "string") {
        res.status(400).json({ error: "Field 'html' (string) is required" });
        return;
    }

    await mkdir(OUTPUT_DIR, { recursive: true });
    const safeName = (projectName ?? "prototype")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 40);
    const filename = `${safeName}-${Date.now()}.html`;
    const filepath = join(process.cwd(), OUTPUT_DIR, filename);
    await writeFile(filepath, html, "utf-8");

    res.json({ filepath, filename });
});

// ─── Retry (generate with code review feedback) ────────────────────────────

interface RetryBody {
    message: string;
    spec: BRSpec;
    report: CodeReviewReport;
    userContext?: string;
    currentHtml?: string;
    changes?: Array<{ type: string; description: string }>;
}

app.post("/api/retry", async (req: Request, res: Response) => {
    const body = req.body as RetryBody;
    const { message, spec, report, userContext, currentHtml, changes } = body;

    const validation = validateMessage(message);
    if (!validation.ok) {
        res.status(400).json({ error: validation.error });
        return;
    }
    if (!spec || !isBRSpec(spec)) {
        res.status(400).json({ error: "Field 'spec' (valid BRSpec) is required" });
        return;
    }
    if (!report || !Array.isArray(report.critical)) {
        res.status(400).json({ error: "Field 'report' with { critical, warnings?, info? } is required" });
        return;
    }

    const retryContext: UIGeneratorRetryContext = {
        report: {
            critical: report.critical ?? [],
            warnings: report.warnings ?? [],
            info: report.info ?? [],
        },
        ...(userContext && { userContext }),
        ...(currentHtml && { currentHtml }),
        ...(changes && changes.length > 0 && { changes }),
    };

    const result = await runPipeline(validation.value, {
        spec,
        retryContext,
        skipServer: true,
    });

    if (!result) {
        res.status(500).json({ error: "Pipeline failed on retry" });
        return;
    }

    res.json({
        spec: result.spec,
        html: result.html,
        codeReview: result.codeReview,
    });
});

// ─── Multer error handler ─────────────────────────────────────────────────

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            res.status(400).json({
                error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024} MB`,
            });
            return;
        }
    }
    next(err);
});

app.use(apiError);

// ─── Start ───────────────────────────────────────────────────────────────

async function main() {
    const config = await loadConfig();
    const port = config.apiPort;

    if (config.databaseUrl) {
        await runMigrations(config.databaseUrl);
        _pool = getPool(config.databaseUrl);
        console.log("[API] PostgreSQL connected");
    } else {
        console.warn("[API] DATABASE_URL not set — sessions/dialogues disabled");
    }

    app.listen(port, () => {
        console.log(`[API] Express server at http://localhost:${port}`);
        console.log("[API] Endpoints:");
        console.log("  GET  /api/health                      - health check");
        if (config.databaseUrl) {
            console.log("  POST /api/sessions                    - create session");
            console.log("  GET  /api/sessions/:id                - get session");
            console.log("  POST /api/sessions/:id/dialogues      - create dialogue");
            console.log("  GET  /api/sessions/:id/dialogues      - list dialogues");
            console.log("  GET  /api/dialogues/:id               - get dialogue + messages (?session_id=)");
            console.log("  POST /api/dialogues/:id/send          - send message, run pipeline, save");
        }
        console.log("  POST /api/generate    - full pipeline (message, spec?, retryContext?)");
        console.log("  POST /api/parse       - parse requirements → spec");
        console.log("  POST /api/generate-ui - generate HTML from spec");
        console.log("  POST /api/review      - code review (html + spec)");
        console.log("  POST /api/upload      - upload .txt/.pdf/.docx, extract text");
        console.log("  POST /api/save        - save HTML to output/");
        console.log("  POST /api/retry       - retry with code review feedback");
    });
}

main().catch((err) => {
    console.error("Failed to start API:", err);
    process.exit(1);
});
