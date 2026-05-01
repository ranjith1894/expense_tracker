import re
from fastapi import FastAPI, Depends, HTTPException
from datetime import datetime, date
from typing import List

from db import get_conn, init_db, sync_categories
from auth import hash_password, verify_password, create_token, get_user_id
from schemas import UserCreate, UserLogin, ExpenseCreate
from difflib import SequenceMatcher
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI()



app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for now
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()
    sync_categories()

@app.get("/api/health")
def home():
    return {"status": "running"}
    
# ---------- AUTH ----------

@app.post("/api/register")
def register(user: UserCreate):
    with get_conn() as conn:
        # Check if username already exists
        cur = conn.execute("SELECT id FROM users WHERE username=%s", (user.username,))
        if cur.fetchone():
            raise HTTPException(400, "Username already exists")

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cur = conn.execute(
            "INSERT INTO users (username, password_hash, created_at) VALUES (%s, %s, %s) RETURNING id",
            (user.username, hash_password(user.password), now),
        )
        conn.commit()

        user_id = cur.fetchone()["id"]
        return {"access_token": create_token(user_id)}

@app.post("/api/login")
def login(user: UserLogin):
    with get_conn() as conn:
        # Allow login with email, username, or phone number
        cur = conn.execute("SELECT * FROM users WHERE email=%s OR username=%s OR phone_number=%s", (user.identifier, user.identifier, user.identifier))
        db_user = cur.fetchone()

        if not db_user or not verify_password(user.password, db_user["password_hash"]):
            raise HTTPException(401, "Invalid credentials")

        return {"access_token": create_token(db_user["id"])}

# ---------- CATEGORY ----------


def parse_expense_note(note: str):
    amount_matches = re.findall(r"\d+(?:[:.]\d+)?", note)

    if not amount_matches:
        raise HTTPException(400, "Amount not found in note")

    amount = float(amount_matches[-1].replace(":", "."))

    description = re.sub(r"\d+(?:[:.]\d+)?", "", note).strip()
    description = " ".join(description.split())

    if not description:
        description = "Expense"

    return description, amount

def get_other_category():
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, name FROM categories WHERE name='Other'"
        ).fetchone()

    return row["id"], row["name"]

def is_similar(word: str, keyword: str, threshold: float = 0.78):
    return SequenceMatcher(None, word, keyword).ratio() >= threshold


def detect_category_id(note: str):
    text = note.lower()
    words = re.findall(r"[a-zA-Z]+", text)

    with get_conn() as conn:
        rows = conn.execute("""
            SELECT id, name, keywords
            FROM categories
            WHERE name != 'Other'
        """).fetchall()

    for row in rows:
        keywords = row["keywords"] or ""

        for keyword in keywords.split(","):
            keyword = keyword.strip().lower()

            if not keyword:
                continue

            # direct match
            if keyword in text:
                return row["id"], row["name"]

            # similar word match
            for word in words:
                if is_similar(word, keyword):
                    return row["id"], row["name"]

    return get_other_category()

@app.post("/api/expenses")
def add_expense(exp: ExpenseCreate, user_id: int = Depends(get_user_id)):
    description, amount = parse_expense_note(exp.note)

    category_id, category_name = detect_category_id(exp.note)

    date_val = date.today().isoformat()
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with get_conn() as conn:
        cur = conn.execute("""
        INSERT INTO expenses (user_id, category_id, description, amount, expense_date, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
        """, (user_id, category_id, description, amount, date_val, now))

        conn.commit()
        expense_id = cur.fetchone()["id"]

    return {
        "id": expense_id,
        "description": description,
        "amount": amount,
        "category_id": category_id,
        "category": category_name,
        "expense_date": date_val,
        "created_at": now
    }


@app.get("/api/expenses")
def get_expenses(user_id: int = Depends(get_user_id)):
    with get_conn() as conn:
        rows = conn.execute("""
        SELECT e.*, c.name as category
        FROM expenses e
        JOIN categories c ON c.id = e.category_id
        WHERE user_id=%s
        ORDER BY id DESC
        """, (user_id,)).fetchall()

        return [dict(r) for r in rows]

@app.delete("/api/expenses/{id}")
def delete_expense(id: int, user_id: int = Depends(get_user_id)):
    with get_conn() as conn:
        conn.execute("DELETE FROM expenses WHERE id=%s AND user_id=%s", (id, user_id))
        conn.commit()

    return {"message": "deleted"}



FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")