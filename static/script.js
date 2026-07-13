/* =========================================================
   Task Control — frontend logic
   Talks to the Flask REST API at /api/tasks
   ========================================================= */

const API = "/api/tasks";

const state = {
  tasks: [],          // currently rendered (filtered) tasks
  allTasks: [],        // unfiltered, used to compute sidebar counts
  filters: { search: "", status: "", priority: "", category: "" },
  editingId: null,
};

// ---------- DOM refs ----------
const els = {
  board: document.getElementById("board"),
  search: document.getElementById("search"),
  filterPriority: document.getElementById("filter-priority"),
  btnClearFilters: document.getElementById("btn-clear-filters"),
  btnNewTask: document.getElementById("btn-new-task"),

  overlay: document.getElementById("modal-overlay"),
  modalTitle: document.getElementById("modal-title"),
  modalClose: document.getElementById("modal-close"),
  form: document.getElementById("task-form"),
  fieldId: document.getElementById("task-id"),
  fieldTitle: document.getElementById("field-title"),
  fieldDescription: document.getElementById("field-description"),
  fieldCategory: document.getElementById("field-category"),
  fieldDue: document.getElementById("field-due"),
  fieldPriority: document.getElementById("field-priority"),
  fieldStatus: document.getElementById("field-status"),
  formError: document.getElementById("form-error"),
  btnCancel: document.getElementById("btn-cancel"),
  btnDelete: document.getElementById("btn-delete"),

  toast: document.getElementById("toast"),

  runwayFill: document.getElementById("runway-fill"),
  runwayPct: document.getElementById("runway-pct"),
  statPending: document.getElementById("stat-pending"),
  statProgress: document.getElementById("stat-progress"),
  statDone: document.getElementById("stat-done"),
  statHigh: document.getElementById("stat-high"),

  boardHeading: document.getElementById("board-heading"),
  boardSubheading: document.getElementById("board-subheading"),
  categoryNav: document.getElementById("category-nav"),

  userAvatar: document.getElementById("user-avatar"),
  userName: document.getElementById("user-name"),
};

const STATUS_LABEL = { pending: "Pending", in_progress: "In progress", done: "Done" };
const STATUS_SUBHEAD = {
  "": "Everything on the board, sorted by priority and due date.",
  pending: "Tasks that haven't been started yet.",
  in_progress: "Tasks currently being worked on.",
  done: "Tasks that have been completed.",
};

// ---------- Utilities ----------
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function taskCode(id) {
  return `TC-${String(id).padStart(4, "0")}`;
}

function dueLabel(dueDateStr) {
  if (!dueDateStr) return { text: "No due date", cls: "" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + "T00:00:00");
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) return { text: `Overdue ${Math.abs(diffDays)}d`, cls: "card__due--overdue" };
  if (diffDays === 0) return { text: "Due today", cls: "card__due--soon" };
  if (diffDays === 1) return { text: "Due tomorrow", cls: "card__due--soon" };
  if (diffDays <= 3) return { text: `Due in ${diffDays}d`, cls: "card__due--soon" };
  return { text: `Due in ${diffDays}d`, cls: "" };
}

// ---------- API calls ----------
async function apiRequest(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong.");
  }
  return data;
}

async function fetchTasks() {
  const params = new URLSearchParams();
  if (state.filters.search) params.set("search", state.filters.search);
  if (state.filters.status) params.set("status", state.filters.status);
  if (state.filters.priority) params.set("priority", state.filters.priority);
  if (state.filters.category) params.set("category", state.filters.category);

  state.tasks = await apiRequest(`${API}?${params.toString()}`);
  render();
}

async function fetchAllForCounts() {
  state.allTasks = await apiRequest(API);
  renderSidebarCounts();
}

async function fetchStats() {
  const stats = await apiRequest("/api/stats");
  els.runwayFill.style.width = `${stats.completion_pct}%`;
  els.runwayPct.textContent = `${stats.completion_pct}%`;
  els.statPending.textContent = stats.pending;
  els.statProgress.textContent = stats.in_progress;
  els.statDone.textContent = stats.done;
  els.statHigh.textContent = stats.high_open;
}

async function refreshAll() {
  await Promise.all([fetchTasks(), fetchStats(), fetchAllForCounts()]);
}

