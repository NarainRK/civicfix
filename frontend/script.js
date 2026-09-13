// Point this at your deployed backend URL, e.g. "https://civicfix-api.onrender.com/api"
const API_BASE = "https://civicfix-backend-8u4x.onrender.com/api";

// ---------------------------------------------------------------------
// Auth state (JWT stored in localStorage so the session survives reloads)
// ---------------------------------------------------------------------
let authToken = localStorage.getItem("civicfix_token") || null;
let currentUser = JSON.parse(localStorage.getItem("civicfix_user") || "null");
let currentScope = "all"; // "all" | "mine"

const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const userBar = document.getElementById("user-bar");
const userInfo = document.getElementById("user-info");

function authHeaders(extra = {}) {
  return { ...extra, Authorization: `Bearer ${authToken}` };
}

function saveSession(token, user) {
  authToken = token;
  currentUser = user;
  localStorage.setItem("civicfix_token", token);
  localStorage.setItem("civicfix_user", JSON.stringify(user));
}

function clearSession() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("civicfix_token");
  localStorage.removeItem("civicfix_user");
}

function renderAuthState() {
  if (authToken && currentUser) {
    authScreen.style.display = "none";
    appScreen.style.display = "grid";
    userBar.style.display = "flex";
    userInfo.textContent = `${currentUser.name} (${currentUser.role})`;

    const isAdmin = currentUser.role === "admin";
    document.getElementById("create-card").style.display = isAdmin ? "none" : "block";
    document.getElementById("list-title").textContent = isAdmin ? "Issue Queue" : "Reported Issues";
    document.getElementById("scope-tabs").style.display = isAdmin ? "none" : "flex";
    document.getElementById("admin-dashboard").style.display = isAdmin ? "grid" : "none";
    document.getElementById("issue-list").style.display = isAdmin ? "none" : "grid";
    document.getElementById("issue-table-wrap").style.display = isAdmin ? "block" : "none";

    fetchIssues();
    fetchStats();
  } else {
    authScreen.style.display = "block";
    appScreen.style.display = "none";
    userBar.style.display = "none";
  }
}

// ---------------------------------------------------------------------
// Auth screen wiring
// ---------------------------------------------------------------------
const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const authError = document.getElementById("auth-error");

tabLogin.addEventListener("click", () => {
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginForm.style.display = "grid";
  registerForm.style.display = "none";
  authError.textContent = "";
});
tabRegister.addEventListener("click", () => {
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerForm.style.display = "grid";
  loginForm.style.display = "none";
  authError.textContent = "";
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.textContent = "";
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.getElementById("login-email").value,
        password: document.getElementById("login-password").value,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Login failed");
    saveSession(json.token, json.user);
    renderAuthState();
  } catch (err) {
    authError.textContent = err.message;
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.textContent = "";
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.getElementById("reg-name").value,
        email: document.getElementById("reg-email").value,
        password: document.getElementById("reg-password").value,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || "Registration failed");
    saveSession(json.token, json.user);
    renderAuthState();
  } catch (err) {
    authError.textContent = err.message;
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearSession();
  renderAuthState();
});

// ---------------------------------------------------------------------
// Issue CRUD (app screen)
// ---------------------------------------------------------------------
const form = document.getElementById("issue-form");
const issueIdField = document.getElementById("issue-id");
const listEl = document.getElementById("issue-list");
const statsEl = document.getElementById("stats");
const filterStatus = document.getElementById("filter-status");
const filterCategory = document.getElementById("filter-category");
const cancelEditBtn = document.getElementById("cancel-edit");
const submitBtn = document.getElementById("submit-btn");
const formTitle = document.getElementById("form-title");

async function fetchIssues() {
  const params = new URLSearchParams();
  if (filterStatus.value) params.set("status", filterStatus.value);
  if (filterCategory.value) params.set("category", filterCategory.value);

  const endpoint = currentScope === "mine" ? "issues/my" : "issues";
  const url = `${API_BASE}/${endpoint}${params.toString() ? "?" + params : ""}`;

  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 401) return handleSessionExpired();
  const json = await res.json();
  renderIssues(json.data || []);
}

async function fetchStats() {
  const res = await fetch(`${API_BASE}/issues/stats/summary`, { headers: authHeaders() });
  if (res.status === 401) return handleSessionExpired();
  const json = await res.json();
  const summary = json.data || [];

  statsEl.innerHTML = summary.map((s) => `<span class="stat-pill">${s._id}: ${s.count}</span>`).join("");

  if (currentUser && currentUser.role === "admin") {
    const countFor = (status) => (summary.find((s) => s._id === status) || {}).count || 0;
    const total = summary.reduce((sum, s) => sum + s.count, 0);
    document.getElementById("dash-total").textContent = total;
    document.getElementById("dash-pending").textContent = countFor("Pending");
    document.getElementById("dash-progress").textContent = countFor("In Progress");
    document.getElementById("dash-resolved").textContent = countFor("Resolved");
  }
}

function handleSessionExpired() {
  clearSession();
  renderAuthState();
}

function renderIssues(issues) {
  if (currentUser.role === "admin") {
    renderAdminTable(issues);
  } else {
    renderCitizenCards(issues);
  }
}

