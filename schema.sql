-- Task Management System — Database Schema
-- Run automatically by app.py on first launch (see init_db()).

DROP TABLE IF EXISTS tasks;

CREATE TABLE tasks (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    title       TEXT    NOT NULL,
    description TEXT    DEFAULT '',
    category    TEXT    DEFAULT 'General',
    priority    TEXT    NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high')),
    status      TEXT    NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'in_progress', 'done')),
    due_date    TEXT    DEFAULT NULL,          -- ISO date: YYYY-MM-DD
    created_at  TEXT    NOT NULL,              -- ISO datetime
    updated_at  TEXT    NOT NULL               -- ISO datetime
);

CREATE INDEX idx_tasks_status   ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- A few starter rows so the board isn't empty on first run.
INSERT INTO tasks (title, description, category, priority, status, due_date, created_at, updated_at) VALUES
('Set up project repository', 'Initialize git, add README, push first commit.', 'Setup', 'medium', 'done', DATE('now'), DATETIME('now'), DATETIME('now')),
('Design database schema', 'Model tasks table with priority and status fields.', 'Backend', 'high', 'done', DATE('now'), DATETIME('now'), DATETIME('now')),
('Build REST API', 'CRUD endpoints for tasks using Flask.', 'Backend', 'high', 'in_progress', DATE('now', '+1 day'), DATETIME('now'), DATETIME('now')),
('Style the dashboard', 'Apply the mission-log visual theme across the UI.', 'Frontend', 'medium', 'pending', DATE('now', '+2 day'), DATETIME('now'), DATETIME('now')),
('Write project README', 'Document setup, API routes, and run instructions.', 'Docs', 'low', 'pending', DATE('now', '+3 day'), DATETIME('now'), DATETIME('now'));
