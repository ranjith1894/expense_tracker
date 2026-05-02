import React, { useEffect, useState } from "react";
import { Plus, Trash2, LogOut, Loader, Globe, RefreshCw } from "lucide-react";
import { translations, months } from "./translations.js";

const API_BASE = "";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [authMode, setAuthMode] = useState("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
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

  const t = translations[language];

  useEffect(() => {
    if (token) {
      fetchExpenses();
    }
  }, [token]);

  // Auto-refresh expenses every 5 minutes to keep data fresh
  useEffect(() => {
    if (!token || !dataFetched) return;

    const interval = setInterval(() => {
      console.log("Auto-refreshing data from API...");
      fetchExpenses();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [token, dataFetched]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthName = `${months[language][currentMonth]} ${currentYear}`;

  const thisMonthExpenses = expenses.filter((item) => {
    const d = new Date(item.expense_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const thisMonthTotal = thisMonthExpenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const thisMonthCount = thisMonthExpenses.length;

  const total = expenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

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

    if (!note.trim()) return;

    setError("");
    setLoading(true);

    try {
      const newExpense = await request("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          note,
          expense_date: expenseDate,
        }),
      });

      setExpenses((prev) => [newExpense, ...prev]);
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

        <form className="note-form" onSubmit={addExpense}>
          <div>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              disabled={loading}
            />
            <span className="muted">{formatDateLabel(expenseDate)}</span>
          </div>

          <div>
            <input
              type="text"
              placeholder={t.addExpense}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !note.trim()}
              className={loading ? "btn-loading" : ""}
            >
              {loading ? (
                <Loader size={20} className="spinner" />
              ) : (
                <Plus size={20} />
              )}
            </button>
          </div>
        </form>

        {error && <p className="error">{error}</p>}

        <div className="list">
          {expenses.length === 0 ? (
            <p className="empty">{t.noExpenses}</p>
          ) : (
            expenses.map((item) => (
              <article className="expense-card" key={item.id}>
                <div>
                  <strong>{item.description}</strong>
                  <p className="muted">
                    {item.category} • {item.expense_date}
                  </p>
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
      </section>
    </main>
  );
}