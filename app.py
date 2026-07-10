"""
Task Management System — Backend
Python (Flask) + SQLite (SQL) REST API, serving a JS/HTML/CSS frontend.

Run:
    pip install -r requirements.txt
    python app.py
Then open http://127.0.0.1:5000
"""
"""
Task Management System — Backend
Python (Flask) + SQLite (SQL) REST API, serving a JS/HTML/CSS frontend.
"""
import sqlite3
from datetime import datetime
from pathlib import Path

from flask import Flask, g, jsonify, render_template, request, session, redirect, url_for

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "tasks.db"
SCHEMA_PATH = BASE_DIR / "schema.sql"

app = Flask(__name__)
app.secret_key = "super_secret_deadline_key_123"

# --------------------------------------------------------------------------
# Database helpers
# --------------------------------------------------------------------------
def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create the database from schema.sql if it does not exist yet."""
    fresh = not DB_PATH.exists()
    conn = sqlite3.connect(DB_PATH)
    if fresh:
        with open(SCHEMA_PATH, "r") as f:
            conn.executescript(f.read())
        conn.commit()
    conn.close()


def row_to_dict(row):
    return {k: row[k] for k in row.keys()}


def now_iso():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


VALID_PRIORITIES = {"low", "medium", "high"}
VALID_STATUSES = {"pending", "in_progress", "done"}


# --------------------------------------------------------------------------
# Page route
# --------------------------------------------------------------------------
@app.route("/")
def index():
    if "user_id" not in session:
        return redirect(url_for("login"))
    return render_template("index.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

        db = get_db()
        user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()

        # Direct plaintext match for a quick assignment submission
        if user and user["password"] == password:
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            return redirect(url_for("index"))

        return render_template("login.html", error="Invalid username or password.")

    return render_template("login.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

        if not username or not password:
            return render_template("login.html", error="Fields cannot be empty.", register=True)

        db = get_db()
        try:
            db.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, password))
            db.commit()
            return render_template("login.html", msg="Registration successful! Please login.")
        except sqlite3.IntegrityError:
            return render_template("login.html", error="Username already exists.", register=True)

    return render_template("login.html", register=True)

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# --------------------------------------------------------------------------
# API: list + create
# --------------------------------------------------------------------------
@app.route("/api/tasks", methods=["GET"])
def list_tasks():
    db = get_db()
    status = request.args.get("status")
    priority = request.args.get("priority")
    category = request.args.get("category")
    search = request.args.get("search")

    query = "SELECT * FROM tasks WHERE 1=1"
    params = []

    if status:
        query += " AND status = ?"
        params.append(status)
    if priority:
        query += " AND priority = ?"
        params.append(priority)
    if category:
        query += " AND category = ?"
        params.append(category)
    if search:
        query += " AND (title LIKE ? OR description LIKE ?)"
        like = f"%{search}%"
        params.extend([like, like])

    query += " ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, due_date IS NULL, due_date ASC"

    rows = db.execute(query, params).fetchall()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/tasks", methods=["POST"])
def create_task():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "Title is required."}), 400

    priority = data.get("priority", "medium")
    status = data.get("status", "pending")
    if priority not in VALID_PRIORITIES:
        return jsonify({"error": f"priority must be one of {sorted(VALID_PRIORITIES)}"}), 400
    if status not in VALID_STATUSES:
        return jsonify({"error": f"status must be one of {sorted(VALID_STATUSES)}"}), 400

    db = get_db()
    ts = now_iso()
    cur = db.execute(
        """INSERT INTO tasks (title, description, category, priority, status, due_date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            title,
            data.get("description", ""),
            data.get("category", "General"),
            priority,
            status,
            data.get("due_date"),
            ts,
            ts,
        ),
    )
    db.commit()
    row = db.execute("SELECT * FROM tasks WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(row_to_dict(row)), 201


# --------------------------------------------------------------------------
# API: single-task get / update / delete
# --------------------------------------------------------------------------
@app.route("/api/tasks/<int:task_id>", methods=["GET"])
def get_task(task_id):
    db = get_db()
    row = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Task not found."}), 404
    return jsonify(row_to_dict(row))


@app.route("/api/tasks/<int:task_id>", methods=["PUT"])
def update_task(task_id):
    db = get_db()
    row = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Task not found."}), 404

    data = request.get_json(silent=True) or {}
    title = data.get("title", row["title"]).strip()
    priority = data.get("priority", row["priority"])
    status = data.get("status", row["status"])

    if not title:
        return jsonify({"error": "Title is required."}), 400
    if priority not in VALID_PRIORITIES:
        return jsonify({"error": f"priority must be one of {sorted(VALID_PRIORITIES)}"}), 400
    if status not in VALID_STATUSES:
        return jsonify({"error": f"status must be one of {sorted(VALID_STATUSES)}"}), 400

    db.execute(
        """UPDATE tasks
           SET title = ?, description = ?, category = ?, priority = ?, status = ?, due_date = ?, updated_at = ?
           WHERE id = ?""",
        (
            title,
            data.get("description", row["description"]),
            data.get("category", row["category"]),
            priority,
            status,
            data.get("due_date", row["due_date"]),
            now_iso(),
            task_id,
        ),
    )
    db.commit()
    updated = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return jsonify(row_to_dict(updated))


@app.route("/api/tasks/<int:task_id>/toggle", methods=["PATCH"])
def toggle_task(task_id):
    """Cycle a task through pending -> in_progress -> done -> pending."""
    db = get_db()
    row = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Task not found."}), 404

    order = ["pending", "in_progress", "done"]
    next_status = order[(order.index(row["status"]) + 1) % len(order)]

    db.execute(
        "UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?",
        (next_status, now_iso(), task_id),
    )
    db.commit()
    updated = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return jsonify(row_to_dict(updated))


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    db = get_db()
    row = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
    if row is None:
        return jsonify({"error": "Task not found."}), 404
    db.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    db.commit()
    return jsonify({"deleted": task_id})


# --------------------------------------------------------------------------
# API: stats (for the dashboard header)
# --------------------------------------------------------------------------
@app.route("/api/stats", methods=["GET"])
def stats():
    db = get_db()
    total = db.execute("SELECT COUNT(*) AS c FROM tasks").fetchone()["c"]
    done = db.execute("SELECT COUNT(*) AS c FROM tasks WHERE status='done'").fetchone()["c"]
    in_progress = db.execute("SELECT COUNT(*) AS c FROM tasks WHERE status='in_progress'").fetchone()["c"]
    pending = db.execute("SELECT COUNT(*) AS c FROM tasks WHERE status='pending'").fetchone()["c"]
    high_open = db.execute(
        "SELECT COUNT(*) AS c FROM tasks WHERE priority='high' AND status != 'done'"
    ).fetchone()["c"]
    categories = [r["category"] for r in db.execute("SELECT DISTINCT category FROM tasks ORDER BY category")]

    return jsonify(
        {
            "total": total,
            "done": done,
            "in_progress": in_progress,
            "pending": pending,
            "high_open": high_open,
            "completion_pct": round((done / total) * 100) if total else 0,
            "categories": categories,
        }
    )


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
