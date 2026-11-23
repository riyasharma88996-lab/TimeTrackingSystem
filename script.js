
"use strict";

// ==========================================
// TIME TRACKING SYSTEM - ADVANCED EDITION
// ==========================================

const STORAGE_KEY = "timeTrackingSystemTasks";
const SESSION_KEY = "timeTrackingSystemActiveSession";
const THEME_KEY = "timeTrackingSystemTheme";

const $ = (id) => document.getElementById(id);

let tasks = loadTasks();
let activeSession = loadSession();
let timerInterval = null;
let taskChartInstance = null;

// ---------- STORAGE ----------

function loadTasks() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadSession() {
    try {
        const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");

        if (
            session &&
            Number.isFinite(session.taskId) &&
            Number.isFinite(session.startedAt) &&
            Number.isFinite(session.elapsedBeforeStart)
        ) {
            return session;
        }
    } catch {
        // Ignore invalid session data.
    }

    return null;
}

function saveSession() {
    if (activeSession) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(activeSession));
    } else {
        localStorage.removeItem(SESSION_KEY);
    }
}

// ---------- GENERAL HELPERS ----------

function formatTime(seconds) {
    seconds = Math.max(0, Math.floor(seconds || 0));

    const hours = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const secs = String(seconds % 60).padStart(2, "0");

    return `${hours}:${minutes}:${secs}`;
}

function getTaskSeconds(task) {
    return Number(task.totalSeconds) || 0;
}

function getElapsedSeconds() {
    if (!activeSession) return 0;

    return Math.floor(
        (Date.now() - activeSession.startedAt) / 1000
    );
}

function getCurrentTask() {
    if (!activeSession) return null;

    return tasks.find(task => task.id === activeSession.taskId) || null;
}

function showMessage(message) {
    const toast = $("toast");

    if (toast) {
        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(showMessage.timeout);
        showMessage.timeout = setTimeout(() => {
            toast.classList.remove("show");
        }, 2800);
    } else {
        alert(message);
    }
}

// ---------- TASK STATISTICS ----------

function getStatistics() {
    const completed = tasks.filter(task => task.completed).length;
    const pending = tasks.length - completed;

    const trackedSeconds = tasks.reduce(
        (sum, task) => sum + getTaskSeconds(task),
        0
    );

    const currentSeconds = activeSession ? getElapsedSeconds() : 0;

    return {
        total: tasks.length,
        completed,
        pending,
        trackedSeconds,
        liveSeconds: currentSeconds,
        totalWithLive: trackedSeconds + currentSeconds
    };
}

// ---------- RENDER TASK TABLE ----------

function renderTasks() {
    const table = $("taskTable");
    if (!table) return;

    table.innerHTML = "";

    const searchText = ($("searchTasks")?.value || "")
        .trim()
        .toLowerCase();

    const filter = $("filterTasks")?.value || "all";

    const filteredTasks = tasks.filter(task => {
        const matchesSearch =
            task.name.toLowerCase().includes(searchText) ||
            task.category.toLowerCase().includes(searchText);

        const matchesFilter =
            filter === "all" ||
            (filter === "completed" && task.completed) ||
            (filter === "pending" && !task.completed);

        return matchesSearch && matchesFilter;
    });

    if (filteredTasks.length === 0) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = 5;
        cell.className = "empty";
        cell.textContent = tasks.length
            ? "No tasks match your search or filter."
            : "No tasks yet. Add your first task.";

        row.appendChild(cell);
        table.appendChild(row);
    }

    filteredTasks.forEach(task => {
        const row = document.createElement("tr");

        const nameCell = document.createElement("td");
        nameCell.textContent = task.name;

        const categoryCell = document.createElement("td");
        categoryCell.textContent = task.category;

        const timeCell = document.createElement("td");
        timeCell.textContent = formatTime(getTaskSeconds(task));

        const statusCell = document.createElement("td");
        const badge = document.createElement("span");

        badge.className = "status " +
            (task.completed ? "completed" : "pending");

        badge.textContent = task.completed ? "Completed" : "Pending";
        statusCell.appendChild(badge);

        const actionCell = document.createElement("td");

        if (!task.completed) {
            const completeButton = document.createElement("button");
            completeButton.type = "button";
            completeButton.className = "secondary small";
            completeButton.textContent = "Complete";

            completeButton.addEventListener("click", () => {
                completeTask(task.id);
            });

            actionCell.appendChild(completeButton);
        }

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "danger small";
        deleteButton.textContent = "Delete";
        deleteButton.style.marginLeft = "6px";

        deleteButton.addEventListener("click", () => {
            deleteTask(task.id);
        });

        actionCell.appendChild(deleteButton);

        row.append(
            nameCell,
            categoryCell,
            timeCell,
            statusCell,
            actionCell
        );

        table.appendChild(row);
    });

    const countLabel = $("taskCountLabel");
    if (countLabel) {
        countLabel.textContent =
            `${filteredTasks.length} of ${tasks.length} tasks`;
    }
}

