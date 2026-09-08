(function () {
  "use strict";

  var STORAGE_KEY = "expense-tracker-v1";
  var CATEGORIES = [
    "Food",
    "Transport",
    "Housing",
    "Utilities",
    "Health",
    "Education",
    "Entertainment",
    "Shopping",
    "Other"
  ];

  var CATEGORY_COLORS = {
    Food: "#38bdf8",
    Transport: "#818cf8",
    Housing: "#34d399",
    Utilities: "#fbbf24",
    Health: "#fb7185",
    Education: "#22d3ee",
    Entertainment: "#a78bfa",
    Shopping: "#f472b6",
    Other: "#94a3b8"
  };

  var state = {
    expenses: [],
    budgets: {},
    month: currentMonthKey(),
    filterCategory: "all",
    editingId: null
  };

  var els = {
    monthInput: document.getElementById("month-input"),
    prevMonth: document.getElementById("prev-month"),
    nextMonth: document.getElementById("next-month"),
    totalSpent: document.getElementById("total-spent"),
    budgetValue: document.getElementById("budget-value"),
    remainingValue: document.getElementById("remaining-value"),
    topCategory: document.getElementById("top-category"),
    budgetForm: document.getElementById("budget-form"),
    budgetInput: document.getElementById("budget-input"),
    budgetBarFill: document.getElementById("budget-bar-fill"),
    budgetNote: document.getElementById("budget-note"),
    expenseForm: document.getElementById("expense-form"),
    formTitle: document.getElementById("form-title"),
    submitExpense: document.getElementById("submit-expense"),
    cancelEdit: document.getElementById("cancel-edit"),
    amount: document.getElementById("amount"),
    category: document.getElementById("category"),
    date: document.getElementById("date"),
    note: document.getElementById("note"),
    chart: document.getElementById("category-chart"),
    chartEmpty: document.getElementById("chart-empty"),
    filterCategory: document.getElementById("filter-category"),
    tbody: document.getElementById("expense-tbody"),
    tableEmpty: document.getElementById("table-empty"),
    expenseCount: document.getElementById("expense-count")
  };

  function currentMonthKey(date) {
    var d = date ? new Date(date) : new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    return y + "-" + m;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        seedDemoData();
        return;
      }
      var parsed = JSON.parse(raw);
      state.expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
      state.budgets = parsed.budgets && typeof parsed.budgets === "object" ? parsed.budgets : {};
      if (!state.expenses.length) seedDemoData();
    } catch (err) {
      seedDemoData();
    }
  }

  function save() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        expenses: state.expenses,
        budgets: state.budgets
      })
    );
  }

  function seedDemoData() {
    var now = new Date();
    var y = now.getFullYear();
    var m = String(now.getMonth() + 1).padStart(2, "0");
    var samples = [
      { category: "Food", amount: 4500, day: "03", note: "Groceries" },
      { category: "Transport", amount: 2500, day: "05", note: "Fuel" },
      { category: "Utilities", amount: 12000, day: "07", note: "Electricity" },
      { category: "Entertainment", amount: 6000, day: "10", note: "Cinema" },
      { category: "Food", amount: 3200, day: "12", note: "Lunch out" },
      { category: "Shopping", amount: 15000, day: "15", note: "Household items" },
      { category: "Health", amount: 8000, day: "18", note: "Pharmacy" },
      { category: "Education", amount: 20000, day: "20", note: "Online course" }
    ];
    state.expenses = samples.map(function (item, index) {
      return {
        id: "seed-" + index + "-" + Date.now(),
        amount: item.amount,
        category: item.category,
        date: y + "-" + m + "-" + item.day,
        note: item.note
      };
    });
    state.budgets[y + "-" + m] = 150000;
    save();
  }

  function formatNaira(amount) {
    return "₦" + Number(amount || 0).toLocaleString("en-NG");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function monthExpenses() {
    return state.expenses.filter(function (e) {
      return String(e.date).slice(0, 7) === state.month;
    });
  }

  function totalsByCategory(list) {
    var map = {};
    CATEGORIES.forEach(function (c) { map[c] = 0; });
    list.forEach(function (e) {
      map[e.category] = (map[e.category] || 0) + Number(e.amount);
    });
    return map;
  }

  function populateCategorySelects() {
    var options = CATEGORIES.map(function (c) {
      return '<option value="' + c + '">' + c + "</option>";
    }).join("");
    els.category.innerHTML = options;
    els.filterCategory.innerHTML =
      '<option value="all">All categories</option>' + options;
  }

  function shiftMonth(delta) {
    var parts = state.month.split("-");
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1 + delta, 1);
    state.month = currentMonthKey(d);
    els.monthInput.value = state.month;
    render();
  }

  function clearFormErrors() {
    Array.prototype.forEach.call(document.querySelectorAll(".field-error"), function (el) {
      el.textContent = "";
    });
    els.amount.classList.remove("invalid");
    els.category.classList.remove("invalid");
    els.date.classList.remove("invalid");
  }

  function validateExpense() {
    clearFormErrors();
    var amount = Number(els.amount.value);
    var category = els.category.value;
    var date = els.date.value;
    var ok = true;

    if (!(amount > 0)) {
      document.querySelector('.field-error[data-for="amount"]').textContent = "Enter an amount greater than zero.";
      els.amount.classList.add("invalid");
      ok = false;
    }
    if (CATEGORIES.indexOf(category) === -1) {
      document.querySelector('.field-error[data-for="category"]').textContent = "Choose a category.";
      els.category.classList.add("invalid");
      ok = false;
    }
    if (!date) {
      document.querySelector('.field-error[data-for="date"]').textContent = "Pick a date.";
      els.date.classList.add("invalid");
      ok = false;
    }
    return ok;
  }

  function resetExpenseForm() {
    state.editingId = null;
    els.expenseForm.reset();
    els.date.value = new Date().toISOString().slice(0, 10);
    els.formTitle.textContent = "Add expense";
    els.submitExpense.textContent = "Add expense";
    els.cancelEdit.hidden = true;
    clearFormErrors();
  }

  function startEdit(id) {
    var item = state.expenses.find(function (e) { return e.id === id; });
    if (!item) return;
    state.editingId = id;
    els.amount.value = item.amount;
    els.category.value = item.category;
    els.date.value = item.date;
    els.note.value = item.note || "";
    els.formTitle.textContent = "Edit expense";
    els.submitExpense.textContent = "Save changes";
    els.cancelEdit.hidden = false;
    window.scrollTo({ top: els.expenseForm.offsetTop - 80, behavior: "smooth" });
  }

  function deleteExpense(id) {
    state.expenses = state.expenses.filter(function (e) { return e.id !== id; });
    if (state.editingId === id) resetExpenseForm();
    save();
    render();
  }

  function renderSummary(list) {
    var total = list.reduce(function (sum, e) { return sum + Number(e.amount); }, 0);
    var budget = Number(state.budgets[state.month] || 0);
    var remaining = budget - total;
    var byCat = totalsByCategory(list);
    var top = Object.keys(byCat)
      .map(function (k) { return { name: k, total: byCat[k] }; })
      .sort(function (a, b) { return b.total - a.total; })[0];

    els.totalSpent.textContent = formatNaira(total);
    els.budgetValue.textContent = budget ? formatNaira(budget) : "Not set";
    els.remainingValue.textContent = budget ? formatNaira(remaining) : "—";
    els.remainingValue.classList.remove("ok", "over");
    if (budget) {
      els.remainingValue.classList.add(remaining >= 0 ? "ok" : "over");
    }
    els.topCategory.textContent = top && top.total > 0 ? top.name : "—";

    els.budgetInput.value = budget || "";
    if (!budget) {
      els.budgetBarFill.style.width = "0%";
      els.budgetBarFill.classList.remove("over");
      els.budgetNote.textContent = "No budget set for this month.";
    } else {
      var pct = Math.min(100, Math.round((total / budget) * 100));
      els.budgetBarFill.style.width = pct + "%";
      els.budgetBarFill.classList.toggle("over", total > budget);
      els.budgetNote.textContent =
        formatNaira(total) + " of " + formatNaira(budget) + " used (" + pct + "%).";
    }
  }

  function renderChart(list) {
    var byCat = totalsByCategory(list);
    var entries = Object.keys(byCat)
      .map(function (name) { return { name: name, total: byCat[name] }; })
      .filter(function (e) { return e.total > 0; })
      .sort(function (a, b) { return b.total - a.total; });

    els.chartEmpty.hidden = entries.length > 0;
    if (!entries.length) {
      els.chart.innerHTML = "";
      return;
    }

    var max = entries[0].total || 1;
    els.chart.innerHTML = entries
      .map(function (entry) {
        var width = Math.max(6, Math.round((entry.total / max) * 100));
        var color = CATEGORY_COLORS[entry.name] || "#94a3b8";
        return (
          '<div class="chart-row">' +
            '<div class="chart-label">' + escapeHtml(entry.name) + "</div>" +
            '<div class="chart-track"><div class="chart-fill" style="width:' + width + "%;background:" + color + '"></div></div>' +
            '<div class="chart-amount">' + formatNaira(entry.total) + "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function renderTable(list) {
    var filtered =
      state.filterCategory === "all"
        ? list
        : list.filter(function (e) { return e.category === state.filterCategory; });

    filtered = filtered.slice().sort(function (a, b) {
      return String(b.date).localeCompare(String(a.date));
    });

    els.expenseCount.textContent = filtered.length + " entr" + (filtered.length === 1 ? "y" : "ies");
    els.tableEmpty.hidden = filtered.length > 0;

    els.tbody.innerHTML = filtered
      .map(function (e) {
        return (
          "<tr>" +
            "<td>" + escapeHtml(e.date) + "</td>" +
            '<td><span class="category-pill">' + escapeHtml(e.category) + "</span></td>" +
            "<td>" + escapeHtml(e.note || "—") + "</td>" +
            '<td class="num">' + formatNaira(e.amount) + "</td>" +
            '<td class="actions"><div class="row-actions">' +
              '<button type="button" data-edit="' + e.id + '">Edit</button>' +
              '<button type="button" data-delete="' + e.id + '">Delete</button>' +
            "</div></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function render() {
    var list = monthExpenses();
    renderSummary(list);
    renderChart(list);
    renderTable(list);
  }

  els.budgetForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var value = Number(els.budgetInput.value);
    if (!(value >= 0)) return;
    if (value === 0) {
      delete state.budgets[state.month];
    } else {
      state.budgets[state.month] = value;
    }
    save();
    render();
  });

  els.expenseForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateExpense()) return;

    var payload = {
      amount: Number(els.amount.value),
      category: els.category.value,
      date: els.date.value,
      note: els.note.value.trim()
    };

    if (state.editingId) {
      state.expenses = state.expenses.map(function (item) {
        if (item.id !== state.editingId) return item;
        return {
          id: item.id,
          amount: payload.amount,
          category: payload.category,
          date: payload.date,
          note: payload.note
        };
      });
    } else {
      state.expenses.push({
        id: "exp-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
        amount: payload.amount,
        category: payload.category,
        date: payload.date,
        note: payload.note
      });
    }

    state.month = String(payload.date).slice(0, 7);
    els.monthInput.value = state.month;
    save();
    resetExpenseForm();
    render();
  });

  els.cancelEdit.addEventListener("click", resetExpenseForm);

  els.tbody.addEventListener("click", function (e) {
    var editBtn = e.target.closest("[data-edit]");
    var deleteBtn = e.target.closest("[data-delete]");
    if (editBtn) {
      startEdit(editBtn.getAttribute("data-edit"));
      return;
    }
    if (deleteBtn) {
      deleteExpense(deleteBtn.getAttribute("data-delete"));
    }
  });

  els.filterCategory.addEventListener("change", function () {
    state.filterCategory = els.filterCategory.value;
    render();
  });

  els.monthInput.addEventListener("change", function () {
    if (!els.monthInput.value) return;
    state.month = els.monthInput.value;
    render();
  });

  els.prevMonth.addEventListener("click", function () { shiftMonth(-1); });
  els.nextMonth.addEventListener("click", function () { shiftMonth(1); });

  populateCategorySelects();
  load();
  els.monthInput.value = state.month;
  resetExpenseForm();
  render();
})();
