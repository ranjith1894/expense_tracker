import sqlite3
from datetime import datetime
from pathlib import Path

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

DB_PATH = DATA_DIR / "expense_tracker.db"

DEFAULT_CATEGORIES = [
    (
        "Food",
        "food,tea,coffee,lunch,dinner,breakfast,meal,biriyani,biryani,burger,pizza,hotel,restaurant,cafe,juice,snacks,food,zomato,swiggy"
    ),
    (
        "Travel",
        "uber,hotel,ola,bus,train,metro,taxi,auto,flight,airport,petrol,diesel,fuel,toll,parking,trip,travel"
    ),
    (
        "Shopping",
        "amazon,flipkart,myntra,ajio,shopping,dress,shirt,jeans,shoe,watch,bag,clothes,accessories"
    ),
    (
        "Bills",
        "electricity,water,internet,wi-fi,wifi,mobile,recharge,bill,postpaid,prepaid,dth,subscription,netflix,prime,hotstar"
    ),
    (
        "Health",
        "medicine,doctor,hospital,clinic,pharmacy,tablet,medical,test,scan,health"
    ),
    (
        "Rent",
        "rent,room,pg,hostel,house,flat,lease"
    ),
    (
        "Entertainment",
        "movie,cinema,netflix,game,concert,party,fun,outing,beer,alcohol"
    ),
    (
        "Education",
        "course,udemy,book,exam,fees,training,learning"
    ),
    (
        "Other",
        ""
    ),
]
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_conn() as conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            email TEXT UNIQUE,
            password_hash TEXT,
            created_at TEXT
        )
        """)

        conn.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY,
            name TEXT UNIQUE,
            keywords TEXT,
            created_at TEXT
        )
        """)

        conn.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            category_id INTEGER,
            description TEXT,
            amount REAL,
            expense_date TEXT,
            created_at TEXT
        )
        """)

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        for name, keywords in DEFAULT_CATEGORIES:
            conn.execute(
                "INSERT OR IGNORE INTO categories (name, keywords, created_at) VALUES (?, ?, ?)",
                (name, keywords, now),
            )

        conn.commit()


def sync_categories():
    from datetime import datetime

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with get_conn() as conn:
        for name, keywords in DEFAULT_CATEGORIES:
            existing = conn.execute(
                "SELECT id, keywords FROM categories WHERE name = ?",
                (name,),
            ).fetchone()

            if existing:
                # update only if changed
                if (existing["keywords"] or "") != keywords:
                    conn.execute(
                        "UPDATE categories SET keywords = ? WHERE name = ?",
                        (keywords, name),
                    )
            else:
                conn.execute(
                    "INSERT INTO categories (name, keywords, created_at) VALUES (?, ?, ?)",
                    (name, keywords, now),
                )

        conn.commit()