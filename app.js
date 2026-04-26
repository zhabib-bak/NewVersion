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
  totalTickets: 0
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
  summaryCards: document.querySelector("#summary-cards"),
  ticketsTableBody: document.querySelector("#tickets-table-body"),
  ticketCount: document.querySelector("#ticket-count"),
  message: document.querySelector("#message"),
  openedTrendChart: document.querySelector("#opened-trend-chart"),
  closedTrendChart: document.querySelector("#closed-trend-chart"),
  priorityChart: document.querySelector("#priority-chart"),
  assigneeChart: document.querySelector("#assignee-chart"),
  categoryChart: document.querySelector("#category-chart"),
  managerChart: document.querySelector("#manager-chart"),
  throughputChart: document.querySelector("#throughput-chart"),
  agingBucketsChart: document.querySelector("#aging-buckets-chart"),
  summaryTemplate: document.querySelector("#summary-card-template"),
  periodButtons: document.querySelectorAll(".period-button"),
  tabButtons: document.querySelectorAll(".tab-button"),
  tabPanels: document.querySelectorAll(".tab-panel"),
  ticketDetail: document.querySelector("#ticket-detail"),
  closeDetail: document.querySelector("#close-detail"),
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
  elements.clearFilters.addEventListener("click", () => {
    elements.filtersForm.reset();
    state.currentPage = 1;
    refreshTickets();
  });
  elements.saveView.addEventListener("click", saveView);
  elements.exportCsv.addEventListener("click", exportCsv);
  elements.ticketForm.addEventListener("submit", saveTicket);
  elements.resetForm.addEventListener("click", resetTicketForm);
  elements.closeDetail.addEventListener("click", closeTicketDetail);
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
}

function showAppSession() {
  elements.loginOverlay.hidden = true;
  elements.sessionUser.textContent = state.currentUser?.name || "-";
  elements.sessionRole.textContent = state.currentUser?.role || "-";
  elements.passwordResetOverlay.hidden = !state.passwordResetRequired;
}

