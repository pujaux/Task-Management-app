# Task Control — Task Management System

A full-stack, interactive task manager: **Python (Flask)** backend, **SQLite (SQL)** database,
and a **JavaScript / HTML / CSS** single-page dashboard styled as a "mission log."

## Tech stack

| Layer     | Tech                                   |
|-----------|-----------------------------------------|
| Backend   | Python 3, Flask, REST API               |
| Database  | SQLite (`schema.sql`)                   |
| Frontend  | Vanilla JavaScript (fetch API), HTML5, CSS3 |

## Features

- Create, read, update, delete tasks (full CRUD)
- Three-column Kanban board: **Pending → In Progress → Done** (click a card's action button to cycle status)
- Priority levels (low / medium / high) with color-coded badges
- Due dates with live "due in Nd / overdue by Nd" countdown labels
- Categories, free-text search, and priority/category filters
- Live dashboard stats: completion %, counts per status, open high-priority tasks
- All data persisted server-side in SQLite — nothing is lost on refresh

## Project structure

```
taskapp/
├── app.py              # Flask app + REST API routes
├── schema.sql           # SQL schema (auto-run on first launch)
├── requirements.txt
├── templates/
│   └── index.html        # Page markup
├── static/
│   ├── style.css          # Styling (dark "mission log" theme)
│   └── script.js           # Frontend logic (fetch calls, rendering, modal)
└── tasks.db              # Created automatically on first run (SQLite file)
```

## How to run

```bash
cd taskapp
pip install -r requirements.txt
python app.py
```

Then open **http://127.0.0.1:5000** in your browser.

The database (`tasks.db`) is created automatically on first launch, seeded
with 5 example tasks so the board isn't empty. Delete `tasks.db` at any time
to reset to the seed data.

## REST API reference

| Method | Route                     | Description                              |
|--------|----------------------------|-------------------------------------------|
| GET    | `/api/tasks`                | List tasks (supports `?status=`, `?priority=`, `?category=`, `?search=`) |
| POST   | `/api/tasks`                | Create a task                             |
| GET    | `/api/tasks/<id>`            | Get one task                              |
| PUT    | `/api/tasks/<id>`            | Update a task                             |
| PATCH  | `/api/tasks/<id>/toggle`      | Cycle status: pending → in_progress → done → pending |
| DELETE | `/api/tasks/<id>`            | Delete a task                             |
| GET    | `/api/stats`                 | Dashboard summary stats                   |

### Example task JSON

```json
{
  "title": "Write project README",
  "description": "Document setup and API routes.",
  "category": "Docs",
  "priority": "medium",
  "status": "pending",
  "due_date": "2026-07-12"
}
```

## Notes for submission

- Single command to run: `python app.py` (after `pip install -r requirements.txt`).
- No external services or API keys required — everything runs locally with SQLite.
- Code is organized by concern: `app.py` (Python/SQL layer), `templates/`+`static/`
  (HTML/CSS/JS layer), matching a typical assignment rubric of "Python + SQL + JS + HTML + CSS."
