-- Teacher Course Assignment Application - Database Schema
-- SQLite database schema for local data storage

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Set WAL mode for better performance
PRAGMA journal_mode = WAL;

-- Teachers table with qualifications and availability
CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    qualifications TEXT NOT NULL,        -- JSON array of qualification strings
    working_times TEXT,          -- JSON object for availability
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Courses requiring specific qualifications
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic TEXT NOT NULL,         -- Must match teacher qualifications exactly
    lessons_count INTEGER NOT NULL,
    lesson_duration INTEGER NOT NULL,  -- Minutes per lesson
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assignment relationships
CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    scheduled_slots TEXT,        -- JSON array of time slots
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending', 'cancelled')),
    ai_rationale TEXT,          -- AI explanation for assignment
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, course_id)  -- Prevent duplicate assignments
);

-- Application settings for configuration
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- AI weighting configuration profiles
CREATE TABLE IF NOT EXISTS weighting_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_name TEXT NOT NULL UNIQUE,
    equality_weight INTEGER NOT NULL DEFAULT 33 CHECK (equality_weight >= 0 AND equality_weight <= 100),
    continuity_weight INTEGER NOT NULL DEFAULT 33 CHECK (continuity_weight >= 0 AND continuity_weight <= 100),
    loyalty_weight INTEGER NOT NULL DEFAULT 34 CHECK (loyalty_weight >= 0 AND loyalty_weight <= 100),
    is_default BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_weights_sum CHECK (equality_weight + continuity_weight + loyalty_weight = 100)
);

-- AI chat conversation history
CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant', 'system')),
    message_content TEXT NOT NULL,
    context_data TEXT,              -- JSON string of relevant assignment data
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Chat conversation metadata
CREATE TABLE IF NOT EXISTS chat_conversations (
    id TEXT PRIMARY KEY,            -- conversation_id from chat_history
    title TEXT NOT NULL,
    context_snapshot TEXT,          -- JSON snapshot of assignment context
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teachers_qualifications ON teachers(qualifications);
CREATE INDEX IF NOT EXISTS idx_courses_topic ON courses(topic);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_weighting_settings_default ON weighting_settings(is_default);
CREATE INDEX IF NOT EXISTS idx_chat_history_conversation ON chat_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated ON chat_conversations(updated_at);

-- Insert default settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES 
    ('ai_model', 'claude-sonnet-4-20250514'),
    ('ai_api_key', ''),
    ('ai_max_tokens', '4000'),
    ('ai_temperature', '0.3'),
    ('calendar_view', 'month'),
    ('theme', 'light'),
    ('data_version', '1.1');

-- Insert default weighting settings profiles
INSERT OR IGNORE INTO weighting_settings (profile_name, equality_weight, continuity_weight, loyalty_weight, is_default) VALUES 
    ('Balanced', 33, 33, 34, 1),
    ('Emergency', 60, 40, 0, 0),
    ('Continuity Focus', 25, 60, 15, 0),
    ('Loyalty Priority', 20, 20, 60, 0),
    ('Equal Distribution', 80, 10, 10, 0);

-- Note: Triggers removed for initial setup to avoid syntax compatibility issues
-- Can be added later if needed for timestamp management