async function login(event) {
  event.preventDefault();
  const payload = {
    name: elements.loginName.value,
    password: elements.loginPassword.value
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
    params.set("per_page", "50");
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

function renderTickets() {
  const { currentPage, totalTickets, tickets } = state;
  const from = totalTickets === 0 ? 0 : (currentPage - 1) * 50 + 1;
  const to = Math.min(currentPage * 50, totalTickets);
  elements.ticketCount.textContent = totalTickets === 0 ? "0 tickets" : `Showing ${from}–${to} of ${totalTickets} tickets`;
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
          <td>${escapeHtml(ticket.date_opening)}</td>
          <td>${escapeHtml(ticket.due_date || "-")}</td>
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

function renderKanban() {
  const statusColumns = ["Open", "In Progress", "Blocked", "Closed"];
  const roleCanMove = state.currentUser && (state.currentUser.role === "manager" || state.currentUser.role === "admin");
  elements.kanbanBoard.innerHTML = statusColumns
    .map((status) => {
      const items = state.tickets.filter((ticket) => ticket.status === status);
      return `
        <section class="kanban-column" data-drop-status="${status}">
          <header><h4>${status}</h4><span>${items.length}</span></header>
          <div class="kanban-cards">
            ${items
              .map(
                (ticket) => `
                  <article class="kanban-card" draggable="${roleCanMove}" data-ticket-id="${ticket.id}">
                    <strong>${escapeHtml(ticket.jd_ticket_number)}</strong>
                    <p>${escapeHtml(ticket.description)}</p>
                    <div class="table-subtext">${escapeHtml(ticket.assignee)} • ${escapeHtml(ticket.priority)}</div>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>
      `;
    })
    .join("");

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

function renderPagination() {
  const el = document.getElementById('pagination-controls');
  if (!el) return;
  const { currentPage, totalPages, totalTickets, tickets } = state;
  const from = totalTickets === 0 ? 0 : (currentPage - 1) * 50 + 1;
  const to = Math.min(currentPage * 50, totalTickets);
  el.innerHTML = totalPages <= 1 ? '' : `
    <button type="button" class="ghost small-button" id="page-prev" ${currentPage <= 1 ? 'disabled' : ''}>← Prev</button>
    <span class="pagination-info">Page ${currentPage} of ${totalPages} &nbsp;·&nbsp; ${from}–${to} of ${totalTickets} tickets</span>
    <button type="button" class="ghost small-button" id="page-next" ${currentPage >= totalPages ? 'disabled' : ''}>Next →</button>
  `;
  document.getElementById('page-prev')?.addEventListener('click', () => { state.currentPage = Math.max(1, state.currentPage - 1); refreshTickets(); });
  document.getElementById('page-next')?.addEventListener('click', () => { state.currentPage = Math.min(state.totalPages, state.currentPage + 1); refreshTickets(); });
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
  const cards = [
    { label: "Total tickets", value: state.dashboard.totals.total },
    { label: "Open", value: state.dashboard.totals.open },
    { label: "Closed", value: state.dashboard.totals.closed },
    { label: "Avg aging", value: `${state.dashboard.totals.avgAging} days` },
    { label: "Avg lead time", value: `${state.dashboard.totals.avgLeadTime} days` },
    { label: "Reopen rate", value: `${state.dashboard.totals.reopenRate}%` },
    { label: "SLA breached open", value: state.dashboard.totals.breachedOpen }
  ];
  elements.summaryCards.innerHTML = "";
  cards.forEach((card) => {
    const fragment = elements.summaryTemplate.content.cloneNode(true);
    fragment.querySelector(".summary-label").textContent = card.label;
    fragment.querySelector(".summary-value").textContent = card.value;
    elements.summaryCards.appendChild(fragment);
  });

  renderVerticalBarChart(elements.openedTrendChart, state.dashboard[`openedBy${capitalize(state.openedPeriod)}`], "Tickets");
  renderVerticalBarChart(elements.closedTrendChart, state.dashboard.closedByDay, "Tickets");
  renderHorizontalBars(elements.priorityChart, state.dashboard.openByPriority);
  renderHorizontalBars(elements.assigneeChart, state.dashboard.openByAssignee);
  renderHorizontalBars(elements.categoryChart, state.dashboard.openByCategory);
  renderHorizontalBars(elements.managerChart, state.dashboard.openByManager);
  renderVerticalBarChart(elements.throughputChart, state.dashboard.throughputWeekly, "Closed");
  renderHorizontalBars(elements.agingBucketsChart, state.dashboard.backlogAgingBuckets);
}

function renderVerticalBarChart(container, data, unitLabel) {
  const items = (data || []).slice(-10);
  if (!items.length) {
    container.innerHTML = `<p class="empty-state">No data available.</p>`;
    return;
  }
  const max = Math.max(...items.map((item) => item.value), 1);
  container.innerHTML = `
    <div class="v-chart">
      ${items
        .map(
          (item) => `
            <div class="v-bar-group">
              <span class="v-bar-value">${item.value}</span>
              <div class="v-bar-track"><div class="v-bar-fill" style="height:${Math.max(12, (item.value / max) * 100)}%"></div></div>
              <span class="v-bar-label">${escapeHtml(item.label)}</span>
            </div>
          `
        )
        .join("")}
    </div>
    <p class="chart-footnote">${unitLabel} per period</p>
  `;
}

function renderHorizontalBars(container, data) {
  const items = data && data.length ? data : [];
  if (!items.length) {
    container.innerHTML = `<p class="empty-state">No data available.</p>`;
    return;
  }
  const max = Math.max(...items.map((item) => item.value), 1);
  container.innerHTML = `
    <div class="h-chart">
      ${items
        .map(
          (item) => `
            <div class="h-row">
              <span class="h-label">${escapeHtml(item.label)}</span>
              <div class="h-track"><div class="h-fill" style="width:${Math.max(item.value ? 10 : 0, (item.value / max) * 100)}%"></div></div>
              <span class="h-value">${item.value}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
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
  elements.detailTitle.textContent = `Ticket ${ticket.jd_ticket_number}`;
  elements.detailDescription.textContent = ticket.description;
  elements.detailJdTicketNumber.textContent = ticket.jd_ticket_number;
  elements.detailCategory.textContent = ticket.category;
  elements.detailAssignee.textContent = ticket.assignee;
  elements.detailManager.textContent = ticket.manager;
  elements.detailDateOpening.textContent = ticket.date_opening;
  elements.detailDateClosed.textContent = ticket.date_closed || "Still open";
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
  { key: "date_opening", label: "Date Opened (YYYY-MM-DD)", required: true },
  { key: "date_closed", label: "Date Closed (YYYY-MM-DD)", required: false },
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
  if (!row.description) errors.push("Description is required");
  if (!row.jd_ticket_number) errors.push("JD ticket number is required");
  if (row.category && !meta.categories.includes(row.category)) errors.push(`Invalid category: "${row.category}"`);
  if (row.priority && !meta.priorities.includes(row.priority)) errors.push(`Invalid priority: "${row.priority}"`);
  const status = row.status || "Open";
  if (!meta.statuses.includes(status)) errors.push(`Invalid status: "${status}"`);
  if (row.assignee && !meta.users.includes(row.assignee)) errors.push(`Unknown assignee: "${row.assignee}"`);
  if (row.manager && !meta.managers.includes(row.manager)) errors.push(`Unknown manager: "${row.manager}"`);
  if (!row.assignee) errors.push("Assignee is required");
  if (!row.manager) errors.push("Manager is required");
  if (!row.category) errors.push("Category is required");
  if (!row.priority) errors.push("Priority is required");
  if (!row.date_opening) errors.push("Date opened is required");
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date_opening)) errors.push("Date opened must be YYYY-MM-DD");
  if (row.date_closed && !/^\d{4}-\d{2}-\d{2}$/.test(row.date_closed)) errors.push("Date closed must be YYYY-MM-DD");
  return errors;
}

function applyMapping(records, mapping) {
  return records.map((record) => {
    const mapped = {};
    for (const [userCol, systemField] of Object.entries(mapping)) {
      if (systemField) mapped[systemField] = record[userCol] || "";
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
    errors: validateImportRow(row, state.meta)
  }));

  const validCount = validatedRows.filter((r) => !r.errors.length).length;
  const errorCount = validatedRows.filter((r) => r.errors.length).length;

  elements.importPreviewSummary.innerHTML = `
    <span class="import-summary-chip valid">${validCount} valid rows</span>
    <span class="import-summary-chip error">${errorCount} rows with errors</span>
    <span class="import-summary-chip neutral">${records.length} total</span>
  `;

  const previewFields = ["jd_ticket_number", "description", "category", "priority", "status", "assignee", "manager", "date_opening"];
  elements.importPreviewHead.innerHTML = `
    <th>#</th><th>Status</th>
    ${previewFields.map((f) => `<th>${IMPORT_FIELDS.find((x) => x.key === f)?.label || f}</th>`).join("")}
    <th>Errors</th>
  `;
  elements.importPreviewBody.innerHTML = validatedRows.map((item) => {
    const isValid = !item.errors.length;
    const statusCell = isValid
      ? `<span class="badge success">Valid</span>`
      : `<span class="badge danger">Error</span>`;
    const errorsCell = item.errors.length
      ? `<span style="color:var(--danger);font-size:0.78rem">${escapeHtml(item.errors.join("; "))}</span>`
      : `<span class="muted">—</span>`;
    return `
      <tr class="${isValid ? 'import-row-valid' : 'import-row-error'}">
        <td>${item.index}</td>
        <td>${statusCell}</td>
        ${previewFields.map((f) => `<td>${escapeHtml(String(item.row[f] || ""))}</td>`).join("")}
        <td>${errorsCell}</td>
      </tr>
    `;
  }).join("");

  elements.importConfirm.textContent = `Import ${validCount} valid row${validCount !== 1 ? "s" : ""}`;
  elements.importConfirm.disabled = validCount === 0;
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
