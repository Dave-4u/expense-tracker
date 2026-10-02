(function () {
  "use strict";
  var L = window.KoboLib;
  var STORAGE_KEY = "expense-tracker-v1"; // kept from v1 so existing data survives the redesign
  var CATEGORIES = L.CATEGORIES;

  var state = { expenses: [], budgets: {}, month: L.monthKey(), filterCategory: "all", search: "", editingId: null, category: "Food", lastAddedId: null };
  var $ = function (id) { return document.getElementById(id); };
  var els = {
    monthInput: $("month-input"), prevMonth: $("prev-month"), nextMonth: $("next-month"),
    monthLabel: $("month-label"), headline: $("headline"), subline: $("subline"), ringFill: $("ring-fill"), ringPct: $("ring-pct"),
    totalSpent: $("total-spent"), budgetValue: $("budget-value"), remainingValue: $("remaining-value"), topCategory: $("top-category"),
    budgetForm: $("budget-form"), budgetInput: $("budget-input"), budgetNote: $("budget-note"),
    expenseForm: $("expense-form"), formTitle: $("form-title"), submitExpense: $("submit-expense"), cancelEdit: $("cancel-edit"),
    amount: $("amount"), category: $("category"), chips: $("cat-chips"), date: $("date"), note: $("note"),
    chart: $("category-chart"), chartEmpty: $("chart-empty"), filterCategory: $("filter-category"), search: $("search"),
    list: $("expense-tbody"), tableEmpty: $("table-empty"), expenseCount: $("expense-count"),
    exportCsv: $("export-csv"), resetDemo: $("reset-demo"), toast: $("toast"), toastMsg: $("toast-msg"), toastAction: $("toast-action")
  };

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return seedDemoData();
      var parsed = JSON.parse(raw);
      state.expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
      state.budgets = parsed.budgets && typeof parsed.budgets === "object" ? parsed.budgets : {};
    } catch (err) { seedDemoData(); }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ expenses: state.expenses, budgets: state.budgets })); } catch (e) {}
  }
  function seedDemoData() {
    var key = L.monthKey();
    var today = new Date().getDate();
    var samples = [
      ["Food", 4500, 1, "Market run, Mile 3"], ["Transport", 2500, 2, "Keke to campus"], ["Utilities", 12000, 3, "NEPA token"],
      ["Entertainment", 6000, 4, "Cinema with the guys"], ["Food", 3200, 5, "Jollof + chicken"], ["Shopping", 15000, 6, "New sneakers"],
      ["Health", 8000, 7, "Pharmacy"], ["Education", 20000, 8, "Online course"]
    ];
    state.expenses = samples.map(function (s, i) {
      var day = Math.max(1, Math.min(today, s[2] * Math.max(1, Math.floor(today / 9))));
      return { id: "seed-" + i + "-" + Date.now(), category: s[0], amount: s[1], date: key + "-" + String(day).padStart(2, "0"), note: s[3] };
    });
    state.budgets[key] = 150000;
    save();
  }

  function esc(str) {
    return String(str == null ? "" : str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function monthName(key) {
    var p = key.split("-");
    return new Date(+p[0], +p[1] - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }

  /* Toast with optional undo */
  var toastTimer, toastUndo = null;
  function toast(msg, undo) {
    els.toastMsg.textContent = msg;
    toastUndo = undo || null;
    els.toastAction.hidden = !undo;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove("show"); toastUndo = null; }, undo ? 6000 : 2400);
  }
  els.toastAction.addEventListener("click", function () {
    if (toastUndo) toastUndo();
    els.toast.classList.remove("show");
  });

  /* Category chips (the hidden <select> keeps the form value + tests simple) */
  function renderChips() {
    els.category.innerHTML = CATEGORIES.map(function (c) { return '<option value="' + c + '">' + c + "</option>"; }).join("");
    els.filterCategory.innerHTML = '<option value="all">All categories</option>' +
      CATEGORIES.map(function (c) { return '<option value="' + c + '">' + c + "</option>"; }).join("");
    els.chips.innerHTML = CATEGORIES.map(function (c) {
      return '<button type="button" class="cat-chip" role="radio" data-cat="' + c + '" style="--dot:' + L.COLORS[c] + '"><i aria-hidden="true"></i>' + c + "</button>";
    }).join("");
    setCategory(state.category);
  }
  function setCategory(c) {
    state.category = c;
    els.category.value = c;
    Array.prototype.forEach.call(els.chips.children, function (b) {
      var on = b.getAttribute("data-cat") === c;
      b.setAttribute("aria-checked", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
  }
  els.chips.addEventListener("click", function (e) {
    var b = e.target.closest(".cat-chip");
    if (b) setCategory(b.getAttribute("data-cat"));
  });
  els.chips.addEventListener("keydown", function (e) {
    var i = CATEGORIES.indexOf(state.category);
    if (e.key === "ArrowRight" || e.key === "ArrowDown") i = (i + 1) % CATEGORIES.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") i = (i - 1 + CATEGORIES.length) % CATEGORIES.length;
    else return;
    e.preventDefault();
    setCategory(CATEGORIES[i]);
    els.chips.children[i].focus();
  });

  function shiftMonth(delta) {
    var p = state.month.split("-");
    state.month = L.monthKey(new Date(+p[0], +p[1] - 1 + delta, 1));
    els.monthInput.value = state.month;
    render();
  }

  function clearErrors() {
    document.querySelectorAll(".field-error").forEach(function (el) { el.textContent = ""; });
    els.amount.parentNode.classList.remove("invalid");
    els.date.classList.remove("invalid");
  }
  function validate() {
    clearErrors();
    var ok = true;
    if (!(Number(els.amount.value) > 0)) {
      document.querySelector('.field-error[data-for="amount"]').textContent = "How much was it? Enter an amount above zero.";
      els.amount.parentNode.classList.add("invalid"); ok = false;
    }
    if (CATEGORIES.indexOf(els.category.value) === -1) {
      document.querySelector('.field-error[data-for="category"]').textContent = "Pick a category."; ok = false;
    }
    if (!els.date.value) {
      document.querySelector('.field-error[data-for="date"]').textContent = "Pick a date."; els.date.classList.add("invalid"); ok = false;
    }
    if (!ok) (els.amount.parentNode.classList.contains("invalid") ? els.amount : els.date).focus();
    return ok;
  }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function resetForm() {
    state.editingId = null;
    els.expenseForm.reset();
    els.date.value = todayISO();
    setCategory(state.category);
    els.formTitle.textContent = "Add expense";
    els.submitExpense.textContent = "Add expense";
    els.cancelEdit.hidden = true;
    clearErrors();
  }
  function startEdit(id) {
    var item = state.expenses.find(function (e) { return e.id === id; });
    if (!item) return;
    state.editingId = id;
    els.amount.value = item.amount;
    setCategory(item.category);
    els.date.value = item.date;
    els.note.value = item.note || "";
    els.formTitle.textContent = "Edit expense";
    els.submitExpense.textContent = "Save changes";
    els.cancelEdit.hidden = false;
    els.expenseForm.scrollIntoView({ behavior: "smooth", block: "center" });
    els.amount.focus({ preventScroll: true });
  }
  function deleteExpense(id) {
    var idx = state.expenses.findIndex(function (e) { return e.id === id; });
    if (idx < 0) return;
    var removed = state.expenses.splice(idx, 1)[0];
    if (state.editingId === id) resetForm();
    save(); render();
    toast("Deleted " + L.formatNaira(removed.amount) + " · " + removed.category, function () {
      state.expenses.splice(idx, 0, removed); save(); render(); toast("Restored.");
    });
  }

  function renderSummary(list) {
    var total = L.sum(list);
    var budget = Number(state.budgets[state.month] || 0);
    var remaining = budget - total;
    var top = L.ranked(list)[0];
    var isCurrent = state.month === L.monthKey();
    els.monthLabel.textContent = isCurrent ? "This month · " + monthName(state.month) : monthName(state.month);

    els.totalSpent.textContent = L.formatNaira(total);
    els.budgetValue.textContent = budget ? L.formatNaira(budget) : "Not set";
    els.remainingValue.textContent = budget ? L.formatNaira(remaining) : "—";
    els.remainingValue.classList.remove("ok", "over");
    if (budget) els.remainingValue.classList.add(remaining >= 0 ? "ok" : "over");
    els.topCategory.textContent = top ? top.name : "—";

    // Headline in plain words
    if (!list.length) {
      els.headline.textContent = isCurrent ? "A clean slate. Nothing spent yet." : "No spending recorded for " + monthName(state.month) + ".";
      els.subline.textContent = budget ? "Your budget is " + L.formatNaira(budget) + ". Add an expense and I'll keep score." : "Add an expense below, and set a budget if you want a target.";
    } else if (!budget) {
      els.headline.innerHTML = "You've spent <em>" + L.formatNaira(total) + "</em> so far.";
      els.subline.textContent = "Set a monthly budget and I'll tell you how much you can spend per day.";
    } else if (remaining >= 0) {
      els.headline.innerHTML = "<em>" + L.formatNaira(remaining) + "</em> left of your " + L.formatNaira(budget) + " budget.";
      var days = L.daysLeft(state.month);
      els.subline.textContent = days
        ? "That's about " + L.formatNaira(L.dailyAllowance(remaining, days)) + " a day for the next " + days + " day" + (days === 1 ? "" : "s") + ". " + (top ? top.name + " is your biggest bucket." : "")
        : "You spent " + L.formatNaira(total) + " this month." + (top ? " Most of it went to " + top.name + "." : "");
    } else {
      els.headline.innerHTML = "You're <em>" + L.formatNaira(-remaining) + "</em> over budget.";
      els.subline.textContent = "It happens. " + (top ? top.name + " took the biggest share — maybe start there." : "");
    }

    var pct = budget ? Math.round((total / budget) * 100) : 0;
    els.ringPct.textContent = budget ? pct + "%" : "—";
    els.ringFill.style.strokeDashoffset = String(314.16 * (1 - Math.min(1, pct / 100)));
    els.ringFill.classList.toggle("over", pct > 100);

    if (document.activeElement !== els.budgetInput) els.budgetInput.value = budget || "";
    els.budgetNote.textContent = budget ? L.formatNaira(total) + " of " + L.formatNaira(budget) + " used (" + pct + "%)." : "No budget set for this month. Set one to unlock the daily allowance.";
  }

  function renderChart(list) {
    var entries = L.ranked(list);
    els.chartEmpty.hidden = entries.length > 0;
    els.chart.hidden = !entries.length;
    if (!entries.length) { els.chart.innerHTML = ""; return; }
    var max = entries[0].total || 1;
    els.chart.innerHTML = entries.map(function (e) {
      var w = Math.max(4, Math.round((e.total / max) * 100));
      var active = state.filterCategory === e.name ? " active" : "";
      return '<button type="button" role="listitem" class="chart-row' + active + '" data-cat="' + e.name + '" aria-label="' + e.name + ": " + L.formatNaira(e.total) + '. Filter list.">' +
        '<span class="chart-label" style="--dot:' + L.COLORS[e.name] + '"><i></i>' + esc(e.name) + "</span>" +
        '<span class="chart-track"><span class="chart-fill" data-w="' + w + '" style="display:block;background:' + L.COLORS[e.name] + '"></span></span>' +
        '<span class="chart-amount">' + L.formatNaira(e.total) + "</span></button>";
    }).join("");
    requestAnimationFrame(function () {
      els.chart.querySelectorAll(".chart-fill").forEach(function (f) { f.style.width = f.getAttribute("data-w") + "%"; });
    });
  }
  els.chart.addEventListener("click", function (e) {
    var row = e.target.closest(".chart-row");
    if (!row) return;
    var c = row.getAttribute("data-cat");
    state.filterCategory = state.filterCategory === c ? "all" : c;
    els.filterCategory.value = state.filterCategory;
    render();
  });

  function filtered(list) {
    var q = state.search.trim().toLowerCase();
    return list.filter(function (e) {
      return (state.filterCategory === "all" || e.category === state.filterCategory) &&
        (!q || String(e.note || "").toLowerCase().indexOf(q) !== -1 || e.category.toLowerCase().indexOf(q) !== -1);
    }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  }

  function renderList(list) {
    var rows = filtered(list);
    els.expenseCount.textContent = rows.length + " receipt" + (rows.length === 1 ? "" : "s") +
      (state.filterCategory !== "all" ? " in " + state.filterCategory : "") + " · " + L.formatNaira(L.sum(rows));
    els.tableEmpty.hidden = rows.length > 0 || list.length === 0;
    els.list.innerHTML = rows.map(function (e, i) {
      var d = new Date(e.date + "T00:00:00");
      var day = isNaN(d) ? "?" : d.getDate();
      var wk = isNaN(d) ? "" : d.toLocaleDateString("en-GB", { weekday: "short" });
      return '<li class="receipt' + (e.id === state.lastAddedId ? " flash" : "") + '" style="animation-delay:' + Math.min(i, 10) * 25 + 'ms">' +
        '<div class="r-date"><b>' + day + "</b>" + wk + "</div>" +
        '<div class="r-main"><div class="r-note">' + esc(e.note || e.category) + "</div>" +
        '<span class="r-cat" style="--dot:' + (L.COLORS[e.category] || "#999") + '"><i></i>' + esc(e.category) + "</span></div>" +
        '<div class="r-amount">' + L.formatNaira(e.amount) + "</div>" +
        '<div class="row-actions"><button type="button" data-edit="' + esc(e.id) + '" aria-label="Edit ' + esc(e.note || e.category) + '">Edit</button>' +
        '<button type="button" data-delete="' + esc(e.id) + '" aria-label="Delete ' + esc(e.note || e.category) + '">Delete</button></div></li>';
    }).join("");
    state.lastAddedId = null;
  }

  function render() {
    var list = L.inMonth(state.expenses, state.month);
    renderSummary(list);
    renderChart(list);
    renderList(list);
  }

  els.budgetForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = Number(els.budgetInput.value);
    if (!(v >= 0)) return;
    if (v === 0) delete state.budgets[state.month]; else state.budgets[state.month] = v;
    save(); render();
    toast(v ? "Budget set to " + L.formatNaira(v) + " for " + monthName(state.month) + "." : "Budget cleared.");
  });

  els.expenseForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;
    var payload = { amount: Number(els.amount.value), category: els.category.value, date: els.date.value, note: els.note.value.trim() };
    var editing = !!state.editingId;
    if (editing) {
      state.expenses = state.expenses.map(function (it) { return it.id === state.editingId ? Object.assign({ id: it.id }, payload) : it; });
      state.lastAddedId = state.editingId;
    } else {
      var id = "exp-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
      state.expenses.push(Object.assign({ id: id }, payload));
      state.lastAddedId = id;
    }
    state.month = payload.date.slice(0, 7);
    els.monthInput.value = state.month;
    save(); resetForm(); render();
    els.submitExpense.classList.add("saved");
    els.submitExpense.textContent = editing ? "Saved ✓" : "Added ✓";
    setTimeout(function () { els.submitExpense.classList.remove("saved"); els.submitExpense.textContent = state.editingId ? "Save changes" : "Add expense"; }, 1100);
    els.amount.focus();
  });

  els.cancelEdit.addEventListener("click", resetForm);
  els.list.addEventListener("click", function (e) {
    var ed = e.target.closest("[data-edit]"), del = e.target.closest("[data-delete]");
    if (ed) startEdit(ed.getAttribute("data-edit"));
    else if (del) deleteExpense(del.getAttribute("data-delete"));
  });
  els.filterCategory.addEventListener("change", function () { state.filterCategory = els.filterCategory.value; render(); });
  els.search.addEventListener("input", function () { state.search = els.search.value; renderList(L.inMonth(state.expenses, state.month)); });
  els.monthInput.addEventListener("change", function () { if (els.monthInput.value) { state.month = els.monthInput.value; render(); } });
  els.prevMonth.addEventListener("click", function () { shiftMonth(-1); });
  els.nextMonth.addEventListener("click", function () { shiftMonth(1); });

  els.exportCsv.addEventListener("click", function () {
    var rows = filtered(L.inMonth(state.expenses, state.month));
    if (!rows.length) return toast("Nothing to export for this view.");
    var blob = new Blob([L.toCSV(rows)], { type: "text/csv" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kobo-" + state.month + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast("Exported " + rows.length + " receipts.");
  });
  els.resetDemo.addEventListener("click", function () {
    if (!confirm("Clear all expenses and budgets saved in this browser?")) return;
    var backup = { expenses: state.expenses.slice(), budgets: Object.assign({}, state.budgets) };
    state.expenses = []; state.budgets = {}; save(); render();
    toast("All cleared. Fresh start.", function () { state.expenses = backup.expenses; state.budgets = backup.budgets; save(); render(); });
  });

  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || "").toLowerCase();
    var typing = tag === "input" || tag === "textarea" || tag === "select";
    if (e.key === "Escape") { if (state.editingId) resetForm(); if (typing) e.target.blur(); return; }
    if (typing) return;
    if (e.key === "n" || e.key === "N") { e.preventDefault(); els.amount.focus(); els.amount.scrollIntoView({ behavior: "smooth", block: "center" }); }
    else if (e.key === "/") { e.preventDefault(); els.search.focus(); }
    else if (e.key === "ArrowLeft") shiftMonth(-1);
    else if (e.key === "ArrowRight") shiftMonth(1);
  });

  renderChips();
  load();
  els.monthInput.value = state.month;
  resetForm();
  render();
})();
