import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, LogOut, Loader, Globe, RefreshCw, BarChart3, ArrowLeft, Search, X, Tag, Maximize2, Minimize2 } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { translations, months } from "./translations.js";
import AdminDashboard from "./AdminDashboard.jsx";

const API_BASE = "";

const FALLBACK_EXPENSE_TYPES = [
  "Food",
  "Travel",
  "Shopping",
  "Bills",
  "Health",
  "Rent",
  "Entertainment",
  "Education",
  "Other",
];

const FALLBACK_EXPENSE_KEYWORDS = {
  Food: ["food", "tea", "coffee", "lunch", "dinner", "breakfast", "biriyani", "biryani", "pizza", "hotel", "restaurant", "cafe", "snacks"],
  Travel: ["uber", "ola", "bus", "train", "metro", "taxi", "auto", "flight", "petrol", "diesel", "fuel", "parking"],
  Shopping: ["amazon", "flipkart", "dress", "shirt", "shoe", "watch", "grocery", "groceries", "grocery store", "supermarket", "mall", "store"],
  Bills: ["electricity", "water", "internet", "wifi", "mobile", "recharge", "bill", "subscription"],
  Health: ["medicine", "doctor", "hospital", "clinic", "pharmacy", "medical", "test"],
  Rent: ["rent", "room", "pg", "hostel", "house", "flat"],
  Entertainment: ["movie", "cinema", "game", "concert", "party", "outing"],
  Education: ["course", "book", "exam", "fees", "training", "learning"],
  Other: [],
};

