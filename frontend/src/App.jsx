import React, { useEffect, useState } from "react";
import { Plus, Trash2, LogOut, Loader, Globe } from "lucide-react";
import { translations, months } from "./translations.js";

const API_BASE = "";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [authMode, setAuthMode] = useState("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTotal, setShowTotal] = useState(false);
  const [language, setLanguage] = useState(localStorage.getItem("language") || "en");

  const t = translations[language];

  useEffect(() => {
    if (token) {
      fetchExpenses();
    }
  }, [token]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthName = `${months[language][currentMonth]} ${currentYear}`;

  const thisMonthExpenses = expenses.filter((item) => {
    const d = new Date(item.expense_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const thisMonthTotal = thisMonthExpenses.reduce((sum, item) => {
    return sum + Number(item.amount || 0);
  }, 0);

  const thisMonthCount = thisMonthExpenses.length;

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
    setError("");
    setLoading(true);

    try {
      const path = authMode === "login" ? "/api/login" : "/api/register";
      
      let body;
      if (authMode === "login") {
        body = { identifier, password };
      } else {
        // For registration: only username and password
        const username = identifier.trim();
        body = {
          username: username,
          password
        };
      }
      
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
      setExpenses(data);
    } catch (err) {
      setError(err.message);
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
        body: JSON.stringify({ note, expense_date: expenseDate }),
      });

      setExpenses((prev) => [newExpense, ...prev]);
      setNote("");
      setExpenseDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteExpense(id) {
    setError("");

    try {
      await request(`/api/expenses/${id}`, { method: "DELETE" });
      setExpenses((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message);
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

  const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  function formatDateLabel(dateStr) {
    const selected = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const resetTime = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const selectedReset = resetTime(selected);
    const todayReset = resetTime(today);
    const yesterdayReset = resetTime(yesterday);

    if (selectedReset.getTime() === todayReset.getTime()) return "Today";
    if (selectedReset.getTime() === yesterdayReset.getTime()) return "Yesterday";

    const daysAgo = Math.floor((todayReset - selectedReset) / (1000 * 60 * 60 * 24));
    if (daysAgo > 0 && daysAgo < 7) return `${daysAgo} days ago`;

    return selected.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  }

  if (!token) {
    return (
      <div className="page">
        <div className="auth-card">
          <h1>{t.appTitle}</h1>
          <p className="muted">{authMode === "login" ? t.loginSubtitle : t.registerSubtitle}</p>

          <form onSubmit={handleAuth} className="form">
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
              {loading ? t.pleaseWait : authMode === "login" ? t.login : t.register}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          <button className="link-btn" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
            {authMode === "login" ? t.createAccount : t.alreadyHaveAccount}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="app-shell">
        <header className="header">
          <div>
            <h1>{t.appTitle}</h1>
            <p className="muted">{t.tip}</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="icon-btn lang-btn" onClick={toggleLanguage} title="Toggle Language">
              <Globe size={18} />
              <span style={{ marginLeft: "4px", fontSize: "12px" }}>{language.toUpperCase()}</span>
            </button>
            <button className="icon-btn logout-btn" onClick={logout} title={t.logout}>
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <section className="summary-card" onClick={() => setShowTotal(!showTotal)} style={{ cursor: "pointer" }}>
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

          {showTotal && (
            <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.2)" }}>
              <p className="muted" style={{ margin: "0 0 4px 0" }}>{t.totalAllTime}</p>
              <h3 style={{ margin: "8px 0 0 0" }}>₹{total.toLocaleString("en-IN")}</h3>
            </div>
          )}
        </section>
        <form onSubmit={addExpense} className="note-form">
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #ddd", fontSize: "14px" }}
              max={new Date().toISOString().split('T')[0]}
              disabled={loading}
            />
            <span style={{ fontSize: "12px", color: "#666", minWidth: "70px" }}>{formatDateLabel(expenseDate)}</span>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              placeholder={t.addExpense}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading} className={loading ? "btn-loading" : ""}>
              {loading ? <Loader size={18} className="spinner" /> : <Plus size={18} />}
            </button>
          </div>
        </form>

        {error && <p className="error">{error}</p>}

        <section className="list">
          {expenses.length === 0 ? (
            <p className="empty">{t.noExpenses}</p>
          ) : (
            expenses.map((item) => (
              <div className="expense-card" key={item.id}>
                <div>
                  <strong>{item.description}</strong>
                  <p className="muted">
                    {item.category} • {item.expense_date}
                  </p>
                </div>

                <div className="amount-box">
                  <span>₹{Number(item.amount).toLocaleString("en-IN")}</span>
                  <button className="delete-btn" onClick={() => deleteExpense(item.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
