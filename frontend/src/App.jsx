import React, { useEffect, useState } from "react";
import { Plus, Trash2, LogOut } from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchExpenses();
    }
  }, [token]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthTotal = expenses.reduce((sum, item) => {
    const d = new Date(item.expense_date);

    if (
      d.getMonth() === currentMonth &&
      d.getFullYear() === currentYear
    ) {
      return sum + Number(item.amount || 0);
    }

    return sum;
  }, 0);

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
      const data = await request(path, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      localStorage.setItem("token", data.access_token);
      setToken(data.access_token);
      setEmail("");
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
        body: JSON.stringify({ note }),
      });

      setExpenses((prev) => [newExpense, ...prev]);
      setNote("");
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

  const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (!token) {
    return (
      <div className="page">
        <div className="auth-card">
          <h1>Expense Tracker</h1>
          <p className="muted">Login and track expenses using simple notes.</p>

          <form onSubmit={handleAuth} className="form">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Please wait..." : authMode === "login" ? "Login" : "Register"}
            </button>
          </form>

          {error && <p className="error">{error}</p>}

          <button className="link-btn" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
            {authMode === "login" ? "Create new account" : "Already have account? Login"}
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
            <h1>Expense Tracker</h1>
            <p className="muted">Type like: tea 20, uber airport 650</p>
          </div>
          <button className="icon-btn" onClick={logout} title="Logout">
            <LogOut size={18} />
          </button>
        </header>

        <section className="summary-card">
          <p className="muted">This Month</p>
          <h2>₹{thisMonthTotal.toLocaleString("en-IN")}</h2>

          <p className="muted" style={{ marginTop: "10px" }}>Total</p>
          <h3>₹{total.toLocaleString("en-IN")}</h3>
        </section>
        <form onSubmit={addExpense} className="note-form">
          <input
            placeholder="Add expense note... eg: food 200"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            <Plus size={18} />
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        <section className="list">
          {expenses.length === 0 ? (
            <p className="empty">No expenses yet.</p>
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
