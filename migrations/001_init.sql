-- Sessions: API sessions (anonymous or identified)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dialogues: conversation threads within a session
CREATE TABLE IF NOT EXISTS dialogues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dialogues_session_id ON dialogues(session_id);

-- Generations: pipeline results (spec, html, code_review)
CREATE TABLE IF NOT EXISTS generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    spec JSONB NOT NULL,
    html TEXT NOT NULL,
    code_review JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pass', 'fail')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages: user and assistant messages in a dialogue
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dialogue_id UUID NOT NULL REFERENCES dialogues(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL DEFAULT '',
    generation_id UUID REFERENCES generations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_dialogue_id ON messages(dialogue_id);
