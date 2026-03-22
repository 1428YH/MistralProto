import type { Pool } from "pg";
import type { BRSpec, CodeReviewResult } from "../types.js";

export interface Session {
    id: string;
    created_at: Date;
}

export interface Dialogue {
    id: string;
    session_id: string;
    title: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface Message {
    id: string;
    dialogue_id: string;
    role: "user" | "assistant";
    content: string;
    generation_id: string | null;
    created_at: Date;
}

export interface Generation {
    id: string;
    spec: BRSpec;
    html: string;
    code_review: CodeReviewResult;
    status: "pass" | "fail";
    created_at: Date;
}

export interface MessageWithGeneration extends Message {
    generation?: Generation;
}

export async function createSession(pool: Pool): Promise<Session> {
    const r = await pool.query(
        "INSERT INTO sessions DEFAULT VALUES RETURNING id, created_at"
    );
    return r.rows[0] as Session;
}

export async function getSession(pool: Pool, id: string): Promise<Session | null> {
    const r = await pool.query("SELECT id, created_at FROM sessions WHERE id = $1", [
        id,
    ]);
    return (r.rows[0] as Session) ?? null;
}

export async function createDialogue(
    pool: Pool,
    sessionId: string,
    title?: string
): Promise<Dialogue> {
    const r = await pool.query(
        `INSERT INTO dialogues (session_id, title) VALUES ($1, $2)
         RETURNING id, session_id, title, created_at, updated_at`,
        [sessionId, title ?? null]
    );
    return r.rows[0] as Dialogue;
}

export async function getDialogue(
    pool: Pool,
    id: string,
    sessionId?: string
): Promise<Dialogue | null> {
    let query = "SELECT id, session_id, title, created_at, updated_at FROM dialogues WHERE id = $1";
    const params: string[] = [id];
    if (sessionId) {
        query += " AND session_id = $2";
        params.push(sessionId);
    }
    const r = await pool.query(query, params);
    return (r.rows[0] as Dialogue) ?? null;
}

export async function listDialogues(
    pool: Pool,
    sessionId: string
): Promise<Dialogue[]> {
    const r = await pool.query(
        `SELECT id, session_id, title, created_at, updated_at FROM dialogues
         WHERE session_id = $1 ORDER BY updated_at DESC`,
        [sessionId]
    );
    return r.rows as Dialogue[];
}

export async function updateDialogueTitle(
    pool: Pool,
    id: string,
    title: string
): Promise<void> {
    await pool.query(
        "UPDATE dialogues SET title = $1, updated_at = NOW() WHERE id = $2",
        [title, id]
    );
}

export async function touchDialogue(pool: Pool, id: string): Promise<void> {
    await pool.query("UPDATE dialogues SET updated_at = NOW() WHERE id = $1", [id]);
}

export async function createUserMessage(
    pool: Pool,
    dialogueId: string,
    content: string
): Promise<Message> {
    const r = await pool.query(
        `INSERT INTO messages (dialogue_id, role, content) VALUES ($1, 'user', $2)
         RETURNING id, dialogue_id, role, content, generation_id, created_at`,
        [dialogueId, content]
    );
    return r.rows[0] as Message;
}

export async function createGeneration(
    pool: Pool,
    spec: BRSpec,
    html: string,
    codeReview: CodeReviewResult
): Promise<Generation> {
    const status = (codeReview.status === "pass" ? "pass" : "fail") as "pass" | "fail";
    const r = await pool.query(
        `INSERT INTO generations (spec, html, code_review, status)
         VALUES ($1, $2, $3, $4)
         RETURNING id, spec, html, code_review, status, created_at`,
        [JSON.stringify(spec), html, JSON.stringify(codeReview), status]
    );
    return r.rows[0] as Generation;
}

export async function createAssistantMessage(
    pool: Pool,
    dialogueId: string,
    generationId: string,
    content?: string
): Promise<Message> {
    const r = await pool.query(
        `INSERT INTO messages (dialogue_id, role, content, generation_id)
         VALUES ($1, 'assistant', $2, $3)
         RETURNING id, dialogue_id, role, content, generation_id, created_at`,
        [dialogueId, content ?? "", generationId]
    );
    return r.rows[0] as Message;
}

export async function listMessagesWithGenerations(
    pool: Pool,
    dialogueId: string
): Promise<MessageWithGeneration[]> {
    const r = await pool.query(
        `SELECT m.id, m.dialogue_id, m.role, m.content, m.generation_id, m.created_at,
                g.id AS g_id, g.spec, g.html, g.code_review, g.status AS g_status, g.created_at AS g_created_at
         FROM messages m
         LEFT JOIN generations g ON m.generation_id = g.id
         WHERE m.dialogue_id = $1
         ORDER BY m.created_at ASC`,
        [dialogueId]
    );
    return r.rows.map((row) => ({
        id: row.id,
        dialogue_id: row.dialogue_id,
        role: row.role,
        content: row.content,
        generation_id: row.generation_id,
        created_at: row.created_at,
        ...(row.g_id && {
            generation: {
                id: row.g_id,
                spec: row.spec,
                html: row.html,
                code_review: row.code_review,
                status: row.g_status,
                created_at: row.g_created_at,
            },
        }),
    })) as MessageWithGeneration[];
}
