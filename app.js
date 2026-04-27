const state = {
  csrfToken: null,
  currentUser: null,
  meta: null,
  tickets: [],
  dashboard: null,
  users: [],
  views: [],
  webhooks: [],
  auditEvents: [],
  openedPeriod: "day",
  closedPeriod: "day",
  selectedTicket: null,
  activeTab: "tickets",
  draggingTicketId: null,
  passwordResetRequired: false,
  webhookDeliveries: [],
  importBatches: [],
  importParsed: null,
  importMapping: {},
  currentPage: 1,
  totalPages: 1,
  totalTickets: 0,
  perPage: 50,
  kanbanPages: {},
  autoRefreshTimer: null
};

const elements = {
  loginOverlay: document.querySelector("#login-overlay"),
  loginForm: document.querySelector("#login-form"),
  loginName: document.querySelector("#login-name"),
  loginPassword: document.querySelector("#login-password"),
  passwordResetOverlay: document.querySelector("#password-reset-overlay"),
  passwordResetForm: document.querySelector("#password-reset-form"),
  passwordResetCurrent: document.querySelector("#password-reset-current"),
  passwordResetNew: document.querySelector("#password-reset-new"),
  passwordResetConfirm: document.querySelector("#password-reset-confirm"),
  logoutButton: document.querySelector("#logout-button"),
  sessionUser: document.querySelector("#session-user"),
  sessionRole: document.querySelector("#session-role"),
  filtersForm: document.querySelector("#filters-form"),
  ticketForm: document.querySelector("#ticket-form"),
  clearFilters: document.querySelector("#clear-filters"),
  resetForm: document.querySelector("#reset-form"),
  submitButton: document.querySelector("#submit-button"),
  saveView: document.querySelector("#save-view"),
  exportCsv: document.querySelector("#export-csv"),
  viewsList: document.querySelector("#views-list"),
  kanbanBoard: document.querySelector("#kanban-board"),
  ticketsTableBody: document.querySelector("#tickets-table-body"),
  ticketCount: document.querySelector("#ticket-count"),
  message: document.querySelector("#message"),
  priorityChart: document.querySelector("#priority-chart"),
  agingBucketsChart: document.querySelector("#aging-buckets-chart"),
  weeklyFlowChart: document.querySelector("#weekly-flow-chart"),
  atRiskPanel: document.querySelector("#at-risk-panel"),
  summaryTemplate: document.querySelector("#summary-card-template"),
  periodButtons: document.querySelectorAll(".period-button"),
  tabButtons: document.querySelectorAll(".tab-button"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  ticketDetail: document.querySelector("#ticket-detail"),
  closeDetail: document.querySelector("#close-detail"),
  deleteTicketBtn: document.querySelector("#delete-ticket"),
  detailTitle: document.querySelector("#detail-title"),
  detailDescription: document.querySelector("#detail-description"),
  detailJdTicketNumber: document.querySelector("#detail-jd-ticket-number"),
  detailCategory: document.querySelector("#detail-category"),
  detailPriority: document.querySelector("#detail-priority"),
  detailStatus: document.querySelector("#detail-status"),
  detailAssignee: document.querySelector("#detail-assignee"),
  detailManager: document.querySelector("#detail-manager"),
  detailDateOpening: document.querySelector("#detail-date-opening"),
  detailDateClosed: document.querySelector("#detail-date-closed"),
  detailAging: document.querySelector("#detail-aging"),
  detailCommentCount: document.querySelector("#detail-comment-count"),
  detailCommentAuthor: document.querySelector("#detail-comment-author"),
  detailCommentType: document.querySelector("#detail-comment-type"),
  detailNewComment: document.querySelector("#detail-new-comment"),
  postComment: document.querySelector("#post-comment"),
  commentsList: document.querySelector("#comments-list"),
  managerEditForm: document.querySelector("#manager-edit-form"),
  managerDescription: document.querySelector("#manager-description"),
  managerJdTicketNumber: document.querySelector("#manager-jd-ticket-number"),
  managerCategory: document.querySelector("#manager-category"),
  managerPriority: document.querySelector("#manager-priority"),
  managerStatus: document.querySelector("#manager-status"),
  managerAssignee: document.querySelector("#manager-assignee"),
  managerManager: document.querySelector("#manager-manager"),
  managerDateOpening: document.querySelector("#manager-date-opening"),
  managerDateClosed: document.querySelector("#manager-date-closed"),
  userForm: document.querySelector("#user-form"),
  userId: document.querySelector("#user-id"),
  userName: document.querySelector("#user-name"),
  userEmail: document.querySelector("#user-email"),
  userRole: document.querySelector("#user-role"),
  userPassword: document.querySelector("#user-password"),
  userPasswordResetRequired: document.querySelector("#user-password-reset-required"),
  userActive: document.querySelector("#user-active"),
  userSubmit: document.querySelector("#user-submit"),
  userReset: document.querySelector("#user-reset"),
  usersList: document.querySelector("#users-list"),
  webhookForm: document.querySelector("#webhook-form"),
  webhookId: document.querySelector("#webhook-id"),
  webhookName: document.querySelector("#webhook-name"),
  webhookUrl: document.querySelector("#webhook-url"),
  webhookSecret: document.querySelector("#webhook-secret"),
  webhookActive: document.querySelector("#webhook-active"),
  webhookSubmit: document.querySelector("#webhook-submit"),
  webhookReset: document.querySelector("#webhook-reset"),
  webhooksList: document.querySelector("#webhooks-list"),
  webhookDeliveriesList: document.querySelector("#webhook-deliveries-list"),
  auditList: document.querySelector("#audit-list"),
  importOverlay: document.querySelector("#import-overlay"),
  closeImport: document.querySelector("#close-import"),
  importCsv: document.querySelector("#import-csv"),
  openImportFromEntry: document.querySelector("#open-import-from-entry"),
  downloadTemplate: document.querySelector("#download-template"),
  importDropZone: document.querySelector("#import-drop-zone"),
  importFileInput: document.querySelector("#import-file-input"),
  importStepUpload: document.querySelector("#import-step-upload"),
  importStepMapping: document.querySelector("#import-step-mapping"),
  importStepPreview: document.querySelector("#import-step-preview"),
  importStepResults: document.querySelector("#import-step-results"),
  columnMappingTable: document.querySelector("#column-mapping-table"),
  importRowCount: document.querySelector("#import-row-count"),
  importProceed: document.querySelector("#import-proceed"),
  importBackUpload: document.querySelector("#import-back-upload"),
  importPreviewSummary: document.querySelector("#import-preview-summary"),
  importPreviewHead: document.querySelector("#import-preview-head"),
  importPreviewBody: document.querySelector("#import-preview-body"),
  importConfirm: document.querySelector("#import-confirm"),
  importBackMapping: document.querySelector("#import-back-mapping"),
  importResultsContent: document.querySelector("#import-results-content"),
  importDone: document.querySelector("#import-done"),
  importHistoryList: document.querySelector("#import-history-list")
};

init();

async function init() {
  bindEvents();
  setDefaultDates();
  await bootstrapAuth();
}

function bindEvents() {
  elements.loginForm.addEventListener("submit", login);
  elements.logoutButton.addEventListener("click", logout);
  elements.passwordResetForm.addEventListener("submit", changePassword);
  elements.filtersForm.addEventListener("input", debounce(() => {
    state.currentPage = 1;
    refreshTickets();
  }, 220));
  const clearFiltersAction = () => {
    elements.filtersForm.reset();
    state.currentPage = 1;
    refreshTickets();
  };
  elements.clearFilters.addEventListener("click", clearFiltersAction);
  document.getElementById('clear-filters-banner')?.addEventListener('click', clearFiltersAction);
  elements.saveView.addEventListener("click", saveView);
  elements.exportCsv.addEventListener("click", exportCsv);
  elements.ticketForm.addEventListener("submit", saveTicket);
  elements.resetForm.addEventListener("click", resetTicketForm);
  elements.closeDetail.addEventListener("click", closeTicketDetail);
  elements.deleteTicketBtn?.addEventListener("click", deleteTicket);
  elements.postComment.addEventListener("click", postComment);
  document.querySelectorAll("[data-template]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.detailNewComment.value = button.dataset.template || "";
      elements.detailNewComment.focus();
    });
  });
  elements.managerEditForm.addEventListener("submit", saveOriginalTicket);
  elements.userForm.addEventListener("submit", saveUser);
  elements.userReset.addEventListener("click", resetUserForm);
  elements.webhookForm.addEventListener("submit", saveWebhook);
  elements.webhookReset.addEventListener("click", resetWebhookForm);
  bindImportEvents();
  bindTicketsToolbar();
  elements.ticketDetail.addEventListener("click", (event) => {
    if (event.target === elements.ticketDetail) closeTicketDetail();
  });
  window.addEventListener("hashchange", handleHashChange);
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !elements.ticketDetail.hidden) closeTicketDetail();
  });
  elements.periodButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.openedPeriod = button.dataset.period;
      elements.periodButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderDashboard();
    });
  });
  document.querySelectorAll(".closed-period-button").forEach(button => {
    button.addEventListener("click", () => {
      state.closedPeriod = button.dataset.period;
      document.querySelectorAll(".closed-period-button").forEach(b => b.classList.toggle("active", b === button));
      renderDashboard();
    });
  });
  document.getElementById("refresh-dashboard")?.addEventListener("click", () => refreshDashboard());

  const arSelect = document.getElementById('autorefresh-select');
  const arDot = document.getElementById('autorefresh-dot');
  if (arSelect) {
    const saved = localStorage.getItem('autorefresh_interval');
    if (saved !== null) arSelect.value = saved;
    const applyAutoRefresh = () => {
      clearInterval(state.autoRefreshTimer);
      const secs = Number(arSelect.value);
      localStorage.setItem('autorefresh_interval', secs);
      if (arDot) arDot.hidden = secs === 0;
      if (secs > 0) state.autoRefreshTimer = setInterval(() => refreshDashboard(), secs * 1000);
    };
    arSelect.addEventListener('change', applyAutoRefresh);
    applyAutoRefresh();
  }

  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      renderTabs();
      if (state.activeTab === "roles") {
        refreshRolesPanel();
      }
    });
  });
}

async function bootstrapAuth() {
  const response = await fetch("/api/auth/me");
  if (!response.ok) {
    showLogin();
    return;
  }
  const data = await response.json();
  state.currentUser = data.user;
  state.csrfToken = data.csrf_token;
  state.passwordResetRequired = Boolean(data.password_reset_required);
  showAppSession();
  await loadBootstrap();
}

