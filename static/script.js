/* =========================================================
   Task Control — frontend logic
   Talks to the Flask REST API at /api/tasks
   Integrated with Native HTML5 Drag-and-Drop
   ========================================================= */

const API = "/api/tasks";

const state = {
  tasks: [],
  filters: { search: "", priority: "", category: "" },
  editingId: null,
};

// ---------- DOM refs ----------
const els = {
  board: document.getElementById("board"),
  search: document.getElementById("search"),
  filterPriority: document.getElementById("filter-priority"),
  filterCategory: document.getElementById("filter-category"),
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

function dueLabel(dueDateStr) {
  if (!dueDateStr) return { text: "No due date", cls: "" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDateStr + "T00:00:00");
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)}d`, cls: "card__due--overdue" };
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
  if (state.filters.priority) params.set("priority", state.filters.priority);
  if (state.filters.category) params.set("category", state.filters.category);

  state.tasks = await apiRequest(`${API}?${params.toString()}`);
  render();
}

async function fetchStats() {
  const stats = await apiRequest("/api/stats");
  els.runwayFill.style.width = `${stats.completion_pct}%`;
  els.runwayPct.textContent = `${stats.completion_pct}%`;
  els.statPending.textContent = stats.pending;
  els.statProgress.textContent = stats.in_progress;
  els.statDone.textContent = stats.done;
  els.statHigh.textContent = stats.high_open;

  const current = els.filterCategory.value;
  els.filterCategory.innerHTML = '<option value="">All categories</option>' +
    stats.categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  els.filterCategory.value = current;
}

async function refreshAll() {
  await Promise.all([fetchTasks(), fetchStats()]);
}

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
      list.innerHTML = `<div class="column__empty" data-status="${status}">No tasks here. Drop items here.</div>`;
      continue;
    }

    list.innerHTML = items.map(renderCard).join("");
  }

  // Bind interactions and Native Drag-and-Drop to task cards
  document.querySelectorAll(".card").forEach(card => {
    const id = Number(card.dataset.id);
    
    // Modal open event
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-action]")) return;
      openEditModal(id);
    });

    // Drag start event
    card.addEventListener("dragstart", (e) => {
      card.classList.add("card--dragging");
      e.dataTransfer.setData("text/plain", id);
      e.dataTransfer.effectAllowed = "move";
    });

    // Drag end clean up
    card.addEventListener("dragend", () => {
      card.classList.remove("card--dragging");
    });
  });

  // Setup column drop containers
  ["pending", "in_progress", "done"].forEach(status => {
    const listContainer = document.getElementById(`list-${status}`);
    
    listContainer.addEventListener("dragover", (e) => {
      e.preventDefault(); // Required to allow drop action
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

  // Wire up inline action buttons
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
  const nextLabel = { pending: "Start →", in_progress: "Finish →", done: "Reopen ↺" }[task.status];

  return `
    <div class="card ${isDone ? "card--done" : ""}" data-id="${task.id}" data-priority="${task.priority}" draggable="true">
      <div class="card__top">
        <div class="card__title">${escapeHtml(task.title)}</div>
        <span class="badge badge--${task.priority}">${task.priority}</span>
      </div>
      ${task.description ? `<div class="card__desc">${escapeHtml(task.description)}</div>` : ""}
      <div class="card__meta">
        <span class="card__category">${escapeHtml(task.category || "General")}</span>
        <span class="card__due ${due.cls}">${due.text}</span>
      </div>
      <div class="card__actions">
        <button data-action="cycle" data-id="${task.id}">${nextLabel}</button>
        <button data-action="delete" data-id="${task.id}" class="danger">Delete</button>
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
    
    showToast(`Moved to ${newStatus.replace('_', ' ')}`);
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
  els.modalTitle.textContent = "New Task";
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
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  state.editingId = id;
  els.modalTitle.textContent = "Edit Task";
  els.fieldId.value = task.id;
  els.fieldTitle.value = task.title;
  els.fieldDescription.value = task.description || "";
  els.fieldCategory.value = task.category || "General";
  els.fieldDue.value = task.due_date || "";
  els.fieldPriority.value = task.priority;
  els.fieldStatus.value = task.status;
  els.formError.textContent = "";
  els.btnDelete.style.display = "inline-block";
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
  state.filters.category = els.filterCategory.value;
  fetchTasks();
}

function clearFilters() {
  state.filters = { search: "", priority: "", category: "" };
  els.search.value = "";
  els.filterPriority.value = "";
  els.filterCategory.value = "";
  fetchTasks();
}

// ---------- Wire up events ----------
els.btnNewTask.addEventListener("click", openNewModal);
els.modalClose.addEventListener("click", closeModal);
els.btnCancel.addEventListener("click", closeModal);
els.overlay.addEventListener("click", (e) => { if (e.target === els.overlay) closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

els.form.addEventListener("submit", handleFormSubmit);
els.btnDelete.addEventListener("click", async () => {
  if (!state.editingId) return;
  closeModal();
  await deleteTask(state.editingId);
});

els.search.addEventListener("input", onSearchInput);
els.filterPriority.addEventListener("change", onFilterChange);
els.filterCategory.addEventListener("change", onFilterChange);
els.btnClearFilters.addEventListener("click", clearFilters);

// ---------- Init ----------
refreshAll();