// ---------- TASK DROPDOWN ----------

function renderTaskSelect() {
    const select = $("taskSelect");
    if (!select) return;

    const previousValue = select.value;

    select.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select a task";
    select.appendChild(placeholder);

    tasks.filter(task => !task.completed).forEach(task => {
        const option = document.createElement("option");
        option.value = String(task.id);
        option.textContent = `${task.name} (${task.category})`;

        select.appendChild(option);
    });

    if (
        previousValue &&
        [...select.options].some(option => option.value === previousValue)
    ) {
        select.value = previousValue;
    }

    // Keep the running task selected.
    if (activeSession) {
        select.value = String(activeSession.taskId);
    }

    select.disabled = Boolean(activeSession);
}

// ---------- DASHBOARD STATISTICS ----------

function renderStatistics() {
    const stats = getStatistics();

    if ($("totalTasks")) {
        $("totalTasks").textContent = stats.total;
    }

    if ($("completedTasks")) {
        $("completedTasks").textContent = stats.completed;
    }

    if ($("pendingTasks")) {
        $("pendingTasks").textContent = stats.pending;
    }

    if ($("totalTime")) {
        $("totalTime").textContent = formatTime(stats.totalWithLive);
    }

    if ($("today")) {
        $("today").textContent = new Date().toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    if ($("year")) {
        $("year").textContent = new Date().getFullYear();
    }
}

// ---------- TIMER DISPLAY ----------

function renderTimer() {
    const currentTask = getCurrentTask();

    if ($("timerDisplay")) {
        $("timerDisplay").textContent = currentTask
            ? formatTime(getElapsedSeconds())
            : "00:00:00";
    }

    if ($("timerStatus")) {
        $("timerStatus").textContent = currentTask
            ? `Timer running: ${currentTask.name}`
            : "Ready to start tracking";
    }

    if ($("liveBadge")) {
        $("liveBadge").textContent = currentTask
            ? "● LIVE"
            : "● NOT RUNNING";

        $("liveBadge").classList.toggle("running", Boolean(currentTask));
    }

    if ($("startBtn")) {
        $("startBtn").disabled = Boolean(activeSession);
    }

    if ($("stopBtn")) {
        $("stopBtn").disabled = !activeSession;
    }

    renderStatistics();
}

// ---------- START TIMER ----------

function startTimer() {
    if (activeSession) {
        showMessage("A timer is already running. Stop it first.");
        return;
    }

    const selectedId = Number($("taskSelect")?.value);

    const task = tasks.find(
        item => item.id === selectedId && !item.completed
    );

    if (!task) {
        showMessage("Please select a pending task first.");
        return;
    }

    activeSession = {
        taskId: task.id,
        startedAt: Date.now(),
        elapsedBeforeStart: getTaskSeconds(task)
    };

    saveSession();

    renderTaskSelect();
    renderTimer();

    timerInterval = setInterval(renderTimer, 250);

    showMessage(`Timer started for "${task.name}".`);
}

// ---------- STOP TIMER ----------

function stopTimer() {
    if (!activeSession) {
        showMessage("No timer is currently running.");
        return;
    }

    const task = getCurrentTask();

    if (task) {
        task.totalSeconds =
            activeSession.elapsedBeforeStart + getElapsedSeconds();
    }

    clearInterval(timerInterval);
    timerInterval = null;

    activeSession = null;
    saveSession();
    saveTasks();

    renderAll();

    showMessage("Timer stopped and session saved.");
}

// ---------- COMPLETE TASK ----------

function completeTask(id) {
    if (activeSession && activeSession.taskId === id) {
        showMessage("Stop this task's timer before completing it.");
        return;
    }

    const task = tasks.find(item => item.id === id);
    if (!task) return;

    task.completed = true;

    saveTasks();
    renderAll();

    showMessage(`"${task.name}" marked as completed.`);
}

// ---------- DELETE TASK ----------

function deleteTask(id) {
    const task = tasks.find(item => item.id === id);
    if (!task) return;

    if (activeSession && activeSession.taskId === id) {
        showMessage("Stop this task's timer before deleting it.");
        return;
    }

    if (!confirm(`Delete "${task.name}"? This cannot be undone.`)) {
        return;
    }

    tasks = tasks.filter(item => item.id !== id);

    saveTasks();
    renderAll();

    showMessage("Task deleted.");
}

// ---------- ADD TASK ----------

function addTask() {
    const nameInput = $("taskName");
    const categoryInput = $("taskCategory");

    const name = nameInput?.value.trim() || "";
    const category = categoryInput?.value.trim() || "";

    if (!name || !category) {
        showMessage("Please enter both a task name and category.");
        return;
    }

    const duplicate = tasks.some(
        task => task.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
        showMessage("A task with this name already exists.");
        return;
    }

    tasks.push({
        id: Date.now(),
        name,
        category,
        completed: false,
        totalSeconds: 0,
        createdAt: new Date().toISOString()
    });

    saveTasks();

    nameInput.value = "";
    categoryInput.value = "";

    $("taskForm")?.classList.remove("visible");

    renderAll();
    showMessage("New task added successfully.");
}

// ---------- PRODUCTIVITY CHART ----------

function updateChart() {
    const canvas = $("taskChart");

    if (!canvas || typeof Chart === "undefined") return;

    const completed = tasks.filter(task => task.completed).length;
    const pending = tasks.length - completed;

    if (taskChartInstance) {
        taskChartInstance.data.datasets[0].data = [completed, pending];
        taskChartInstance.update();
        return;
    }

    taskChartInstance = new Chart(canvas, {
        type: "doughnut",

        data: {
            labels: ["Completed", "Pending"],

            datasets: [{
                data: [completed, pending],
                backgroundColor: ["#6d5dfc", "#dce4f5"],
                hoverOffset: 8,
                borderWidth: 0
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            cutout: "72%",

            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        usePointStyle: true,
                        padding: 18
                    }
                },

                tooltip: {
                    callbacks: {
                        label(context) {
                            return `${context.label}: ${context.raw} tasks`;
                        }
                    }
                }
            }
        }
    });
}