function showLogin() {
  elements.loginOverlay.hidden = false;
  elements.passwordResetOverlay.hidden = true;
  const remembered = localStorage.getItem("remembered_user");
  if (remembered && elements.loginName) {
    elements.loginName.value = remembered;
    const rememberBox = document.querySelector("#login-remember");
    if (rememberBox) rememberBox.checked = true;
  }
}

function showAppSession() {
  elements.loginOverlay.hidden = true;
  elements.sessionUser.textContent = state.currentUser?.name || "-";
  elements.sessionRole.textContent = state.currentUser?.role || "-";
  elements.passwordResetOverlay.hidden = !state.passwordResetRequired;
}

async function login(event) {
  event.preventDefault();
  const remember = document.querySelector("#login-remember")?.checked || false;
  const payload = {
    name: elements.loginName.value,
    password: elements.loginPassword.value,
    remember
  };
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) {
    showMessage(data.error || "Error de acceso.", true);
    return;
  }
  if (remember) {
    localStorage.setItem("remembered_user", payload.name);
  } else {
    localStorage.removeItem("remembered_user");
  }
  state.currentUser = data.user;
  state.csrfToken = data.csrf_token;
  state.passwordResetRequired = Boolean(data.password_reset_required);
  elements.loginForm.reset();
  showAppSession();
  await loadBootstrap();
  showMessage(state.passwordResetRequired ? "Sesión iniciada. Debes cambiar la contraseña." : "Sesión iniciada.");
}

async function logout() {
  await apiFetch("/api/auth/logout", { method: "POST" });
  state.currentUser = null;
  state.csrfToken = null;
  state.passwordResetRequired = false;
  elements.sessionUser.textContent = "-";
  elements.sessionRole.textContent = "-";
  elements.loginOverlay.hidden = false;
  elements.passwordResetOverlay.hidden = true;
  showMessage("Sesión cerrada.");
}

async function apiFetch(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.csrfToken && ["POST", "PUT", "PATCH", "DELETE"].includes((options.method || "GET").toUpperCase())) {
    headers["X-CSRF-Token"] = state.csrfToken;
  }
  const response = await fetch(url, { ...options, headers, credentials: "same-origin" });
  if (response.status === 401) {
    state.currentUser = null;
    state.csrfToken = null;
    showLogin();
    throw new Error("La sesión expiró. Vuelve a iniciar sesión.");
  }
  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    const errorMessage = typeof payload === "object" && payload?.error ? payload.error : String(payload);
    throw new Error(errorMessage);
  }
  return payload;
}

async function loadBootstrap() {
  await Promise.all([refreshMeta(), refreshTickets(), refreshDashboard(), refreshViews()]);
  renderTabs();
  applyRoleVisibility();
  await handleHashChange();
  refreshImportHistory().catch(() => {});
}

function applyRoleVisibility() {
  const isManagerOrAdmin = state.currentUser && (state.currentUser.role === "manager" || state.currentUser.role === "admin");
  const isAdmin = state.currentUser && state.currentUser.role === "admin";
  const entryTab = Array.from(elements.tabButtons).find((button) => button.dataset.tab === "entry");
  if (entryTab) entryTab.style.display = isManagerOrAdmin ? "" : "none";
  elements.ticketForm.closest(".panel").style.display = isManagerOrAdmin ? "" : "none";
  elements.managerEditForm.closest(".manager-panel").style.display = isManagerOrAdmin ? "" : "none";
  const rolesTab = Array.from(elements.tabButtons).find((button) => button.dataset.tab === "roles");
  if (rolesTab) rolesTab.style.display = isManagerOrAdmin ? "" : "none";
  if ((state.activeTab === "roles" || state.activeTab === "entry") && !isManagerOrAdmin) {
    state.activeTab = "tickets";
    renderTabs();
  }
  elements.userForm.style.display = isAdmin ? "" : "none";
  elements.webhookForm.style.display = isAdmin ? "" : "none";
}

async function refreshMeta() {
  const data = await apiFetch("/api/meta");
  state.meta = data;
  fillSelect("filter-status", ["", ...state.meta.statuses], "All");
  fillSelect("filter-priority", ["", ...state.meta.priorities], "All");
  fillSelect("filter-category", ["", ...state.meta.categories], "All");
  fillSelect("filter-assignee", ["", ...state.meta.users], "All");
  fillSelect("filter-manager", ["", ...state.meta.managers], "All");
  fillSelect("category", state.meta.categories);
  fillSelect("priority", state.meta.priorities);
  fillSelect("assignee", state.meta.users);
  fillSelect("manager", state.meta.managers);
  fillSelect("detail-comment-author", state.meta.commentAuthors);
  fillSelect("detail-comment-type", state.meta.commentTypes || ["Update"]);
  fillSelect("manager-category", state.meta.categories);
  fillSelect("manager-priority", state.meta.priorities);
  fillSelect("manager-status", state.meta.statuses);
  fillSelect("manager-assignee", state.meta.users);
  fillSelect("manager-manager", state.meta.managers);
  fillSelect("user-role", state.meta.roles);
}

async function refreshViews() {
  const data = await apiFetch("/api/views");
  state.views = data.views;
  renderViews();
}

function renderViews() {
  elements.viewsList.innerHTML = state.views.length
    ? state.views
        .map(
          (view) => `
            <div class="view-chip">
              <button type="button" data-apply-view="${view.id}" class="ghost">${escapeHtml(view.name)}</button>
              <button type="button" data-delete-view="${view.id}" class="danger-chip">x</button>
            </div>
          `
        )
        .join("")
    : `<p class="muted">No saved views yet.</p>`;

  document.querySelectorAll("[data-apply-view]").forEach((button) => {
    button.addEventListener("click", () => applySavedView(Number(button.dataset.applyView)));
  });
  document.querySelectorAll("[data-delete-view]").forEach((button) => {
    button.addEventListener("click", () => deleteView(Number(button.dataset.deleteView)));
  });
}

