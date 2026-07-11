# 🛰️ Task Control — Mission Log Task Manager

A full-stack task management dashboard built with **Flask**, **SQLite**, and vanilla **JavaScript/HTML/CSS**, styled as a "mission log" — track tasks through Pending → In Progress → Done with a clean Kanban-style board.



---

## ✨ Features

- **Full CRUD** — create, read, update, and delete tasks
- **Kanban board** — three columns (Pending, In Progress, Done) with drag-and-drop and click-to-cycle status
- **Priority levels** — low / medium / high, shown as color-coded badges
- **Due date tracking** — live "due in N days" / "overdue by N days" labels
- **Categories, search & filters** — free-text search plus priority/category filtering
- **Live dashboard stats** — completion %, per-status counts, and open high-priority task count
- **Persistent storage** — all data saved server-side in SQLite; nothing is lost on refresh

---

## 🧱 Tech Stack

| Layer      | Technology                              |
|------------|-------------------------------------------|
| Backend    | Python 3, Flask, REST API                 |
| Database   | SQLite (`schema.sql`)                     |
| Frontend   | Vanilla JavaScript (Fetch API), HTML5, CSS3 |

---

## 📁 Project Structure

```
taskapp/
├── app.py              # Flask app + REST API routes
├── schema.sql           # SQL schema (auto-run on first launch)
├── requirements.txt      # Python dependencies
├── templates/
│   └── index.html         # Page markup
├── static/
│   ├── style.css           # Styling
│   └── script.js            # Frontend logic (API calls, rendering, modal)
└── tasks.db               # Auto-created SQLite database file
```

---

## 🚀 Getting Started

```bash
# 1. Navigate into the project
cd taskapp

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the app
python app.py
```

Then open **http://127.0.0.1:5000** in your browser.

> The database (`tasks.db`) is created automatically on first launch and seeded with 5 example tasks. Delete `tasks.db` at any time to reset to the seed data.

---

## 📡 REST API Reference

| Method   | Route                       | Description                                                     |
|----------|-------------------------------|--------------------------------------------------------------------|
| `GET`    | `/api/tasks`                  | List tasks (supports `?status=`, `?priority=`, `?category=`, `?search=`) |
| `POST`   | `/api/tasks`                  | Create a task                                                     |
| `GET`    | `/api/tasks/<id>`               | Get a single task                                                  |
| `PUT`    | `/api/tasks/<id>`               | Update a task                                                      |
| `PATCH`  | `/api/tasks/<id>/toggle`         | Cycle status: `pending → in_progress → done → pending`               |
| `DELETE` | `/api/tasks/<id>`               | Delete a task                                                      |
| `GET`    | `/api/stats`                    | Dashboard summary statistics                                       |

### Example Task Payload

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

---

## 📝 Notes

- Single command to run: `python app.py` (after installing dependencies).
- No external services or API keys required — everything runs locally with SQLite.
- Code is cleanly separated by concern: `app.py` (Python/SQL layer), `templates/` + `static/` (HTML/CSS/JS layer).

---

## 📄 License

This project is available for personal and educational use.