// ---------- CSV REPORT EXPORT ----------

function exportReport() {
    if (tasks.length === 0) {
        showMessage("Add some tasks before exporting a report.");
        return;
    }

    const rows = [
        [
            "Task ID",
            "Task Name",
            "Category",
            "Tracked Seconds",
            "Tracked Time",
            "Status",
            "Created At"
        ],

        ...tasks.map(task => [
            task.id,
            task.name,
            task.category,
            getTaskSeconds(task),
            formatTime(getTaskSeconds(task)),
            task.completed ? "Completed" : "Pending",
            task.createdAt || ""
        ])
    ];

    const csv = rows.map(row =>
        row.map(value =>
            `"${String(value ?? "").replace(/"/g, '""')}"`
        ).join(",")
    ).join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `time-tracking-report-${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    showMessage("CSV report downloaded.");
}

// ---------- DARK MODE ----------

function applyTheme(theme) {
    document.body.classList.toggle("dark", theme === "dark");

    const themeButton = $("themeBtn");

    if (themeButton) {
        themeButton.textContent =
            theme === "dark" ? "☀ Light Mode" : "☾ Dark Mode";
    }

    localStorage.setItem(THEME_KEY, theme);
}

function toggleTheme() {
    const isDark = document.body.classList.contains("dark");

    applyTheme(isDark ? "light" : "dark");
}

// ---------- EVENT LISTENERS ----------

function setupEventListeners() {
    $("addTaskBtn")?.addEventListener("click", () => {
        const form = $("taskForm");
        if (!form) return;

        form.classList.toggle("visible");

        if (form.classList.contains("visible")) {
            $("taskName")?.focus();
        }
    });

    $("saveTaskBtn")?.addEventListener("click", addTask);

    $("taskName")?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            $("taskCategory")?.focus();
        }
    });

    $("taskCategory")?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            addTask();
        }
    });

    $("startBtn")?.addEventListener("click", startTimer);
    $("stopBtn")?.addEventListener("click", stopTimer);
    $("exportBtn")?.addEventListener("click", exportReport);
    $("themeBtn")?.addEventListener("click", toggleTheme);

    $("searchTasks")?.addEventListener("input", renderTasks);
    $("filterTasks")?.addEventListener("change", renderTasks);
}

// ---------- RENDER EVERYTHING ----------

function renderAll() {
    renderTasks();
    renderTaskSelect();
    renderStatistics();
    renderTimer();
    updateChart();
}

// ---------- INITIALIZE APP ----------

function initializeApp() {
    // Recover a session after a page refresh.
    if (
        activeSession &&
        !tasks.some(
            task => task.id === activeSession.taskId && !task.completed
        )
    ) {
        activeSession = null;
        saveSession();
    }

    setupEventListeners();

    applyTheme(localStorage.getItem(THEME_KEY) || "light");

    renderAll();

    if (activeSession) {
        timerInterval = setInterval(renderTimer, 250);
    }
}

initializeApp();