function renderCitizenCards(issues) {
  if (!issues.length) {
    listEl.innerHTML = `<p style="color:#6b7280;">No issues found.</p>`;
    return;
  }
  listEl.innerHTML = issues
    .map((issue) => {
      const isOwner = issue.createdBy === currentUser.id;
      return `
    <div class="issue-card" data-id="${issue._id}">
      <span class="badge" data-status="${issue.status}">${issue.status}</span>
      <h3>${escapeHtml(issue.title)}</h3>
      <p>${escapeHtml(issue.description)}</p>
      <p class="meta">📍 ${escapeHtml(issue.location)} • 🏷️ ${issue.category} • ⚡ ${issue.priority} priority</p>
      <p class="meta">Reported by ${escapeHtml(issue.reportedByName)} on ${new Date(issue.createdAt).toLocaleString()}</p>
      <div class="card-actions">
        ${
          isOwner
            ? `<button class="edit-btn">Edit</button><button class="delete-btn">Delete</button>`
            : `<span class="owner-tag">View only</span>`
        }
      </div>
    </div>`;
    })
    .join("");

  document.querySelectorAll(".issue-card").forEach((card) => {
    const id = card.dataset.id;
    const issue = issues.find((i) => i._id === id);
    const editBtn = card.querySelector(".edit-btn");
    const deleteBtn = card.querySelector(".delete-btn");
    if (editBtn) editBtn.addEventListener("click", () => loadIntoForm(issue));
    if (deleteBtn) deleteBtn.addEventListener("click", () => deleteIssue(id));
  });
}

function renderAdminTable(issues) {
  const tbody = document.getElementById("issue-table-body");
  if (!issues.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#6b7280;">No issues found.</td></tr>`;
    return;
  }

  tbody.innerHTML = issues
    .map(
      (issue) => `
    <tr data-id="${issue._id}">
      <td><strong>${escapeHtml(issue.title)}</strong><br/><span class="meta">${escapeHtml(issue.location)}</span></td>
      <td>${issue.category}</td>
      <td>${escapeHtml(issue.location)}</td>
      <td>${escapeHtml(issue.reportedByName)}</td>
      <td>
        <select class="admin-priority-select">
          ${["Low", "Medium", "High"].map((p) => `<option value="${p}" ${p === issue.priority ? "selected" : ""}>${p}</option>`).join("")}
        </select>
      </td>
      <td>
        <select class="admin-status-select">
          ${["Pending", "In Progress", "Resolved", "Rejected"].map((s) => `<option value="${s}" ${s === issue.status ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </td>
      <td class="row-actions">
        <button class="apply-triage-btn">Apply</button>
        <button class="delete-btn">Delete</button>
      </td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll("tr").forEach((row) => {
    const id = row.dataset.id;
    row.querySelector(".apply-triage-btn").addEventListener("click", async () => {
      const status = row.querySelector(".admin-status-select").value;
      const priority = row.querySelector(".admin-priority-select").value;
      await updateIssueStatus(id, { status, priority });
    });
    row.querySelector(".delete-btn").addEventListener("click", () => deleteIssue(id));
  });
}

function loadIntoForm(issue) {
  issueIdField.value = issue._id;
  document.getElementById("title").value = issue.title;
  document.getElementById("description").value = issue.description;
  document.getElementById("category").value = issue.category;
  document.getElementById("location").value = issue.location;
  formTitle.textContent = "Edit Issue";
  submitBtn.textContent = "Update Report";
  cancelEditBtn.style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  form.reset();
  issueIdField.value = "";
  formTitle.textContent = "Report a New Issue";
  submitBtn.textContent = "Submit Report";
  cancelEditBtn.style.display = "none";
}

async function createIssue(payload) {
  const res = await fetch(`${API_BASE}/issues`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).message || "Failed to create issue");
}

async function updateIssue(id, payload) {
  const res = await fetch(`${API_BASE}/issues/${id}`, {
    method: "PUT",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).message || "Failed to update issue");
}

// Admin-only triage action -> PATCH /api/issues/:id/status
async function updateIssueStatus(id, payload) {
  try {
    const res = await fetch(`${API_BASE}/issues/${id}/status`, {
      method: "PATCH",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to update status");
    await fetchIssues();
    await fetchStats();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteIssue(id) {
  if (!confirm("Delete this issue report?")) return;
  try {
    const res = await fetch(`${API_BASE}/issues/${id}`, { method: "DELETE", headers: authHeaders() });
    if (!res.ok) throw new Error((await res.json()).message || "Failed to delete issue");
    await fetchIssues();
    await fetchStats();
  } catch (err) {
    alert(err.message);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    title: document.getElementById("title").value,
    description: document.getElementById("description").value,
    category: document.getElementById("category").value,
    location: document.getElementById("location").value,
  };

  try {
    const id = issueIdField.value;
    if (id) {
      await updateIssue(id, payload);
    } else {
      await createIssue(payload);
    }
    resetForm();
    await fetchIssues();
    await fetchStats();
  } catch (err) {
    alert(err.message);
  }
});

cancelEditBtn.addEventListener("click", resetForm);
filterStatus.addEventListener("change", fetchIssues);
filterCategory.addEventListener("change", fetchIssues);
document.getElementById("refresh-btn").addEventListener("click", () => {
  fetchIssues();
  fetchStats();
});

document.querySelectorAll("#scope-tabs .tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("#scope-tabs .tab").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentScope = btn.dataset.scope;
    fetchIssues();
  });
});

// ---------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------
renderAuthState();
