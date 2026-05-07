import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const ADMIN_PASSWORD = "ranj1234";

export default function AdminDashboard() {
  const [isAllowed, setIsAllowed] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [userSummary, setUserSummary] = useState([]);
  const [categorySummary, setCategorySummary] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [selectedUser, setSelectedUser] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const alreadyAllowed = sessionStorage.getItem("admin_allowed");
    if (alreadyAllowed === "true") {
      setIsAllowed(true);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) {
      fetchAdminData();
    }
  }, [isAllowed]);

  async function fetchAdminData() {
    try {
      setLoading(true);

      const [summaryRes, expensesRes, userSummaryRes, categorySummaryRes] =
        await Promise.all([
          fetch("/api/admin/summary"),
          fetch("/api/admin/expenses"),
          fetch("/api/admin/user-summary"),
          fetch("/api/admin/category-summary"),
        ]);

      if (
        !summaryRes.ok ||
        !expensesRes.ok ||
        !userSummaryRes.ok ||
        !categorySummaryRes.ok
      ) {
        throw new Error("Failed to load admin data");
      }

      setSummary(await summaryRes.json());
      setExpenses(await expensesRes.json());
      setUserSummary(await userSummaryRes.json());
      setCategorySummary(await categorySummaryRes.json());
    } catch (error) {
      console.error(error);
      alert("Unable to load admin data");
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(e) {
    e.preventDefault();

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("admin_allowed", "true");
      setIsAllowed(true);
      setLoginError("");
      setPassword("");
    } else {
      setLoginError("Invalid admin password");
    }
  }

  function logout() {
    sessionStorage.removeItem("admin_allowed");
    window.location.href = "/";
  }

  function formatAmount(value) {
    return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  }

  function formatDate(value) {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      });
    } catch {
      return value;
    }
  }

  function formatDateTime(value) {
    if (!value) return "-";
    try {
      return new Date(value).toLocaleString("en-IN", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  }

  const users = useMemo(() => {
    const uniqueUsers = new Set();
    expenses.forEach((item) => {
      if (item.username) uniqueUsers.add(item.username);
    });
    return Array.from(uniqueUsers).sort();
  }, [expenses]);

  const categories = useMemo(() => {
    const uniqueCategories = new Set();
    expenses.forEach((item) => {
      uniqueCategories.add(item.category || "Other");
    });
    return Array.from(uniqueCategories).sort();
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const text = searchText.trim().toLowerCase();

    return expenses.filter((item) => {
      const username = item.username || `User ${item.user_id}`;
      const category = item.category || "Other";
      const description = item.description || "";
      const amount = String(item.amount || "");

      const matchesSearch =
        !text ||
        username.toLowerCase().includes(text) ||
        category.toLowerCase().includes(text) ||
        description.toLowerCase().includes(text) ||
        amount.includes(text);

      const matchesUser = selectedUser === "all" || username === selectedUser;
      const matchesCategory =
        selectedCategory === "all" || category === selectedCategory;

      return matchesSearch && matchesUser && matchesCategory;
    });
  }, [expenses, searchText, selectedUser, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / rowsPerPage));

  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredExpenses.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredExpenses, currentPage, rowsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, selectedUser, selectedCategory, rowsPerPage]);

  function clearFilters() {
    setSearchText("");
    setSelectedUser("all");
    setSelectedCategory("all");
    setCurrentPage(1);
  }

  if (!isAllowed) {
    return (
      <div className="admin-lock-page">
        <div className="admin-lock-card">
          <div className="lock-icon">🔒</div>
          <h2>Admin Access</h2>
          <p className="muted">Enter password to open the super admin dashboard</p>

          <form onSubmit={handleLogin} className="admin-lock-form">
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit">Unlock</button>
          </form>

          {loginError && <p className="admin-login-error">{loginError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>Super Admin Dashboard</h1>
          <p className="muted">Read-only view of all user expenses</p>
        </div>

        <div className="admin-actions">
          <button onClick={fetchAdminData} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <section className="admin-cards">
        <div className="admin-card">
          <span>Total Users</span>
          <strong>{summary?.total_users || 0}</strong>
        </div>

        <div className="admin-card">
          <span>Total Expenses</span>
          <strong>{summary?.total_expenses || 0}</strong>
        </div>

        <div className="admin-card">
          <span>Total Amount</span>
          <strong>{formatAmount(summary?.total_amount)}</strong>
        </div>

        <div className="admin-card">
          <span>This Month</span>
          <strong>{formatAmount(summary?.this_month_amount)}</strong>
        </div>
      </section>

      <section className="admin-chart-grid">
        <div className="admin-chart-card">
          <h3>User-wise Spending</h3>
          {userSummary.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userSummary}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="username"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />
                <YAxis />
                <Tooltip formatter={(value) => formatAmount(value)} />
                <Bar dataKey="total_amount" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted">No user spending data available</p>
          )}
        </div>

        <div className="admin-chart-card">
          <h3>Category-wise Spending</h3>
          {categorySummary.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categorySummary}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />
                <YAxis />
                <Tooltip formatter={(value) => formatAmount(value)} />
                <Bar dataKey="total_amount" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="muted">No category spending data available</p>
          )}
        </div>
      </section>

      <section className="admin-table-card">
        <div className="admin-table-header">
          <div>
            <h3>All Expenses</h3>
            <p className="muted">
              Showing {paginatedExpenses.length} of {filteredExpenses.length} records
            </p>
          </div>
        </div>

        <div className="admin-filters">
          <input
            className="admin-search-input"
            type="text"
            placeholder="Search user, description, category, amount..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />

          <select
            className="admin-filter-select"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
          >
            <option value="all">All Users</option>
            {users.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>

          <select
            className="admin-filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            className="admin-filter-select"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            <option value={5}>5 rows</option>
            <option value={10}>10 rows</option>
            <option value={20}>20 rows</option>
            <option value={50}>50 rows</option>
          </select>

          <button onClick={clearFilters} className="secondary-btn">
            Clear
          </button>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Description</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Expense Date</th>
                <th>Created At</th>
              </tr>
            </thead>

            <tbody>
              {paginatedExpenses.length > 0 ? (
                paginatedExpenses.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="user-cell">
                        {item.username || `User ${item.user_id}`}
                      </div>
                    </td>
                    <td>
                      <div className="description-cell">
                        {item.description || "-"}
                      </div>
                    </td>
                    <td>
                      <span className="category-pill">
                        {item.category || "Other"}
                      </span>
                    </td>
                    <td className="amount-cell">{formatAmount(item.amount)}</td>
                    <td>{formatDate(item.expense_date)}</td>
                    <td>{formatDateTime(item.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty-table">
                    No expenses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-pagination">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => page - 1)}
          >
            Previous
          </button>

          <span>
            Page {currentPage} of {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((page) => page + 1)}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}