// ---------- Sidebar ----------
function renderSidebarCounts() {
  const all = state.allTasks;
  document.getElementById("nav-count-all").textContent = all.length;
  document.getElementById("nav-count-pending").textContent = all.filter(t => t.status === "pending").length;
  document.getElementById("nav-count-in_progress").textContent = all.filter(t => t.status === "in_progress").length;
  document.getElementById("nav-count-done").textContent = all.filter(t => t.status === "done").length;

  document.querySelectorAll(".nav-btn[data-status-filter]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.statusFilter === state.filters.status);
  });

  const counts = {};
  for (const t of all) {
    const cat = t.category || "General";
    counts[cat] = (counts[cat] || 0) + 1;
  }
  const categories = Object.keys(counts).sort((a, b) => a.localeCompare(b));

  els.categoryNav.innerHTML = categories.map(cat => `
    <button class="nav-btn ${state.filters.category === cat ? "active" : ""}" data-category-filter="${escapeHtml(cat)}">
      <span>${escapeHtml(cat)}</span><span class="nav-btn__count">${counts[cat]}</span>
    </button>
  `).join("") || `<div class="sidebar__label" style="opacity:.6;">No categories yet</div>`;

  els.categoryNav.querySelectorAll("[data-category-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.categoryFilter;
      state.filters.category = state.filters.category === cat ? "" : cat;
      fetchTasks();
      renderSidebarCounts();
    });
  });

  els.boardHeading.textContent = state.filters.status ? STATUS_LABEL[state.filters.status] : "All tasks";
  els.boardSubheading.textContent = STATUS_SUBHEAD[state.filters.status] || STATUS_SUBHEAD[""];
}

document.querySelectorAll(".nav-btn[data-status-filter]").forEach(btn => {
  btn.addEventListener("click", () => {
    state.filters.status = btn.dataset.statusFilter;
    fetchTasks();
    renderSidebarCounts();
  });
});

// ---------- Rendering ----------
function render() {
  const columns = { pending: [], in_progress: [], done: [] };
  for (const task of state.tasks) {
    (columns[task.status] || columns.pending).push(task);
  }

  for (const status of Object.keys(columns)) {
    const list = document.getElementById(`list-${status}`);
    const countEl = document.getElementById(`count-${status}`);
    const items = columns[status];
    countEl.textContent = items.length;

    if (items.length === 0) {
      list.innerHTML = `<div class="column__empty">No tasks here.<br>Drop a card or add a new task.</div>`;
      continue;
    }

    list.innerHTML = items.map(renderCard).join("");
  }

  document.querySelectorAll(".card").forEach(card => {
    const id = Number(card.dataset.id);

    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-action]")) return;
      openEditModal(id);
    });

    card.addEventListener("dragstart", (e) => {
      card.classList.add("card--dragging");
      e.dataTransfer.setData("text/plain", id);
      e.dataTransfer.effectAllowed = "move";
    });

    card.addEventListener("dragend", () => {
      card.classList.remove("card--dragging");
    });
  });

  ["pending", "in_progress", "done"].forEach(status => {
    const listContainer = document.getElementById(`list-${status}`);

    listContainer.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      listContainer.classList.add("column__list--dragover");
    });

    listContainer.addEventListener("dragleave", () => {
      listContainer.classList.remove("column__list--dragover");
    });

    listContainer.addEventListener("drop", async (e) => {
      e.preventDefault();
      listContainer.classList.remove("column__list--dragover");

      const taskId = Number(e.dataTransfer.getData("text/plain"));
      if (!taskId) return;

      const task = state.tasks.find(t => t.id === taskId);
      if (task && task.status !== status) {
        await handleDragDropUpdate(taskId, status, task);
      }
    });
  });

  document.querySelectorAll("[data-action='cycle']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      cycleStatus(Number(btn.dataset.id));
    });
  });

  document.querySelectorAll("[data-action='delete']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTask(Number(btn.dataset.id));
    });
  });
}

function renderCard(task) {
  const due = dueLabel(task.due_date);
  const isDone = task.status === "done";
  const cycleIcon = { pending: "▶", in_progress: "✓", done: "↺" }[task.status];
  const cycleTitle = { pending: "Start task", in_progress: "Mark done", done: "Reopen task" }[task.status];

  return `
    <div class="card ${isDone ? "card--done" : ""}" data-id="${task.id}" data-priority="${task.priority}" draggable="true">
      <div class="card__body">
        <div class="card__top">
          <div>
            <div class="card__code">${taskCode(task.id)}</div>
            <div class="card__title">${escapeHtml(task.title)}</div>
          </div>
          <span class="badge badge--${task.priority}">${task.priority}</span>
        </div>
        ${task.description ? `<div class="card__desc">${escapeHtml(task.description)}</div>` : ""}
        <div class="card__meta">
          <span class="card__category">${escapeHtml(task.category || "General")}</span>
          <span class="card__due ${due.cls}">${due.text}</span>
        </div>
      </div>
      <div class="card__actions">
        <button data-action="cycle" data-id="${task.id}" title="${cycleTitle}">${cycleIcon}</button>
        <button data-action="delete" data-id="${task.id}" title="Delete task">✕</button>
      </div>
    </div>
  `;
}

// ---------- Actions ----------
async function cycleStatus(id) {
  try {
    await apiRequest(`${API}/${id}/toggle`, { method: "PATCH" });
    showToast("Status updated");
    await refreshAll();
  } catch (err) {
    showToast(err.message);
  }
}