async function saveView() {
  const name = window.prompt("Name for this view:");
  if (!name) return;
  const filter = Object.fromEntries(new FormData(elements.filtersForm).entries());
  try {
    await apiFetch("/api/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, filter })
    });
    await refreshViews();
    showMessage("View saved.");
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function deleteView(id) {
  try {
    await apiFetch(`/api/views/${id}`, { method: "DELETE" });
    await refreshViews();
    showMessage("View deleted.");
  } catch (error) {
    showMessage(error.message, true);
  }
}

function applySavedView(id) {
  const view = state.views.find((item) => item.id === id);
  if (!view) return;
  for (const [key, value] of Object.entries(view.filter_json || {})) {
    const input = elements.filtersForm.elements.namedItem(key);
    if (input) input.value = value;
  }
  refreshTickets();
}

async function refreshTickets() {
  try {
    const params = new URLSearchParams(new FormData(elements.filtersForm));
    params.set("page", state.currentPage);
    params.set("per_page", String(state.perPage));
    const data = await apiFetch(`/api/tickets?${params.toString()}`);
    state.tickets = data.tickets;
    state.currentPage = data.page;
    state.totalPages = data.totalPages;
    state.totalTickets = data.total;
    renderTickets();
    renderKanban();
    renderPagination();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function refreshDashboard() {
  try {
    const data = await apiFetch("/api/dashboard");
    state.dashboard = data;
    const updatedEl = document.getElementById("dashboard-updated");
    if (updatedEl) updatedEl.textContent = `Updated ${new Date().toLocaleTimeString()}`;
    renderDashboard();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function refreshRolesPanel() {
  try {
    const canManage = state.currentUser && (state.currentUser.role === "manager" || state.currentUser.role === "admin");
    if (!canManage) return;
    const usersPayload = await apiFetch("/api/users");
    state.users = usersPayload.users;
    renderUsers();
    if (state.currentUser.role === "admin") {
      const [webhooksPayload, deliveriesPayload] = await Promise.all([
        apiFetch("/api/webhooks"),
        apiFetch("/api/webhooks/deliveries")
      ]);
      state.webhooks = webhooksPayload.webhooks;
      state.webhookDeliveries = deliveriesPayload.deliveries;
      renderWebhooks();
      renderWebhookDeliveries();
    } else {
      state.webhooks = [];
      state.webhookDeliveries = [];
      elements.webhooksList.innerHTML = `<p class="muted">Webhooks are admin-only.</p>`;
      elements.webhookDeliveriesList.innerHTML = `<p class="muted">Deliveries are admin-only.</p>`;
    }
    const auditPayload = await apiFetch("/api/audit");
    state.auditEvents = auditPayload.events;
    renderAudit();
  } catch (error) {
    showMessage(error.message, true);
  }
}

function fillSelect(id, values, emptyLabel = "") {
  const select = document.getElementById(id);
  select.innerHTML = values
    .map((value) => {
      if (!value) return `<option value="">${emptyLabel}</option>`;
      return `<option value="${value}">${value}</option>`;
    })
    .join("");
}

function renderTabs() {
  elements.tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === state.activeTab));
  elements.tabPanels.forEach((panel) => panel.classList.toggle("active", panel.id === `tab-${state.activeTab}`));
}

function hasActiveFilters() {
  for (const [, v] of new FormData(elements.filtersForm).entries()) {
    if (v && String(v).trim()) return true;
  }
  return false;
}

function updateActiveFiltersBanner() {
  const banner = document.getElementById('active-filters-banner');
  if (!banner) return;
  const active = hasActiveFilters();
  banner.hidden = !active;
  elements.clearFilters.classList.toggle('filter-active', active);
}

function renderTicketsToolbar() {
  const { currentPage, totalPages, totalTickets, perPage } = state;

  // Non-closed count from dashboard totals
  const badge = document.getElementById('non-closed-badge');
  if (badge && state.dashboard) {
    const t = state.dashboard.totals;
    const active = (t.open || 0) + (t.inProgress || 0) + (t.blocked || 0);
    badge.textContent = `${active} active tickets`;
    badge.hidden = false;
  }

  // Per-page selector
  const sel = document.getElementById('per-page-select-top');
  if (sel && Number(sel.value) !== perPage) sel.value = String(perPage);

  // Page info + arrows
  const prevBtn = document.getElementById('page-prev-top');
  const nextBtn = document.getElementById('page-next-top');
  const info    = document.getElementById('page-info-top');
  if (prevBtn && nextBtn && info) {
    info.textContent = totalTickets === 0 ? '0 tickets' : `${(currentPage - 1) * perPage + 1}–${Math.min(currentPage * perPage, totalTickets)} of ${totalTickets}`;
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
  }
}

function bindTicketsToolbar() {
  document.getElementById('per-page-select-top')?.addEventListener('change', (e) => {
    state.perPage = Number(e.target.value);
    state.currentPage = 1;
    refreshTickets();
  });
  document.getElementById('page-prev-top')?.addEventListener('click', () => {
    state.currentPage = Math.max(1, state.currentPage - 1);
    refreshTickets();
  });
  document.getElementById('page-next-top')?.addEventListener('click', () => {
    state.currentPage = Math.min(state.totalPages, state.currentPage + 1);
    refreshTickets();
  });
}

function renderTickets() {
  const { currentPage, totalTickets, perPage } = state;
  const from = totalTickets === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, totalTickets);
  elements.ticketCount.textContent = totalTickets === 0 ? "0 tickets" : `Showing ${from}–${to} of ${totalTickets} tickets`;
  updateActiveFiltersBanner();
  renderTicketsToolbar();
  elements.ticketsTableBody.innerHTML = state.tickets
    .map(
      (ticket) => `
        <tr>
          <td>${escapeHtml(ticket.jd_ticket_number)}</td>
          <td><strong>${escapeHtml(ticket.description)}</strong><div class="table-subtext">${escapeHtml(ticket.last_comment_preview || "No recent activity")}</div></td>
          <td>${renderBadge(ticket.category, "neutral")}</td>
          <td>${renderBadge(ticket.priority, priorityTone(ticket.priority))}</td>
          <td>${renderBadge(ticket.status, statusTone(ticket.status))}</td>
          <td>${escapeHtml(ticket.assignee)}</td>
          <td>${escapeHtml(ticket.manager)}</td>
          <td>${escapeHtml(formatDisplayDate(ticket.date_opening))}</td>
          <td>${escapeHtml(formatDisplayDate(ticket.due_date) || "-")}</td>
          <td>${ticket.aging} days</td>
          <td>${ticket.is_sla_breached ? '<span class="badge danger">Breached</span>' : '<span class="badge success">On time</span>'}</td>
          <td><button type="button" class="small-button" data-open-id="${ticket.id}">Open</button></td>
        </tr>
      `
    )
    .join("");

  document.querySelectorAll("[data-open-id]").forEach((button) => {
    button.addEventListener("click", () => openTicketDetail(Number(button.dataset.openId)));
  });
}

const KANBAN_PAGE_SIZE = 5;

function renderKanban() {
  const statusColumns = ["Open", "In Progress", "Blocked", "Closed"];
  const roleCanMove = state.currentUser && (state.currentUser.role === "manager" || state.currentUser.role === "admin");

  elements.kanbanBoard.innerHTML = statusColumns.map((status) => {
    const allItems = state.tickets.filter((t) => t.status === status);
    const totalKPages = Math.max(1, Math.ceil(allItems.length / KANBAN_PAGE_SIZE));
    const kPage = Math.min(state.kanbanPages[status] || 1, totalKPages);
    state.kanbanPages[status] = kPage;
    const items = allItems.slice((kPage - 1) * KANBAN_PAGE_SIZE, kPage * KANBAN_PAGE_SIZE);

    const pagination = totalKPages > 1 ? `
      <div class="kanban-pagination">
        <button class="ghost small-button kp-prev" data-status="${status}" ${kPage <= 1 ? 'disabled' : ''}>‹</button>
        <span class="kp-info">${kPage} / ${totalKPages}</span>
        <button class="ghost small-button kp-next" data-status="${status}" ${kPage >= totalKPages ? 'disabled' : ''}>›</button>
      </div>` : '';

    return `
      <section class="kanban-column" data-drop-status="${status}">
        <header><h4>${status}</h4><span>${allItems.length}</span></header>
        <div class="kanban-cards">
          ${items.map((ticket) => `
            <article class="kanban-card" draggable="${roleCanMove}" data-ticket-id="${ticket.id}">
              <strong>${escapeHtml(ticket.jd_ticket_number)}</strong>
              <p>${escapeHtml(ticket.description)}</p>
              <div class="table-subtext">${escapeHtml(ticket.assignee)} • ${escapeHtml(ticket.priority)}</div>
            </article>
          `).join("")}
        </div>
        ${pagination}
      </section>
    `;
  }).join("");

  document.querySelectorAll(".kp-prev").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const st = e.currentTarget.dataset.status;
      state.kanbanPages[st] = Math.max(1, (state.kanbanPages[st] || 1) - 1);
      renderKanban();
    });
  });
  document.querySelectorAll(".kp-next").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const st = e.currentTarget.dataset.status;
      const total = Math.ceil(state.tickets.filter((t) => t.status === st).length / KANBAN_PAGE_SIZE);
      state.kanbanPages[st] = Math.min(total, (state.kanbanPages[st] || 1) + 1);
      renderKanban();
    });
  });

  if (!roleCanMove) return;
  document.querySelectorAll(".kanban-card").forEach((card) => {
    card.addEventListener("dragstart", () => {
      state.draggingTicketId = Number(card.dataset.ticketId);
    });
  });
  document.querySelectorAll(".kanban-column").forEach((column) => {
    column.addEventListener("dragover", (event) => event.preventDefault());
    column.addEventListener("drop", async () => {
      const ticketId = state.draggingTicketId;
      const targetStatus = column.dataset.dropStatus;
      if (!ticketId || !targetStatus) return;
      const ticket = state.tickets.find((item) => item.id === ticketId);
      if (!ticket || ticket.status === targetStatus) return;
      await updateTicketStatus(ticket, targetStatus);
    });
  });
}

function buildPageNumbers(current, total) {
  const pages = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('…');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('…');
    pages.push(total);
  }
  return pages.map((p) =>
    p === '…'
      ? `<span class="pagination-ellipsis">…</span>`
      : `<button type="button" class="ghost small-button page-num-btn${p === current ? ' pg-current' : ''}" data-page="${p}">${p}</button>`
  ).join('');
}

function renderPagination() {
  const el = document.getElementById('pagination-controls');
  if (!el) return;
  const { currentPage, totalPages, totalTickets, perPage } = state;
  const from = totalTickets === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, totalTickets);
  const countInfo = `<span class="pagination-info">${totalTickets === 0 ? '0 tickets' : `${from}–${to} of ${totalTickets} ticket${totalTickets !== 1 ? 's' : ''}`}</span>`;

  if (totalPages <= 1) {
    el.innerHTML = countInfo;
    return;
  }

  el.innerHTML = `
    <button type="button" class="ghost small-button" id="page-first" ${currentPage <= 1 ? 'disabled' : ''} title="First page">«</button>
    <button type="button" class="ghost small-button" id="page-prev" ${currentPage <= 1 ? 'disabled' : ''}>‹ Prev</button>
    ${buildPageNumbers(currentPage, totalPages)}
    <button type="button" class="ghost small-button" id="page-next" ${currentPage >= totalPages ? 'disabled' : ''}>Next ›</button>
    <button type="button" class="ghost small-button" id="page-last" ${currentPage >= totalPages ? 'disabled' : ''} title="Last page">»</button>
    ${countInfo}
  `;
  document.getElementById('page-first')?.addEventListener('click', () => { state.currentPage = 1; refreshTickets(); });
  document.getElementById('page-prev')?.addEventListener('click', () => { state.currentPage = Math.max(1, state.currentPage - 1); refreshTickets(); });
  document.getElementById('page-next')?.addEventListener('click', () => { state.currentPage = Math.min(state.totalPages, state.currentPage + 1); refreshTickets(); });
  document.getElementById('page-last')?.addEventListener('click', () => { state.currentPage = state.totalPages; refreshTickets(); });
  document.querySelectorAll('.page-num-btn').forEach((btn) => {
    btn.addEventListener('click', () => { state.currentPage = Number(btn.dataset.page); refreshTickets(); });
  });
}

