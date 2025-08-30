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

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_teachers_qualifications ON teachers(qualifications);
CREATE INDEX IF NOT EXISTS idx_courses_topic ON courses(topic);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);

-- Insert default settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES 
    ('ai_model', 'claude-3-haiku-20240307'),
    ('ai_api_key', ''),
    ('calendar_view', 'month'),
    ('theme', 'light'),
    ('data_version', '1.0');

-- Trigger to update updated_at timestamp automatically
CREATE TRIGGER IF NOT EXISTS update_teachers_timestamp 
    AFTER UPDATE ON teachers
    FOR EACH ROW
BEGIN
    UPDATE teachers SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_courses_timestamp 
    AFTER UPDATE ON courses
    FOR EACH ROW
BEGIN
    UPDATE courses SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_assignments_timestamp 
    AFTER UPDATE ON assignments
    FOR EACH ROW
BEGIN
    UPDATE assignments SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_settings_timestamp 
    AFTER UPDATE ON app_settings
    FOR EACH ROW
BEGIN
    UPDATE app_settings SET updated_at = CURRENT_TIMESTAMP WHERE key = OLD.key;
END;