async function handleDragDropUpdate(id, newStatus, currentTask) {
  try {
    const payload = {
      title: currentTask.title,
      description: currentTask.description,
      category: currentTask.category,
      due_date: currentTask.due_date,
      priority: currentTask.priority,
      status: newStatus
    };

    await apiRequest(`${API}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    showToast(`Moved to ${STATUS_LABEL[newStatus].toLowerCase()}`);
    await refreshAll();
  } catch (err) {
    showToast(err.message);
  }
}

async function deleteTask(id) {
  if (!confirm("Delete this task? This can't be undone.")) return;
  try {
    await apiRequest(`${API}/${id}`, { method: "DELETE" });
    showToast("Task deleted");
    await refreshAll();
  } catch (err) {
    showToast(err.message);
  }
}

// ---------- Modal ----------
function openNewModal() {
  state.editingId = null;
  els.modalTitle.textContent = "New task";
  els.form.reset();
  els.fieldId.value = "";
  els.fieldCategory.value = "General";
  els.fieldPriority.value = "medium";
  els.fieldStatus.value = "pending";
  els.formError.textContent = "";
  els.btnDelete.style.display = "none";
  els.overlay.classList.add("open");
  els.fieldTitle.focus();
}

function openEditModal(id) {
  const task = state.tasks.find(t => t.id === id) || state.allTasks.find(t => t.id === id);
  if (!task) return;
  state.editingId = id;
  els.modalTitle.textContent = `Edit ${taskCode(task.id)}`;
  els.fieldId.value = task.id;
  els.fieldTitle.value = task.title;
  els.fieldDescription.value = task.description || "";
  els.fieldCategory.value = task.category || "General";
  els.fieldDue.value = task.due_date || "";
  els.fieldPriority.value = task.priority;
  els.fieldStatus.value = task.status;
  els.formError.textContent = "";
  els.btnDelete.style.display = "inline-flex";
  els.overlay.classList.add("open");
  els.fieldTitle.focus();
}

function closeModal() {
  els.overlay.classList.remove("open");
}

async function handleFormSubmit(e) {
  e.preventDefault();
  const payload = {
    title: els.fieldTitle.value.trim(),
    description: els.fieldDescription.value.trim(),
    category: els.fieldCategory.value.trim() || "General",
    due_date: els.fieldDue.value || null,
    priority: els.fieldPriority.value,
    status: els.fieldStatus.value,
  };

  if (!payload.title) {
    els.formError.textContent = "Title is required.";
    return;
  }

  try {
    if (state.editingId) {
      await apiRequest(`${API}/${state.editingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      showToast("Task updated");
    } else {
      await apiRequest(API, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showToast("Task created");
    }
    closeModal();
    await refreshAll();
  } catch (err) {
    els.formError.textContent = err.message;
  }
}

// ---------- Filters ----------
let searchDebounce;
function onSearchInput() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    state.filters.search = els.search.value.trim();
    fetchTasks();
  }, 250);
}

function onFilterChange() {
  state.filters.priority = els.filterPriority.value;
  fetchTasks();
}

function clearFilters() {
  state.filters = { search: "", status: "", priority: "", category: "" };
  els.search.value = "";
  els.filterPriority.value = "";
  fetchTasks();
  renderSidebarCounts();
}

// ---------- Wire up events ----------
els.btnNewTask.addEventListener("click", openNewModal);
els.modalClose.addEventListener("click", closeModal);
els.btnCancel.addEventListener("click", closeModal);
els.overlay.addEventListener("click", (e) => { if (e.target === els.overlay) closeModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
  if (e.key.toLowerCase() === "n" && !els.overlay.classList.contains("open") &&
      document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
    openNewModal();
  }
});

els.form.addEventListener("submit", handleFormSubmit);
els.btnDelete.addEventListener("click", async () => {
  if (!state.editingId) return;
  closeModal();
  await deleteTask(state.editingId);
});

els.search.addEventListener("input", onSearchInput);
els.filterPriority.addEventListener("change", onFilterChange);
els.btnClearFilters.addEventListener("click", clearFilters);

// ---------- User avatar ----------
function renderUser() {
  const name = (els.userName.textContent || "").trim();
  els.userAvatar.textContent = name ? name.slice(0, 2).toUpperCase() : "OP";
}
renderUser();

// ---------- Live clock ----------
function tickClock() {
  const now = new Date();
  const timeEl = document.getElementById("clock-time");
  const dateEl = document.getElementById("clock-date");
  if (timeEl) timeEl.textContent = now.toLocaleTimeString("en-US", { hour12: false });
  if (dateEl) dateEl.textContent = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
tickClock();
setInterval(tickClock, 1000);

// ---------- Init ----------
refreshAll();