async function updateTicketStatus(ticket, targetStatus) {
  const payload = {
    description: ticket.description,
    jd_ticket_number: ticket.jd_ticket_number,
    category: ticket.category,
    updates_comments: ticket.updates_comments || "",
    priority: ticket.priority,
    status: targetStatus,
    date_opening: ticket.date_opening,
    date_closed: targetStatus === "Closed" ? formatIsoDate(Date.now()) : "",
    assignee: ticket.assignee,
    manager: ticket.manager
  };
  try {
    await apiFetch(`/api/tickets/${ticket.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    await Promise.all([refreshTickets(), refreshDashboard()]);
    if (state.selectedTicket && state.selectedTicket.id === ticket.id) await openTicketDetail(ticket.id);
    showMessage("Ticket status updated.");
  } catch (error) {
    showMessage(error.message, true);
  }
}

function renderDashboard() {
  if (!state.dashboard) return;
  renderTicketsToolbar();
  const d = state.dashboard;
  const t = d.totals;

  // KPI cards row
  const kpiRow = document.getElementById('kpi-row');
  if (kpiRow) {
    const kpis = [
      { label: 'Total',       value: t.total,             sub: 'All time',                                                  color: 'neutral', icon: '≡' },
      { label: 'Open',        value: t.open,              sub: t.open > 10 ? 'High volume' : 'Under control',               color: t.open > 10 ? 'warning' : 'success', icon: '○', filter: 'status=Open' },
      { label: 'In Progress', value: t.inProgress,        sub: t.inProgress > 0 ? `${t.inProgress} active` : 'None active', color: 'brand', icon: '◑', filter: 'status=In Progress' },
      { label: 'Blocked',     value: t.blocked,           sub: t.blocked > 0 ? 'Needs attention' : 'All clear',             color: t.blocked > 0 ? 'danger' : 'success', icon: '⊘', filter: 'status=Blocked' },
      { label: 'P1 Open',     value: t.p1Open,            sub: t.p1Open > 0 ? 'Critical' : 'None critical',                 color: t.p1Open > 0 ? 'danger' : 'success', icon: '▲', filter: 'priority=P1 high' },
      { label: 'Avg Lead Time',value: `${t.avgLeadTime}d`, sub: t.avgLeadTime <= 3 ? 'Fast resolution' : t.avgLeadTime <= 7 ? 'Moderate' : 'Review process', color: t.avgLeadTime <= 3 ? 'success' : t.avgLeadTime <= 7 ? 'warning' : 'danger', icon: '⏱' },
      { label: 'Reopen Rate', value: `${t.reopenRate}%`,  sub: t.reopenRate <= 5 ? 'Quality is good' : t.reopenRate <= 15 ? 'Worth monitoring' : 'Quality issue', color: t.reopenRate <= 5 ? 'success' : t.reopenRate <= 15 ? 'warning' : 'danger', icon: '↺' },
    ];
    kpiRow.innerHTML = kpis.map(k => `
      <article class="kpi-card kpi-card--${k.color}${k.filter ? ' kpi-card--clickable' : ''}"${k.filter ? ` data-filter="${escapeHtml(k.filter)}"` : ''}>
        <span class="kpi-icon" aria-hidden="true">${k.icon}</span>
        <strong class="kpi-value">${escapeHtml(String(k.value))}</strong>
        <span class="kpi-label">${escapeHtml(k.label)}</span>
        <span class="kpi-sub">${escapeHtml(k.sub)}</span>
      </article>`).join('');
    kpiRow.querySelectorAll('.kpi-card--clickable').forEach(card => {
      card.addEventListener('click', () => {
        const [key, val] = card.dataset.filter.split('=');
        const el = elements.filtersForm.elements[key === 'priority' ? 'priority' : 'status'];
        if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); }
        state.activeTab = 'tickets';
        renderTabs();
      });
    });
  }

  // At-risk panel
  renderAtRisk(document.getElementById('at-risk-table'), d.atRisk);
  const atRiskPanel = document.getElementById('at-risk-panel');
  const atRiskCount = document.getElementById('at-risk-count');
  if (atRiskPanel) atRiskPanel.hidden = !(d.atRisk && d.atRisk.length);
  if (atRiskCount && d.atRisk) atRiskCount.textContent = `${d.atRisk.length} ticket${d.atRisk.length !== 1 ? 's' : ''}`;

  // Flow chart + delta badge
  renderSvgFlowChart(elements.weeklyFlowChart, d.weeklyFlow);
  const flowDelta = document.getElementById('flow-net-delta');
  if (flowDelta && d.weeklyFlow && d.weeklyFlow.length) {
    const last = d.weeklyFlow[d.weeklyFlow.length - 1];
    const delta = (last.closed || 0) - (last.opened || 0);
    flowDelta.textContent = delta > 0 ? `+${delta} net closed` : delta < 0 ? `${delta} net open` : 'balanced';
    flowDelta.className = `net-delta-badge ${delta > 0 ? 'success' : delta < 0 ? 'warning' : 'neutral'}`;
  }

  // Comparison charts
  renderLeadTimeChart(document.getElementById('lead-time-chart'), d.leadTimeDistribution);
  renderCategoryTrendChart(document.getElementById('category-trend-chart'), d.categoryTrend);
  renderHorizontalBars(document.getElementById('closed-assignee-chart'), d.closedByAssignee);

  // Workload table
  renderWorkloadTable(document.getElementById('workload-table'), d.workload);

  // Activity feed
  renderActivityFeed(document.getElementById('activity-feed'), d.recentActivity);

  // Priority & aging health
  renderHorizontalBars(elements.priorityChart, d.openByPriority, {
    colorMap: { "P1 high": "danger", "P2 medium": "warning", "P3 low": "neutral" }
  });
  renderHorizontalBars(elements.agingBucketsChart, d.backlogAgingBuckets, {
    colorMap: { "0-2 days": "success", "3-7 days": "warning", "8-14 days": "danger", "15+ days": "danger" }
  });
}

function renderSvgFlowChart(container, data) {
  if (!container) return;
  const items = (data || []).slice(-8);
  if (!items.length) { container.innerHTML = `<p class="empty-state">No data.</p>`; return; }

  const W = 560, H = 180, PAD = { top: 14, right: 12, bottom: 34, left: 28 };
  const cW = W - PAD.left - PAD.right, cH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...items.flatMap(d => [d.opened, d.closed]), 1);
  const xStep = cW / Math.max(items.length - 1, 1);
  const y = v => PAD.top + cH - Math.round((v / maxVal) * cH);
  const pts = key => items.map((d, i) => [PAD.left + i * xStep, y(d[key])]);

  const area = (points, color) => {
    const line = points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
    const close = `L${points[points.length - 1][0].toFixed(1)},${(PAD.top + cH).toFixed(1)} L${points[0][0].toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`;
    return `<path d="${line} ${close}" fill="${color}" opacity="0.12"/>
            <path d="${line}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  };

  const dots = (points, color) => points.map(p =>
    `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3.5" fill="${color}" stroke="var(--surface)" stroke-width="1.5"/>`
  ).join('');

  const axisLabels = items.map((d, i) =>
    `<text x="${(PAD.left + i * xStep).toFixed(1)}" y="${H - 6}" text-anchor="middle" class="svg-axis-label">${escapeHtml(d.label)}</text>`
  ).join('');

  const openedPts = pts('opened'), closedPts = pts('closed');

  container.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="svg-flow" role="img" aria-label="Weekly ticket flow chart" preserveAspectRatio="xMidYMid meet">
      <line x1="${PAD.left}" y1="${PAD.top + cH}" x2="${W - PAD.right}" y2="${PAD.top + cH}" stroke="var(--border)" stroke-width="1"/>
      ${area(openedPts, 'var(--brand)')}
      ${area(closedPts, 'var(--success)')}
      ${dots(openedPts, 'var(--brand)')}
      ${dots(closedPts, 'var(--success)')}
      ${axisLabels}
    </svg>
    <div class="chart-legend">
      <span><span class="legend-dot" style="background:var(--brand)"></span>Opened</span>
      <span><span class="legend-dot" style="background:var(--success)"></span>Closed</span>
    </div>`;
}

function renderLeadTimeChart(container, data) {
  if (!container) return;
  const items = (data || []);
  if (!items.length) { container.innerHTML = '<p class="empty-state">No closed tickets yet.</p>'; return; }
  const max = Math.max(...items.map(d => d.value), 1);
  const colors = ['#25a87e','#4db87a','#f5a623','#e8734a','#d94f4f'];
  const W = 340, H = 160, PAD = { top: 20, right: 10, bottom: 28, left: 28 };
  const cW = W - PAD.left - PAD.right, cH = H - PAD.top - PAD.bottom;
  const bW = Math.floor(cW / items.length) - 6;
  const bars = items.map((item, i) => {
    const bH = item.value ? Math.max(4, Math.round((item.value / max) * cH)) : 0;
    const x = PAD.left + i * (bW + 6);
    const y = PAD.top + cH - bH;
    return `<rect x="${x}" y="${y}" width="${bW}" height="${bH}" rx="3" fill="${colors[i] || '#888'}"/>
            <text x="${x + bW/2}" y="${y - 4}" text-anchor="middle" class="svg-bar-value">${item.value || ''}</text>
            <text x="${x + bW/2}" y="${H - 6}" text-anchor="middle" class="svg-axis-label">${item.label}</text>`;
  }).join('');
  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="svg-vbar" role="img" aria-label="Lead time distribution">${bars}</svg>`;
}

function renderCategoryTrendChart(container, data) {
  if (!container) return;
  const items = (data || []);
  if (!items.length) { container.innerHTML = '<p class="empty-state">No data.</p>'; return; }
  const max = Math.max(...items.flatMap(d => [d.thisMonth, d.prevMonth]), 1);
  container.innerHTML = `
    <div class="cmp-chart">
      ${items.map(item => `
        <div class="cmp-row">
          <span class="cmp-label" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
          <div class="cmp-bars">
            <div class="cmp-bar-group">
              <div class="cmp-bar cmp-bar--current" style="width:${Math.max(item.thisMonth ? 4 : 0, Math.round(item.thisMonth/max*100))}%" title="This month: ${item.thisMonth}"></div>
              <span class="cmp-val">${item.thisMonth}</span>
            </div>
            <div class="cmp-bar-group">
              <div class="cmp-bar cmp-bar--prev" style="width:${Math.max(item.prevMonth ? 4 : 0, Math.round(item.prevMonth/max*100))}%" title="Last month: ${item.prevMonth}"></div>
              <span class="cmp-val cmp-val--prev">${item.prevMonth}</span>
            </div>
          </div>
        </div>`).join('')}
    </div>
    <div class="chart-legend" style="margin-top:10px">
      <span><span class="legend-dot" style="background:var(--brand)"></span>This month</span>
      <span><span class="legend-dot" style="background:var(--muted);opacity:.5"></span>Last month</span>
    </div>`;
}

function renderStatusRing(container, data) {
  if (!container) return;
  const items = (data || []).filter(d => d.value > 0);
  if (!items.length) { container.innerHTML = `<p class="empty-state">No data.</p>`; return; }

  const colorMap = { 'Open': 'var(--neutral-fg)', 'In Progress': 'var(--brand)', 'Blocked': 'var(--danger)', 'Closed': 'var(--success)' };
  const total = items.reduce((s, d) => s + d.value, 0) || 1;
  const R = 54, CX = 70, CY = 70, STROKE = 20;
  const circ = 2 * Math.PI * R;

  let offset = 0;
  const segments = items.map(item => {
    const dash = (item.value / total) * circ;
    const gap = circ - dash;
    const seg = `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none"
      stroke="${colorMap[item.label] || 'var(--muted)'}" stroke-width="${STROKE}"
      stroke-dasharray="${dash.toFixed(2)} ${gap.toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 ${CX} ${CY})"><title>${item.label}: ${item.value}</title></circle>`;
    offset += dash;
    return seg;
  });

  const legend = items.map(item => `
    <div class="ring-legend-row">
      <span class="ring-dot" style="background:${colorMap[item.label] || 'var(--muted)'}"></span>
      <span class="ring-label">${escapeHtml(item.label)}</span>
      <strong class="ring-count">${item.value}</strong>
      <span class="ring-pct muted">${Math.round(item.value / total * 100)}%</span>
    </div>`).join('');

  container.innerHTML = `
    <div class="ring-layout">
      <svg viewBox="0 0 140 140" class="svg-ring" role="img" aria-label="Status distribution donut chart">
        ${segments.join('')}
        <text x="${CX}" y="${CY - 4}" text-anchor="middle" class="ring-total-value">${total}</text>
        <text x="${CX}" y="${CY + 14}" text-anchor="middle" class="ring-total-sub">tickets</text>
      </svg>
      <div class="ring-legend">${legend}</div>
    </div>`;
}

function renderWorkloadTable(container, data) {
  if (!container) return;
  const items = (data || []);
  if (!items.length) { container.innerHTML = `<p class="empty-state">No workload data.</p>`; return; }
  const maxTotal = Math.max(...items.map(d => d.total), 1);

  container.innerHTML = `
    <table class="wl-table">
      <thead><tr><th>Assignee</th><th title="Open">○</th><th title="In Progress">◑</th><th title="Blocked">⊘</th><th class="wl-bar-col">Load</th></tr></thead>
      <tbody>${items.map(row => `
        <tr>
          <td class="wl-name">${escapeHtml(row.assignee || '—')}</td>
          <td class="wl-num">${row.open}</td>
          <td class="wl-num">${row.inProgress}</td>
          <td class="wl-num${row.blocked > 0 ? ' wl-num--danger' : ''}">${row.blocked}</td>
          <td class="wl-bar-col"><div class="wl-bar-track"><div class="wl-bar-fill" style="width:${Math.round(row.total / maxTotal * 100)}%"></div></div></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderActivityFeed(container, data) {
  if (!container) return;
  const items = (data || []);
  if (!items.length) { container.innerHTML = `<p class="empty-state">No recent activity.</p>`; return; }
  const statusSlug = s => (s || '').toLowerCase().replace(/\s+/g, '-');

  container.innerHTML = items.map(item => `
    <div class="af-item">
      <span class="af-dot"></span>
      <div class="af-body">
        <p class="af-ticket">#${escapeHtml(String(item.jd_ticket_number || item.ticket_id))}
          <span class="af-desc">${escapeHtml((item.description || '').slice(0, 60))}${(item.description || '').length > 60 ? '…' : ''}</span>
        </p>
        <p class="af-comment">${escapeHtml((item.comment || '').slice(0, 90))}${(item.comment || '').length > 90 ? '…' : ''}</p>
        <p class="af-meta">
          <span class="status-pill status-pill--${statusSlug(item.status)}">${escapeHtml(item.status || '')}</span>
          <span class="muted">${formatIsoDate(item.created_at)}</span>
        </p>
      </div>
    </div>`).join('');
}

function renderAtRisk(container, data) {
  if (!container) return;
  const items = (data || []);
  if (!items.length) { container.innerHTML = `<p class="empty-state">No at-risk tickets.</p>`; return; }

  const riskClass = item => {
    if (item.priority === 'P1 high') return 'ar-row--p1';
    if (item.status === 'Blocked') return 'ar-row--blocked';
    return 'ar-row--aged';
  };
  const riskLabel = item => {
    const tags = [];
    if (item.priority === 'P1 high') tags.push(`<span class="ar-tag ar-tag--p1">P1</span>`);
    if (item.status === 'Blocked') tags.push(`<span class="ar-tag ar-tag--blocked">Blocked</span>`);
    if (item.aging >= 10) tags.push(`<span class="ar-tag ar-tag--aged">${item.aging}d</span>`);
    return tags.join('');
  };

  container.innerHTML = `
    <table class="ar-table">
      <thead><tr><th>Ticket</th><th>Description</th><th>Assignee</th><th>Status</th><th>Flags</th></tr></thead>
      <tbody>${items.map(item => `
        <tr class="${riskClass(item)}">
          <td class="ar-num">#${escapeHtml(String(item.jd_ticket_number || item.id))}</td>
          <td class="ar-desc">${escapeHtml((item.description || '').slice(0, 70))}${(item.description || '').length > 70 ? '…' : ''}</td>
          <td class="ar-assignee">${escapeHtml(item.assignee || '—')}</td>
          <td><span class="status-pill status-pill--${(item.status || '').toLowerCase().replace(/\s+/g, '-')}">${escapeHtml(item.status || '')}</span></td>
          <td class="ar-flags">${riskLabel(item)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function renderVerticalBarChart(container, data, unitLabel) {
  if (!container) return;
  const items = (data || []).slice(-10);
  if (!items.length) {
    container.innerHTML = `<p class="empty-state">No data available.</p>`;
    return;
  }
  const max = Math.max(...items.map((item) => item.value), 1);
  container.innerHTML = `
    <div class="v-chart">
      ${items.map(item => `
        <div class="v-bar-group">
          <span class="v-bar-value">${item.value || ""}</span>
          <div class="v-bar-track"><div class="v-bar-fill" style="height:${item.value ? Math.max(6, Math.round((item.value / max) * 100)) : 0}%"></div></div>
          <span class="v-bar-label">${escapeHtml(item.label)}</span>
        </div>`).join("")}
    </div>
    <p class="chart-footnote">${unitLabel} per period</p>
  `;
}

function renderHorizontalBars(container, data, opts = {}) {
  if (!container) return;
  const items = data && data.length ? data : [];
  if (!items.length) {
    container.innerHTML = `<p class="empty-state">No data available.</p>`;
    return;
  }
  const max = Math.max(...items.map(item => item.value), 1);
  const { colorMap = {} } = opts;
  container.innerHTML = `
    <div class="h-chart">
      ${items.map(item => {
        const colorClass = colorMap[item.label] || "brand";
        const pct = item.value ? Math.max(4, Math.round((item.value / max) * 100)) : 0;
        return `
          <div class="h-row">
            <span class="h-label" title="${escapeHtml(item.label)}">${escapeHtml(item.label)}</span>
            <div class="h-track"><div class="h-fill h-fill--${colorClass}" style="width:${pct}%"></div></div>
            <span class="h-value">${item.value}</span>
          </div>`;
      }).join("")}
    </div>`;
}

async function exportCsv() {
  try {
    const params = new URLSearchParams(new FormData(elements.filtersForm));
    const response = await fetch(`/api/tickets/export?${params.toString()}`, {
      headers: { "X-CSRF-Token": state.csrfToken },
      credentials: "same-origin"
    });
    if (!response.ok) throw new Error("Export failed.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tickets-${formatIsoDate(Date.now())}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function saveTicket(event) {
  event.preventDefault();
  const payload = {
    description: document.querySelector("#description").value,
    jd_ticket_number: document.querySelector("#jd_ticket_number").value,
    category: document.querySelector("#category").value,
    updates_comments: document.querySelector("#updates_comments").value,
    priority: document.querySelector("#priority").value,
    status: "Open",
    date_opening: document.querySelector("#date_opening").value,
    date_closed: "",
    assignee: document.querySelector("#assignee").value,
    manager: document.querySelector("#manager").value
  };
  try {
    await apiFetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    showMessage("Ticket created.");
    resetTicketForm();
    await Promise.all([refreshTickets(), refreshDashboard(), refreshRolesPanel()]);
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function openTicketDetail(id) {
  try {
    const data = await apiFetch(`/api/tickets/${id}`);
    state.selectedTicket = data.ticket;
    elements.ticketDetail.hidden = false;
    renderTicketDetail();
    if (window.location.hash !== `#ticket-${id}`) history.replaceState(null, "", `#ticket-${id}`);
  } catch (error) {
    showMessage(error.message, true);
  }
}

function renderTicketDetail() {
  const ticket = state.selectedTicket;
  if (!ticket) return;
  const role = state.currentUser?.role;
  const canDelete = role === "manager" || role === "admin";
  const deleteZone = document.getElementById('delete-ticket-zone');
  if (deleteZone) deleteZone.hidden = !canDelete;
  elements.detailTitle.textContent = `Ticket ${ticket.jd_ticket_number}`;
  elements.detailDescription.textContent = ticket.description;
  elements.detailJdTicketNumber.textContent = ticket.jd_ticket_number;
  elements.detailCategory.textContent = ticket.category;
  elements.detailAssignee.textContent = ticket.assignee;
  elements.detailManager.textContent = ticket.manager;
  elements.detailDateOpening.textContent = formatDisplayDate(ticket.date_opening);
  elements.detailDateClosed.textContent = ticket.date_closed ? formatDisplayDate(ticket.date_closed) : "Still open";
  elements.detailAging.textContent = `${ticket.aging} days`;
  elements.detailCommentCount.textContent = String(ticket.comments.length);
  elements.detailPriority.className = `badge ${priorityTone(ticket.priority)}`;
  elements.detailPriority.textContent = ticket.priority;
  elements.detailStatus.className = `badge ${statusTone(ticket.status)}`;
  elements.detailStatus.textContent = ticket.status;

  elements.managerDescription.value = ticket.description;
  elements.managerJdTicketNumber.value = ticket.jd_ticket_number;
  elements.managerCategory.value = ticket.category;
  elements.managerPriority.value = ticket.priority;
  elements.managerStatus.value = ticket.status;
  elements.managerAssignee.value = ticket.assignee;
  elements.managerManager.value = ticket.manager;
  elements.managerDateOpening.value = ticket.date_opening;
  elements.managerDateClosed.value = ticket.date_closed || "";

  elements.commentsList.innerHTML = ticket.comments.length
    ? ticket.comments
        .map(
          (comment) => `
            <article class="comment-item">
              <div class="comment-head">
                <strong>${escapeHtml(comment.author)}</strong>
                <div class="comment-meta">
                  <span class="badge ${commentTypeTone(comment.comment_type)}">${escapeHtml(comment.comment_type || "Update")}</span>
                  <span class="table-subtext">${escapeHtml(formatCommentDate(comment.created_at))}</span>
                </div>
              </div>
              <p>${escapeHtml(comment.body).replaceAll("\n", "<br />")}</p>
            </article>
          `
        )
        .join("")
    : `<p class="empty-state">No comments yet on this ticket.</p>`;
  elements.detailNewComment.value = "";
  renderAttachments(ticket);
}

function renderAttachments(ticket) {
  const container = document.getElementById('attachments-section');
  if (!container) return;
  const isManager = state.currentUser && (state.currentUser.role === 'manager' || state.currentUser.role === 'admin');
  const attachments = ticket.attachments || [];
  container.innerHTML = `
    <p class="eyebrow" style="margin-bottom:0.5rem">Attachments (${attachments.length})</p>
    ${attachments.map(a => `
      <div class="attachment-item">
        <span>${escapeHtml(a.filename)} <span class="muted">(${formatBytes(a.size_bytes)})</span></span>
        <div style="display:flex;gap:6px">
          <a href="/api/tickets/${ticket.id}/attachments/${a.id}" class="small-button ghost" style="text-decoration:none;padding:5px 10px;border-radius:10px;border:1px solid rgba(153,173,197,0.16);font-size:0.82rem">Download</a>
          ${isManager ? `<button type="button" class="small-button ghost" style="color:var(--danger)" data-delete-attachment="${a.id}">Delete</button>` : ''}
        </div>
      </div>
    `).join('')}
    <div class="attachment-upload">
      <label class="ghost small-button" for="attachment-file-input" style="cursor:pointer;padding:7px 10px;border-radius:10px;border:1px solid rgba(153,173,197,0.16)">Attach file</label>
      <input type="file" id="attachment-file-input" accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,text/csv" hidden />
      <span class="muted" style="font-size:0.8rem">Max 8 MB · JPG, PNG, PDF, CSV, TXT</span>
    </div>
  `;
  container.querySelectorAll('[data-delete-attachment]').forEach(btn => {
    btn.addEventListener('click', () => deleteAttachment(ticket.id, Number(btn.dataset.deleteAttachment)));
  });
  const fileInput = container.querySelector('#attachment-file-input');
  fileInput?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) uploadAttachment(ticket.id, file);
  });
}

async function uploadAttachment(ticketId, file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        await apiFetch(`/api/tickets/${ticketId}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: file.name, mimetype: file.type, data: base64 })
        });
        showMessage('File attached.');
        await openTicketDetail(ticketId);
        resolve();
      } catch (error) { showMessage(error.message, true); reject(error); }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function deleteAttachment(ticketId, attachmentId) {
  if (!window.confirm('Delete this attachment?')) return;
  try {
    await apiFetch(`/api/tickets/${ticketId}/attachments/${attachmentId}`, { method: 'DELETE' });
    showMessage('Attachment deleted.');
    await openTicketDetail(ticketId);
  } catch (error) { showMessage(error.message, true); }
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function saveOriginalTicket(event) {
  event.preventDefault();
  if (!state.selectedTicket) return;
  const payload = {
    description: elements.managerDescription.value,
    jd_ticket_number: elements.managerJdTicketNumber.value,
    category: elements.managerCategory.value,
    updates_comments: state.selectedTicket.updates_comments || "",
    priority: elements.managerPriority.value,
    status: elements.managerStatus.value,
    date_opening: elements.managerDateOpening.value,
    date_closed: elements.managerDateClosed.value,
    assignee: elements.managerAssignee.value,
    manager: elements.managerManager.value
  };
  try {
    const data = await apiFetch(`/api/tickets/${state.selectedTicket.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    showMessage("Ticket updated.");
    await Promise.all([refreshTickets(), refreshDashboard(), refreshRolesPanel()]);
    await openTicketDetail(data.ticket.id);
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function postComment() {
  if (!state.selectedTicket) return;
  const payload = {
    author: elements.detailCommentAuthor.value,
    comment_type: elements.detailCommentType.value,
    body: elements.detailNewComment.value
  };
  try {
    await apiFetch(`/api/tickets/${state.selectedTicket.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    showMessage("Comment posted.");
    await Promise.all([refreshTickets(), refreshDashboard(), refreshRolesPanel()]);
    await openTicketDetail(state.selectedTicket.id);
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function saveUser(event) {
  event.preventDefault();
  const payload = {
    name: elements.userName.value,
    email: elements.userEmail.value,
    role: elements.userRole.value,
    active: elements.userActive.checked,
    password: elements.userPassword.value,
    password_reset_required: elements.userPasswordResetRequired.checked
  };
  const userId = elements.userId.value;
  try {
    await apiFetch(userId ? `/api/users/${userId}` : "/api/users", {
      method: userId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    showMessage(userId ? "User updated." : "User created.");
    resetUserForm();
    await Promise.all([refreshMeta(), refreshRolesPanel(), refreshTickets(), refreshDashboard()]);
    if (state.selectedTicket) await openTicketDetail(state.selectedTicket.id);
  } catch (error) {
    showMessage(error.message, true);
  }
}

function renderUsers() {
  elements.usersList.innerHTML = state.users
    .map(
      (user) => `
        <article class="user-card">
          <div>
            <strong>${escapeHtml(user.name)}</strong>
            <div class="table-subtext">${escapeHtml(user.role)} • ${user.active ? "active" : "disabled"}</div>
            <div class="table-subtext">${user.password_reset_required ? "password reset required" : "password active"}</div>
          </div>
          <div class="user-actions">
            <button type="button" class="small-button ghost" data-edit-user="${user.id}">Edit</button>
            <button type="button" class="small-button ghost" data-delete-user="${user.id}">Delete</button>
          </div>
        </article>
      `
    )
    .join("");
  document.querySelectorAll("[data-edit-user]").forEach((button) => {
    button.addEventListener("click", () => populateUserForm(Number(button.dataset.editUser)));
  });
  document.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", () => deleteUser(Number(button.dataset.deleteUser)));
  });
}

function populateUserForm(id) {
  const user = state.users.find((item) => item.id === id);
  if (!user) return;
  elements.userId.value = user.id;
  elements.userName.value = user.name;
  elements.userEmail.value = user.email || '';
  elements.userRole.value = user.role;
  elements.userActive.checked = Boolean(user.active);
  elements.userPassword.value = "";
  elements.userPasswordResetRequired.checked = Boolean(user.password_reset_required);
  elements.userSubmit.textContent = "Update user";
}

async function deleteUser(id) {
  try {
    await apiFetch(`/api/users/${id}`, { method: "DELETE" });
    showMessage("User deleted.");
    await Promise.all([refreshMeta(), refreshRolesPanel(), refreshTickets(), refreshDashboard()]);
  } catch (error) {
    showMessage(error.message, true);
  }
}

function resetUserForm() {
  elements.userForm.reset();
  elements.userId.value = "";
  elements.userSubmit.textContent = "Save user";
  elements.userActive.checked = true;
  elements.userPasswordResetRequired.checked = true;
}

async function saveWebhook(event) {
  event.preventDefault();
  const payload = {
    name: elements.webhookName.value,
    url: elements.webhookUrl.value,
    secret: elements.webhookSecret.value,
    active: elements.webhookActive.checked
  };
  const id = elements.webhookId.value;
  try {
    await apiFetch(id ? `/api/webhooks/${id}` : "/api/webhooks", {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    showMessage(id ? "Webhook updated." : "Webhook created.");
    resetWebhookForm();
    await refreshRolesPanel();
  } catch (error) {
    showMessage(error.message, true);
  }
}

function renderWebhooks() {
  elements.webhooksList.innerHTML = state.webhooks.length
    ? state.webhooks
        .map(
          (hook) => `
            <article class="user-card">
              <div>
                <strong>${escapeHtml(hook.name)}</strong>
                <div class="table-subtext">${escapeHtml(hook.url)}</div>
                <div class="table-subtext">${hook.active ? "enabled" : "disabled"} • ${hook.has_secret ? "signed" : "unsigned"}</div>
              </div>
              <div class="user-actions">
                <button type="button" class="small-button ghost" data-edit-webhook="${hook.id}">Edit</button>
                <button type="button" class="small-button ghost" data-test-webhook="${hook.id}">Test</button>
                <button type="button" class="small-button ghost" data-delete-webhook="${hook.id}">Delete</button>
              </div>
            </article>
          `
        )
        .join("")
    : `<p class="muted">No webhooks configured.</p>`;

  document.querySelectorAll("[data-edit-webhook]").forEach((button) => {
    button.addEventListener("click", () => populateWebhookForm(Number(button.dataset.editWebhook)));
  });
  document.querySelectorAll("[data-delete-webhook]").forEach((button) => {
    button.addEventListener("click", () => deleteWebhook(Number(button.dataset.deleteWebhook)));
  });
  document.querySelectorAll("[data-test-webhook]").forEach((button) => {
    button.addEventListener("click", () => testWebhook(Number(button.dataset.testWebhook)));
  });
}

function populateWebhookForm(id) {
  const hook = state.webhooks.find((item) => item.id === id);
  if (!hook) return;
  elements.webhookId.value = hook.id;
  elements.webhookName.value = hook.name;
  elements.webhookUrl.value = hook.url;
  elements.webhookSecret.value = "";
  elements.webhookActive.checked = Boolean(hook.active);
  elements.webhookSubmit.textContent = "Update webhook";
}

async function deleteWebhook(id) {
  try {
    await apiFetch(`/api/webhooks/${id}`, { method: "DELETE" });
    showMessage("Webhook deleted.");
    await refreshRolesPanel();
  } catch (error) {
    showMessage(error.message, true);
  }
}

function resetWebhookForm() {
  elements.webhookForm.reset();
  elements.webhookId.value = "";
  elements.webhookSubmit.textContent = "Save webhook";
  elements.webhookActive.checked = true;
}



function renderWebhookDeliveries() {
  elements.webhookDeliveriesList.innerHTML = state.webhookDeliveries.length
    ? state.webhookDeliveries
        .slice(0, 20)
        .map((delivery) => `
          <article class="audit-item">
            <div class="audit-head">
              <strong>${escapeHtml(delivery.webhook_name)}</strong>
              <span class="badge ${delivery.success ? "success" : "danger"}">${delivery.success ? "ok" : "failed"}</span>
            </div>
            <div class="table-subtext">${escapeHtml(delivery.event_name)} • ${escapeHtml(formatCommentDate(delivery.created_at))}</div>
            <pre>${escapeHtml(JSON.stringify({ status: delivery.response_status, duration_ms: delivery.duration_ms, request_id: delivery.request_id, error: delivery.error_message }, null, 2))}</pre>
          </article>
        `)
        .join("")
    : `<p class="muted">No webhook deliveries yet.</p>`;
}

async function testWebhook(id) {
  try {
    await apiFetch(`/api/webhooks/${id}/test`, { method: "POST" });
    showMessage("Webhook test sent.");
    await refreshRolesPanel();
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function changePassword(event) {
  event.preventDefault();
  const currentPassword = elements.passwordResetCurrent.value;
  const newPassword = elements.passwordResetNew.value;
  const confirmPassword = elements.passwordResetConfirm.value;
  if (newPassword !== confirmPassword) {
    showMessage("La confirmación de la contraseña no coincide.", true);
    return;
  }
  try {
    await apiFetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    });
    showMessage('Contraseña actualizada. Inicia sesión de nuevo.');
    elements.passwordResetForm.reset();
    await logout();
  } catch (error) {
    showMessage(error.message, true);
  }
}

function renderAudit() {
  elements.auditList.innerHTML = state.auditEvents.length
    ? state.auditEvents
        .slice(0, 120)
        .map(
          (event) => `
            <article class="audit-item">
              <div class="audit-head">
                <strong>${escapeHtml(event.entity_type)}:${event.entity_id ?? "-"}</strong>
                <span class="badge neutral">${escapeHtml(event.action)}</span>
              </div>
              <div class="table-subtext">Actor: ${escapeHtml(event.actor)} • ${escapeHtml(formatCommentDate(event.created_at))}</div>
              <pre>${escapeHtml(JSON.stringify(event.details_json, null, 2))}</pre>
            </article>
          `
        )
        .join("")
    : `<p class="muted">No audit events available.</p>`;
}

// ─── IMPORT FEATURE ─────────────────────────────────────────────────────────

const IMPORT_FIELDS = [
  { key: "description", label: "Description", required: true },
  { key: "jd_ticket_number", label: "JD Ticket Number", required: true },
  { key: "category", label: "Category", required: true },
  { key: "priority", label: "Priority", required: true },
  { key: "status", label: "Status", required: false, defaultValue: "Open" },
  { key: "assignee", label: "Assignee", required: true },
  { key: "manager", label: "Manager", required: true },
  { key: "date_opening", label: "Date Opened (DD/MM/YYYY)", required: true },
  { key: "date_closed", label: "Date Closed (DD/MM/YYYY)", required: false },
  { key: "updates_comments", label: "Initial Note", required: false }
];

const COLUMN_ALIASES = {
  description: ["description", "desc", "issue", "summary", "title"],
  jd_ticket_number: ["jd_ticket_number", "jd", "jd_number", "ticket_number", "jd ticket number", "ticket"],
  category: ["category", "cat", "type"],
  priority: ["priority", "prio", "urgency"],
  status: ["status", "state"],
  assignee: ["assignee", "assigned_to", "assigned to", "owner", "responsible"],
  manager: ["manager", "supervisor", "lead"],
  date_opening: ["date_opening", "date_opened", "open_date", "opened", "date ouverture", "date opening"],
  date_closed: ["date_closed", "date_close", "closed_date", "close_date", "closed"],
  updates_comments: ["updates_comments", "comments", "notes", "note", "initial_note", "update"]
};

function autoMapColumn(header) {
  const normalized = header.toLowerCase().trim().replace(/\s+/g, "_");
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some((alias) => alias.replace(/\s+/g, "_") === normalized)) return field;
  }
  return "";
}

function parseCsv(text) {
  const raw = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    const next = raw[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(field); field = ""; }
      else if (ch === '\r' && next === '\n') { row.push(field); field = ""; rows.push(row); row = []; i++; }
      else if (ch === '\n' || ch === '\r') { row.push(field); field = ""; rows.push(row); row = []; }
      else { field += ch; }
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  while (rows.length && rows[rows.length - 1].every((f) => !f.trim())) rows.pop();
  return rows;
}

function parseCsvToObjects(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { headers: [], records: [] };
  const headers = rows[0].map((h) => h.trim());
  const records = rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (row[i] || "").trim(); });
    return obj;
  });
  return { headers, records };
}

function validateImportRow(row, meta) {
  const errors = [];
  const warnings = [];
  // Hard errors — block import
  if (!row.description) errors.push("Description is required");
  if (!row.jd_ticket_number) errors.push("JD ticket number is required");
  if (!row.date_opening) errors.push("Date opened is required");
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date_opening)) errors.push(`Date format unrecognized: "${row.date_opening}"`);
  if (row.date_closed && !/^\d{4}-\d{2}-\d{2}$/.test(row.date_closed)) errors.push(`Date closed unrecognized: "${row.date_closed}"`);
  // Soft warnings — will use defaults, but still importable
  if (!row.priority) warnings.push("Priority missing → will default to P3 low");
  else if (!meta.priorities.includes(row.priority)) warnings.push(`Unknown priority "${row.priority}" → will default to P3 low`);
  if (!row.category) warnings.push("Category missing → will default to first category");
  else if (!meta.categories.includes(row.category)) warnings.push(`Unknown category "${row.category}" → will default`);
  if (!row.assignee) warnings.push("Assignee missing → will default to first user");
  else if (!meta.users.includes(row.assignee)) warnings.push(`Unknown assignee "${row.assignee}" → will default`);
  if (!row.manager) warnings.push("Manager missing → will default to first manager");
  else if (!meta.managers.includes(row.manager)) warnings.push(`Unknown manager "${row.manager}" → will default`);
  const status = row.status || "Open";
  if (!meta.statuses.includes(status)) warnings.push(`Unknown status "${row.status}" → will default to Open`);
  return { errors, warnings };
}

const DATE_FIELDS = new Set(["date_opening", "date_closed", "due_date"]);

function normalizeDateField(value) {
  if (!value) return value;
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  let m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2,"0")}-${m[3].padStart(2,"0")}`;
  m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (m) {
    const day = Number(m[1]), month = Number(m[2]);
    if (month > 12 && day <= 12)
      return `${m[3]}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`;
    return `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  }
  return value;
}

function applyMapping(records, mapping) {
  return records.map((record) => {
    const mapped = {};
    for (const [userCol, systemField] of Object.entries(mapping)) {
      if (systemField) {
        const raw = record[userCol] || "";
        mapped[systemField] = DATE_FIELDS.has(systemField) ? normalizeDateField(raw) : raw;
      }
    }
    return mapped;
  });
}

function bindImportEvents() {
  elements.importCsv.addEventListener("click", openImportModal);
  elements.openImportFromEntry.addEventListener("click", openImportModal);
  elements.closeImport.addEventListener("click", closeImportModal);
  elements.importOverlay.addEventListener("click", (e) => { if (e.target === elements.importOverlay) closeImportModal(); });

  elements.downloadTemplate.addEventListener("click", async () => {
    try {
      const response = await fetch("/api/tickets/import-template", {
        headers: { "X-CSRF-Token": state.csrfToken },
        credentials: "same-origin"
      });
      if (!response.ok) throw new Error("Could not download template.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ticket-import-template.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showMessage(error.message, true);
    }
  });

  elements.importFileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) handleImportFile(file);
  });

  const dz = elements.importDropZone;
  dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("drag-over"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("drag-over"));
  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    dz.classList.remove("drag-over");
    const file = e.dataTransfer.files[0];
    if (file) handleImportFile(file);
  });

  elements.importProceed.addEventListener("click", showImportPreview);
  elements.importBackUpload.addEventListener("click", () => showImportStep("upload"));
  elements.importConfirm.addEventListener("click", runImport);
  elements.importBackMapping.addEventListener("click", () => showImportStep("mapping"));
  elements.importDone.addEventListener("click", closeImportModal);
}

function openImportModal() {
  if (!state.currentUser || (state.currentUser.role !== "manager" && state.currentUser.role !== "admin")) {
    showMessage("Import requires manager or admin role.", true);
    return;
  }
  state.importParsed = null;
  state.importMapping = {};
  elements.importFileInput.value = "";
  elements.importDropZone.classList.remove("drag-over");
  showImportStep("upload");
  elements.importOverlay.hidden = false;
}

function closeImportModal() {
  elements.importOverlay.hidden = true;
  state.importParsed = null;
  state.importMapping = {};
}

function showImportStep(step) {
  elements.importStepUpload.hidden = step !== "upload";
  elements.importStepMapping.hidden = step !== "mapping";
  elements.importStepPreview.hidden = step !== "preview";
  elements.importStepResults.hidden = step !== "results";
}

async function handleImportFile(file) {
  if (!file.name.match(/\.(csv|txt)$/i)) {
    showMessage("Please upload a .csv file. For Excel, use File → Save As → CSV.", true);
    return;
  }
  try {
    const text = await file.text();
    const { headers, records } = parseCsvToObjects(text);
    if (!headers.length || !records.length) {
      showMessage("File is empty or has no data rows.", true);
      return;
    }
    state.importParsed = { headers, records, fileName: file.name };
    const initialMapping = {};
    for (const header of headers) {
      initialMapping[header] = autoMapColumn(header);
    }
    state.importMapping = initialMapping;
    elements.importRowCount.textContent = records.length;
    renderColumnMapping(headers, initialMapping);
    showImportStep("mapping");
  } catch (error) {
    showMessage("Failed to read file: " + error.message, true);
  }
}

function renderColumnMapping(headers, mapping) {
  const fieldOptions = IMPORT_FIELDS.map((f) =>
    `<option value="${f.key}">${f.label}${f.required ? " *" : ""}</option>`
  ).join("");

  elements.columnMappingTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Your column</th>
          <th>Sample value</th>
          <th>Maps to field</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${headers.map((header) => {
          const sample = state.importParsed.records[0]?.[header] || "";
          const mapped = mapping[header] || "";
          const fieldDef = IMPORT_FIELDS.find((f) => f.key === mapped);
          const statusBadge = mapped
            ? `<span class="badge success">${fieldDef?.required ? "Required" : "Optional"}</span>`
            : `<span class="badge neutral">Not mapped</span>`;
          return `
            <tr>
              <td><strong>${escapeHtml(header)}</strong></td>
              <td class="muted" style="font-size:0.82rem">${escapeHtml(String(sample).slice(0, 60))}</td>
              <td>
                <select class="mapping-select" data-column="${escapeHtml(header)}">
                  <option value="">— skip —</option>
                  ${fieldOptions}
                </select>
              </td>
              <td id="map-status-${header.replace(/[^a-z0-9]/gi, '_')}">${statusBadge}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;

  document.querySelectorAll(".mapping-select").forEach((select) => {
    const col = select.dataset.column;
    select.value = mapping[col] || "";
    select.addEventListener("change", () => {
      state.importMapping[col] = select.value;
      const field = IMPORT_FIELDS.find((f) => f.key === select.value);
      const statusId = `map-status-${col.replace(/[^a-z0-9]/gi, '_')}`;
      const statusEl = document.getElementById(statusId);
      if (statusEl) {
        statusEl.innerHTML = select.value
          ? `<span class="badge success">${field?.required ? "Required" : "Optional"}</span>`
          : `<span class="badge neutral">Not mapped</span>`;
      }
    });
  });
}

function showImportPreview() {
  if (!state.importParsed) return;
  const { records, fileName } = state.importParsed;
  const mapping = state.importMapping;

  const requiredFields = IMPORT_FIELDS.filter((f) => f.required).map((f) => f.key);
  const mappedSystemFields = Object.values(mapping).filter(Boolean);
  const missingRequired = requiredFields.filter((f) => !mappedSystemFields.includes(f));
  if (missingRequired.length) {
    const labels = missingRequired.map((k) => IMPORT_FIELDS.find((f) => f.key === k)?.label || k);
    showMessage(`Please map required fields: ${labels.join(", ")}`, true);
    return;
  }

  const mapped = applyMapping(records, mapping);
  const validatedRows = mapped.map((row, i) => ({
    index: i + 1,
    row,
    ...validateImportRow(row, state.meta)
  }));

  const cleanCount   = validatedRows.filter((r) => !r.errors.length && !r.warnings.length).length;
  const warnCount    = validatedRows.filter((r) => !r.errors.length &&  r.warnings.length).length;
  const errorCount   = validatedRows.filter((r) =>  r.errors.length).length;
  const importable   = cleanCount + warnCount;

  elements.importPreviewSummary.innerHTML = `
    <span class="import-summary-chip valid">${cleanCount} valid</span>
    ${warnCount ? `<span class="import-summary-chip warning">${warnCount} with warnings</span>` : ""}
    ${errorCount ? `<span class="import-summary-chip error">${errorCount} blocked</span>` : ""}
    <span class="import-summary-chip neutral">${records.length} total</span>
  `;

  const previewFields = ["jd_ticket_number", "description", "category", "priority", "status", "assignee", "manager", "date_opening"];
  elements.importPreviewHead.innerHTML = `
    <th>#</th><th>Status</th>
    ${previewFields.map((f) => `<th>${IMPORT_FIELDS.find((x) => x.key === f)?.label || f}</th>`).join("")}
    <th>Notes</th>
  `;
  elements.importPreviewBody.innerHTML = validatedRows.map((item) => {
    const hasErrors   = item.errors.length > 0;
    const hasWarnings = item.warnings.length > 0;
    const statusCell  = hasErrors
      ? `<span class="badge danger">Blocked</span>`
      : hasWarnings
        ? `<span class="badge warning">Warnings</span>`
        : `<span class="badge success">Valid</span>`;
    const notesCell = hasErrors
      ? `<span style="color:var(--danger);font-size:0.78rem">${escapeHtml(item.errors.join("; "))}</span>`
      : hasWarnings
        ? `<span style="color:var(--warning);font-size:0.78rem">${escapeHtml(item.warnings.join("; "))}</span>`
        : `<span class="muted">—</span>`;
    const rowClass = hasErrors ? "import-row-error" : hasWarnings ? "import-row-warning" : "import-row-valid";
    return `
      <tr class="${rowClass}">
        <td>${item.index}</td>
        <td>${statusCell}</td>
        ${previewFields.map((f) => {
          const v = item.row[f];
          return v ? `<td>${escapeHtml(String(v))}</td>` : `<td><span class="muted">—</span></td>`;
        }).join("")}
        <td>${notesCell}</td>
      </tr>
    `;
  }).join("");

  elements.importConfirm.textContent = `Import ${importable} row${importable !== 1 ? "s" : ""}${warnCount ? ` (${warnCount} with defaults)` : ""}`;
  elements.importConfirm.disabled = importable === 0;
  showImportStep("preview");
  state.importValidatedRows = validatedRows;
}

async function runImport() {
  if (!state.importValidatedRows || !state.importParsed) return;
  const validRows = state.importValidatedRows.filter((r) => !r.errors.length).map((r) => r.row);
  if (!validRows.length) { showMessage("No valid rows to import.", true); return; }

  elements.importConfirm.disabled = true;
  elements.importConfirm.textContent = "Importing...";

  try {
    const result = await apiFetch("/api/tickets/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tickets: validRows,
        batch_name: `Import ${formatIsoDate(Date.now())}`,
        file_name: state.importParsed.fileName || ""
      })
    });

    const errorItems = (result.errors || []).slice(0, 20).map((e) =>
      `<div class="import-error-item">Row ${e.row} ${e.jd_ticket_number ? `(${escapeHtml(e.jd_ticket_number)})` : ""}: ${escapeHtml(e.message)}</div>`
    ).join("");

    elements.importResultsContent.innerHTML = `
      <div class="import-result-grid">
        <div class="import-result-stat-card">
          <span class="import-result-number success-color">${result.created}</span>
          <span class="import-result-label">tickets created</span>
        </div>
        <div class="import-result-stat-card">
          <span class="import-result-number ${result.skipped ? 'danger-color' : 'muted'}">${result.skipped}</span>
          <span class="import-result-label">rows skipped</span>
        </div>
        <div class="import-result-stat-card">
          <span class="import-result-number muted">${result.total}</span>
          <span class="import-result-label">rows total</span>
        </div>
      </div>
      ${result.skipped ? `<p class="eyebrow" style="margin-top:1rem">Errors</p><div class="import-error-list">${errorItems}</div>` : ""}
      <p class="muted" style="margin-top:1rem;font-size:0.85rem">Batch ID #${result.batch_id} — visible in Import History on the Data Entry tab.</p>
    `;
    showImportStep("results");
    await Promise.all([refreshTickets(), refreshDashboard(), refreshImportHistory()]);
  } catch (error) {
    showMessage(error.message, true);
    elements.importConfirm.disabled = false;
    elements.importConfirm.textContent = "Import valid rows";
  }
}

async function refreshImportHistory() {
  try {
    const canSee = state.currentUser && (state.currentUser.role === "manager" || state.currentUser.role === "admin");
    if (!canSee) return;
    const data = await apiFetch("/api/import-history");
    state.importBatches = data.batches;
    renderImportHistory();
  } catch {
    // silently ignore if endpoint unavailable
  }
}

function renderImportHistory() {
  const panel = document.getElementById("import-history-panel");
  if (!panel) return;
  if (!state.importBatches.length) {
    elements.importHistoryList.innerHTML = `<p class="muted">No import batches yet. Use the "Import CSV" button to upload tickets.</p>`;
    return;
  }
  const isAdmin = state.currentUser?.role === "admin";
  elements.importHistoryList.innerHTML = state.importBatches.map((batch) => `
    <article class="audit-item">
      <div class="audit-head">
        <div>
          <strong>${escapeHtml(batch.batch_name || `Batch #${batch.id}`)}</strong>
          ${batch.file_name ? `<span class="muted" style="font-size:0.8rem"> — ${escapeHtml(batch.file_name)}</span>` : ""}
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="badge success">${batch.created_count} created</span>
          ${batch.error_count ? `<span class="badge danger">${batch.error_count} errors</span>` : ""}
          ${isAdmin ? `<button type="button" class="small-button ghost" style="color:var(--danger)" data-rollback-batch="${batch.id}">Rollback</button>` : ""}
        </div>
      </div>
      <div class="table-subtext">
        By ${escapeHtml(batch.imported_by)} • ${escapeHtml(formatCommentDate(batch.created_at))} • ${batch.row_count} rows in file
      </div>
    </article>
  `).join("");

  document.querySelectorAll("[data-rollback-batch]").forEach((button) => {
    button.addEventListener("click", () => rollbackImport(Number(button.dataset.rollbackBatch)));
  });
}

async function rollbackImport(batchId) {
  const batch = state.importBatches.find((b) => b.id === batchId);
  const name = batch?.batch_name || `Batch #${batchId}`;
  if (!window.confirm(`Roll back "${name}"?\n\nThis will permanently delete all ${batch?.created_count || 0} tickets created by this import. This cannot be undone.`)) return;
  try {
    const result = await apiFetch(`/api/import-history/${batchId}`, { method: "DELETE" });
    showMessage(`Rollback complete. ${result.tickets_deleted} tickets deleted.`);
    await Promise.all([refreshTickets(), refreshDashboard(), refreshImportHistory()]);
  } catch (error) {
    showMessage(error.message, true);
  }
}

// ─── END IMPORT FEATURE ──────────────────────────────────────────────────────

function closeTicketDetail(options = {}) {
  const { preserveHistory = false } = options;
  state.selectedTicket = null;
  elements.ticketDetail.hidden = true;
  elements.detailNewComment.value = "";
  elements.commentsList.innerHTML = "";
  if (!preserveHistory && window.location.hash.startsWith("#ticket-")) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
  }
}

async function deleteTicket() {
  const ticket = state.selectedTicket;
  if (!ticket) return;
  const confirmed = window.confirm(
    `Delete ticket ${ticket.jd_ticket_number}?\n\n"${ticket.description?.slice(0, 80)}"\n\nThis action cannot be undone.`
  );
  if (!confirmed) return;
  try {
    await apiFetch(`/api/tickets/${ticket.id}`, { method: "DELETE" });
    closeTicketDetail();
    await Promise.all([refreshTickets(), refreshDashboard()]);
    showMessage(`Ticket ${ticket.jd_ticket_number} deleted.`);
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function handleHashChange() {
  const match = window.location.hash.match(/^#ticket-(\d+)$/);
  if (!match) {
    closeTicketDetail({ preserveHistory: true });
    return;
  }
  await openTicketDetail(Number(match[1]));
}

function resetTicketForm() {
  elements.ticketForm.reset();
  elements.submitButton.textContent = "Create ticket";
  setDefaultDates();
}

function setDefaultDates() {
  const opening = document.querySelector("#date_opening");
  if (!opening.value) opening.value = formatIsoDate(Date.now());
}

function showMessage(text, isError = false) {
  elements.message.hidden = false;
  elements.message.textContent = text;
  elements.message.classList.toggle("error", isError);
  clearTimeout(showMessage.timer);
  showMessage.timer = setTimeout(() => {
    elements.message.hidden = true;
  }, 3000);
}

function renderBadge(text, tone) {
  return `<span class="badge ${tone}">${escapeHtml(text)}</span>`;
}

function priorityTone(priority) {
  if (priority.startsWith("P1")) return "danger";
  if (priority.startsWith("P2")) return "warning";
  return "success";
}

function statusTone(status) {
  if (status === "Closed") return "success";
  if (status === "Blocked") return "danger";
  if (status === "In Progress") return "warning";
  return "neutral";
}

function commentTypeTone(type) {
  if (type === "Blocker") return "danger";
  if (type === "Resolution") return "success";
  if (type === "Investigation") return "warning";
  if (type === "System") return "neutral";
  return "neutral";
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatCommentDate(value) {
  return new Date(value).toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatIsoDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function formatDisplayDate(isoDate) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
