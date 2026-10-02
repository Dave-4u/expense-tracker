/* Pure helpers shared by the app and the Node tests. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.KoboLib = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var CATEGORIES = ["Food", "Transport", "Housing", "Utilities", "Health", "Education", "Entertainment", "Shopping", "Other"];
  var COLORS = {
    Food: "#e07a2f", Transport: "#2f6fbf", Housing: "#0b5d43", Utilities: "#d9a400", Health: "#d94b2b",
    Education: "#6b4fa0", Entertainment: "#c2407a", Shopping: "#1f8a8a", Other: "#7d857f"
  };

  function monthKey(date) {
    var d = date ? new Date(date) : new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }
  function formatNaira(amount) {
    return "₦" + Math.round(Number(amount || 0)).toLocaleString("en-NG");
  }
  function inMonth(list, key) {
    return list.filter(function (e) { return String(e.date).slice(0, 7) === key; });
  }
  function sum(list) {
    return list.reduce(function (s, e) { return s + Number(e.amount || 0); }, 0);
  }
  function totalsByCategory(list) {
    var map = {};
    CATEGORIES.forEach(function (c) { map[c] = 0; });
    list.forEach(function (e) { map[e.category] = (map[e.category] || 0) + Number(e.amount || 0); });
    return map;
  }
  function ranked(list) {
    var t = totalsByCategory(list);
    return Object.keys(t).map(function (k) { return { name: k, total: t[k] }; })
      .filter(function (x) { return x.total > 0; })
      .sort(function (a, b) { return b.total - a.total; });
  }
  /* Days left in the month (including today) for a given month key, relative to `today`. */
  function daysLeft(key, today) {
    today = today || new Date();
    var parts = key.split("-").map(Number);
    var last = new Date(parts[0], parts[1], 0).getDate();
    if (monthKey(today) !== key) return null;
    return last - today.getDate() + 1;
  }
  function dailyAllowance(remaining, days) {
    if (!days || remaining <= 0) return 0;
    return Math.floor(remaining / days);
  }
  function toCSV(list) {
    var esc = function (v) {
      var s = String(v == null ? "" : v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    var rows = [["date", "category", "note", "amount_ngn"]].concat(
      list.map(function (e) { return [e.date, e.category, e.note || "", e.amount]; })
    );
    return rows.map(function (r) { return r.map(esc).join(","); }).join("\n");
  }
  return { CATEGORIES: CATEGORIES, COLORS: COLORS, monthKey: monthKey, formatNaira: formatNaira, inMonth: inMonth,
    sum: sum, totalsByCategory: totalsByCategory, ranked: ranked, daysLeft: daysLeft, dailyAllowance: dailyAllowance, toCSV: toCSV };
});