const FALLBACK_EXPENSE_KEYWORD_OPTIONS = FALLBACK_EXPENSE_TYPES.flatMap((type) =>
  FALLBACK_EXPENSE_KEYWORDS[type].map((keyword) => ({ keyword, type }))
);

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [authMode, setAuthMode] = useState("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTotal, setShowTotal] = useState(false);
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "en"
  );
  const [dataFetched, setDataFetched] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [currentPage, setCurrentPage] = useState("home");
  const [isNoteFocused, setIsNoteFocused] = useState(false);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [categoryKeywordOptions, setCategoryKeywordOptions] = useState(
    FALLBACK_EXPENSE_KEYWORD_OPTIONS
  );

  const t = translations[language];

  const isAdminPage = window.location.pathname === "/admin";

  useEffect(() => {
    if (token && !isAdminPage) {
      fetchExpenses();
    }
  }, [token]);

  // Auto-refresh expenses every 5 minutes to keep data fresh
  useEffect(() => {
    if (!token || !dataFetched || isAdminPage) return;

    const interval = setInterval(() => {
      console.log("Auto-refreshing data from API...");
      fetchExpenses();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [token, dataFetched]);

  useEffect(() => {
    if (!token || isAdminPage) return;

    async function fetchCategories() {
      try {
        const response = await fetch(`${API_BASE}/api/categories`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Unable to fetch categories");
        }

        const options = data.flatMap((category) =>
          (category.keywords || []).map((keyword) => ({
            keyword,
            type: category.name,
          }))
        );

        if (options.length > 0) {
          setCategoryKeywordOptions(options);
        }
      } catch (err) {
        console.warn("Using fallback category keywords", err);
      }
    }

    fetchCategories();
  }, [token, isAdminPage]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthName = `${months[language][currentMonth]} ${currentYear}`;

  const thisMonthExpenses = useMemo(() => expenses.filter((item) => {
    const d = new Date(item.expense_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }), [expenses, currentMonth, currentYear]);

  const thisMonthTotal = useMemo(() => thisMonthExpenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  ), [thisMonthExpenses]);

  const thisMonthCount = thisMonthExpenses.length;

  const total = useMemo(() => expenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  ), [expenses]);

  const currentNoteLine = note.split("\n").at(-1);
  const currentWord = currentNoteLine.match(/[a-zA-Z-]+$/)?.[0].toLowerCase() || "";
  const suggestedKeywords = useMemo(() => {
    if (currentWord.length < 2) return [];

    return categoryKeywordOptions.filter(({ keyword, type }) => {
      const normalizedKeyword = keyword.toLowerCase();
      const normalizedType = type.toLowerCase();

      return (
        normalizedKeyword.startsWith(currentWord) ||
        normalizedKeyword.includes(currentWord) ||
        normalizedType.startsWith(currentWord)
      );
    }).slice(0, 6);
  }, [categoryKeywordOptions, currentWord]);
  const showKeywordSuggestions = isNoteFocused && suggestedKeywords.length > 0;

  function insertKeywordSuggestion(keyword) {
    const lines = note.split("\n");
    const lastLine = lines.at(-1);
    const updatedLine = currentWord
      ? lastLine.replace(/[a-zA-Z-]+$/, keyword)
      : `${lastLine}${lastLine.trim() ? " " : ""}${keyword}`;

    lines[lines.length - 1] = updatedLine;
    setNote(`${lines.join("\n")} `);
    setIsNoteFocused(true);
  }

  function handleNoteKeyDown(e) {
    if (!showKeywordSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((index) => (index + 1) % suggestedKeywords.length);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex(
        (index) => (index - 1 + suggestedKeywords.length) % suggestedKeywords.length
      );
    }

    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      insertKeywordSuggestion(suggestedKeywords[activeSuggestionIndex].keyword);
    }

    if (e.key === "Escape") {
      setIsNoteFocused(false);
    }
  }

  function getCategoryTone(category = "") {
    const tones = {
      Food: "tone-food",
      Travel: "tone-travel",
      Shopping: "tone-shopping",
      Bills: "tone-bills",
      Health: "tone-health",
      Rent: "tone-rent",
      Entertainment: "tone-entertainment",
      Education: "tone-education",
    };

    return tones[category] || "tone-other";
  }

  const filteredExpenses = useMemo(() => expenses.filter((item) => {
    const search = expenseSearch.trim().toLowerCase();

    if (!search) return true;

    return (
      (item.description || "").toLowerCase().includes(search) ||
      (item.category || "").toLowerCase().includes(search) ||
      String(item.amount || "").includes(search) ||
      String(item.expense_date || "").toLowerCase().includes(search)
    );
  }), [expenses, expenseSearch]);

  if (isAdminPage) {
    return <AdminDashboard />;
  }

  async function request(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Something went wrong");
    }

    return data;
  }

  async function handleAuth(e) {
    e.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      setError("Please enter username and password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const path = authMode === "login" ? "/api/login" : "/api/register";

      const body =
        authMode === "login"
          ? {
              identifier: identifier.trim(),
              password,
            }
          : {
              username: identifier.trim(),
              password,
            };

      const data = await request(path, {
        method: "POST",
        body: JSON.stringify(body),
      });

      localStorage.setItem("token", data.access_token);
      setToken(data.access_token);
      setIdentifier("");
      setPassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchExpenses() {
    setError("");

    try {
      const data = await request("/api/expenses");
      setExpenses(Array.isArray(data) ? data : []);
      setDataFetched(true);
      setLastFetchTime(new Date());
      console.log("Data fetched successfully from API at", new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message);
      setDataFetched(false);

      if (err.message.toLowerCase().includes("token")) {
        logout();
      }
    }
  }

  async function addExpense(e) {
    e.preventDefault();

    const notes = note
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (notes.length === 0) return;

    setError("");
    setLoading(true);

    try {
      const newExpenses = await Promise.all(
        notes.map((expenseNote) =>
          request("/api/expenses", {
            method: "POST",
            body: JSON.stringify({
              note: expenseNote,
              expense_date: expenseDate,
            }),
          })
        )
      );

      setExpenses((prev) => [...newExpenses.reverse(), ...prev]);
      setNote("");
      setExpenseDate(new Date().toISOString().split("T")[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

async function deleteExpense(id) {
  setError("");
  setDeletingId(id);

  try {
    await request(`/api/expenses/${id}`, {
      method: "DELETE",
    });

    setExpenses((prev) => prev.filter((item) => item.id !== id));
  } catch (err) {
    setError(err.message);
  } finally {
    setDeletingId(null);
  }
}

  function logout() {
    localStorage.removeItem("token");
    setToken("");
    setExpenses([]);
  }

  function toggleLanguage() {
    const newLanguage = language === "en" ? "ml" : "en";
    setLanguage(newLanguage);
    localStorage.setItem("language", newLanguage);
  }

  async function handleReload() {
    setLoading(true);
    try {
      // First, fetch fresh data from API
      await fetchExpenses();
      console.log("Fresh data loaded from API");

      // Wait a moment for user to see the update
      await new Promise(resolve => setTimeout(resolve, 500));

      // Then clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('Cache cleared');
      }
      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }
      // Force reload without cache
      window.location.href = window.location.origin;
    } catch (error) {
      console.error('Error in reload:', error);
      window.location.reload();
    } finally {
      setLoading(false);
    }
  }

  function formatDateLabel(dateStr) {
    const selected = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);

    yesterday.setDate(yesterday.getDate() - 1);

    const resetTime = (d) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const selectedReset = resetTime(selected);
    const todayReset = resetTime(today);
    const yesterdayReset = resetTime(yesterday);

    if (selectedReset.getTime() === todayReset.getTime()) return "Today";
    if (selectedReset.getTime() === yesterdayReset.getTime())
      return "Yesterday";

    const daysAgo = Math.floor(
      (todayReset - selectedReset) / (1000 * 60 * 60 * 24)
    );

    if (daysAgo > 0 && daysAgo < 7) return `${daysAgo} days ago`;

    return selected.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
    });
  }

  // Prepare data for graph
  function getGraphData() {
    const dailyData = {};
    const monthlyData = {};
    const categoryData = {};

    expenses.forEach((expense) => {
      const date = new Date(expense.expense_date);
      const dateKey = date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      const monthKey = date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

      const amount = Number(expense.amount || 0);

      dailyData[dateKey] = (dailyData[dateKey] || 0) + amount;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + amount;
      categoryData[expense.category] = (categoryData[expense.category] || 0) + amount;
    });

    return {
      daily: Object.entries(dailyData)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .slice(-30) // Last 30 days
        .map(([date, amount]) => ({ date, amount })),
      monthly: Object.entries(monthlyData)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .map(([month, amount]) => ({ month, amount })),
      category: Object.entries(categoryData)
        .sort((a, b) => b[1] - a[1])
        .map(([name, amount]) => ({ name, amount })),
    };
  }

  if (!token) {
    return (
      <main className="page">
        <section className="auth-card">
          <h1>{t.appTitle}</h1>
          <p className="muted">
            {authMode === "login" ? t.loginSubtitle : t.registerSubtitle}
          </p>

          <form className="form" onSubmit={handleAuth}>
            <input
              type="text"
              placeholder={t.email}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder={t.password}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading
                ? t.pleaseWait
                : authMode === "login"
                ? t.login
                : t.register}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          <button
            type="button"
            onClick={() =>
              setAuthMode(authMode === "login" ? "register" : "login")
            }
          >
            {authMode === "login" ? t.createAccount : t.alreadyHaveAccount}
          </button>
          <p className="watermark">⚡ Built by Ranjith</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="app-shell">
        <header className="header">
          <div>
            <h1>{t.appTitle}</h1>
            <p className="muted">{t.tip}</p>
          </div>

          <div className="actions">
            <button
              type="button"
              className="icon-btn lang-btn"
              onClick={toggleLanguage}
              title="Change language"
            >
              <Globe size={18} />
              {language.toUpperCase()}
            </button>

            <button
              type="button"
              className="icon-btn graph-btn"
              onClick={() => setCurrentPage("graph")}
              title="View graph"
            >
              <BarChart3 size={18} />
            </button>

            <button
              type="button"
              className="icon-btn reload-btn"
              onClick={handleReload}
              title="Reload & fetch fresh data"
              disabled={loading}
            >
              {loading ? (
                <Loader size={18} className="spinner" />
              ) : (
                <RefreshCw size={18} />
              )}
            </button>

            <button
              type="button"
              className="icon-btn logout-btn"
              onClick={logout}
              title={t.logout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div
          className="summary-card"
          onClick={() => setShowTotal(!showTotal)}
          style={{ cursor: "pointer" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p className="muted">{monthName}</p>
              <h2>₹{thisMonthTotal.toLocaleString("en-IN")}</h2>
            </div>
            <div style={{ textAlign: "right" }}>
              <p className="muted" style={{ margin: "0 0 4px 0", fontSize: "13px" }}>{t.expenses}</p>
              <p style={{ margin: 0, fontSize: "24px", fontWeight: "700" }}>{thisMonthCount}</p>
            </div>
          </div>

          {lastFetchTime && (
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", marginTop: "8px" }}>
              Last updated: {lastFetchTime.toLocaleTimeString()}
            </p>
          )}

          {showTotal && (
            <>
              <hr />
              <p className="muted">{t.totalAllTime}</p>
              <h3>₹{total.toLocaleString("en-IN")}</h3>
            </>
          )}
        </div>

        {currentPage === "home" ? (
          <>
            <form className="note-form" onSubmit={addExpense}>
          <div className="note-toolbar">
            <div className="note-date-group">
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                disabled={loading}
              />
              <span className="muted">{formatDateLabel(expenseDate)}</span>
            </div>

            <div className="note-actions">
              <button
                type="button"
                className="note-expand-btn"
                onClick={() => setIsNoteExpanded((expanded) => !expanded)}
                title={isNoteExpanded ? "Compact note box" : "Expand for multiple expenses"}
                aria-label={isNoteExpanded ? "Compact note box" : "Expand for multiple expenses"}
              >
                {isNoteExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>

              <button
                type="submit"
                className={loading ? "note-submit-btn btn-loading" : "note-submit-btn"}
                disabled={loading || !note.trim()}
                title="Add expense"
                aria-label="Add expense"
              >
                {loading ? (
                  <Loader size={20} className="spinner" />
                ) : (
                  <Plus size={22} />
                )}
              </button>
            </div>
          </div>

          <div className="note-entry">
            <textarea
              rows={isNoteExpanded ? 4 : 1}
              className={isNoteExpanded ? "note-textarea expanded" : "note-textarea compact"}
              placeholder={isNoteExpanded ? `${t.addExpense}\n${t.multipleExpenseHint}` : t.addExpense}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (e.target.value.includes("\n")) {
                  setIsNoteExpanded(true);
                }
                setIsNoteFocused(true);
                setActiveSuggestionIndex(0);
              }}
              onFocus={() => setIsNoteFocused(true)}
              onBlur={() => setIsNoteFocused(false)}
              onKeyDown={handleNoteKeyDown}
              disabled={loading}
            />
          </div>

          {showKeywordSuggestions && (
            <div className="keyword-suggestions" role="listbox" aria-label="Expense keyword suggestions">
              <div className="keyword-suggestions-title">Suggestions</div>
              {suggestedKeywords.map((item, index) => (
                <button
                  key={`${item.type}-${item.keyword}`}
                  type="button"
                  className={index === activeSuggestionIndex ? "active" : ""}
                  onClick={() => insertKeywordSuggestion(item.keyword)}
                  onMouseDown={(e) => e.preventDefault()}
                  role="option"
                  aria-selected={index === activeSuggestionIndex}
                >
                  <Tag size={15} />
                  <span>{item.keyword}</span>
                  <small>{item.type}</small>
                </button>
              ))}
              <div className="keyword-suggestions-hint">Use ↑ ↓ and Enter to select</div>
            </div>
          )}

        </form>

        {error && <p className="error">{error}</p>}

        <div className="expense-search">
          <div className="expense-search-field">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              placeholder={t.searchExpenses}
              value={expenseSearch}
              onChange={(e) => setExpenseSearch(e.target.value)}
              aria-label="Search expenses"
            />
            {expenseSearch && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setExpenseSearch("")}
                aria-label="Clear search"
                title="Clear search"
              >
                <X size={16} />
              </button>
            )}
          </div>
          {expenseSearch && (
            <span className="expense-search-count">
              {filteredExpenses.length} of {expenses.length}
            </span>
          )}
        </div>

        <div className="list">
          {filteredExpenses.length === 0 ? (
            <p className="empty">
              {expenses.length === 0 ? t.noExpenses : t.noSearchResults}
            </p>
          ) : (
            filteredExpenses.map((item) => (
              <article className="expense-card" key={item.id}>
                <div>
                  <strong>{item.description}</strong>
                  <div className="expense-meta">
                    <span className={`expense-category-pill ${getCategoryTone(item.category)}`}>
                      {item.category}
                    </span>
                    <span>{item.expense_date}</span>
                  </div>
                </div>

                <div className="amount-box">
                  <span>₹{Number(item.amount).toLocaleString("en-IN")}</span>

                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => deleteExpense(item.id)}
                    title={t.deleteBtn}
                    disabled={deletingId === item.id}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
          </>
        ) : (
          <div className="graph-page">
            <button
              type="button"
              className="icon-btn graph-back-btn"
              onClick={() => setCurrentPage("home")}
            >
              <ArrowLeft size={18} /> Back
            </button>

            {expenses.length > 0 ? (
              <>
                <div className="chart-card">
                  <h3>Last 30 Days</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getGraphData().daily}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d8e4e3" />
                      <XAxis dataKey="date" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip />
                      <Line type="monotone" dataKey="amount" stroke="#0f766e" strokeWidth={3} dot={{ fill: "#0f766e", r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3>Monthly Comparison</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getGraphData().monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d8e4e3" />
                      <XAxis dataKey="month" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#0f766e" radius={[7, 7, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-card">
                  <h3>Expenses by Category</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getGraphData().category} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#d8e4e3" />
                      <XAxis type="number" stroke="#64748b" />
                      <YAxis dataKey="name" type="category" stroke="#64748b" width={100} />
                      <Tooltip />
                      <Bar dataKey="amount" fill="#0f4c81" radius={[0, 7, 7, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <p className="empty">No expenses to display</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
