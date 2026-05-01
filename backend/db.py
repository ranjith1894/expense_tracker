import os
import psycopg
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
        "amazon,flipkart,myntra,ajio,shopping,dress,shirt,jeans,shoe,watch,bag,clothes,accessories,grocery,groceries,hypermarket,supermarket,store,mall"
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


DATABASE_URL = os.getenv("DATABASE_URL")

def get_conn():
    return psycopg.connect(DATABASE_URL)



def init_db():
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE,
        password TEXT,
        created_at TIMESTAMP
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        title TEXT,
        amount NUMERIC,
        created_at TIMESTAMP
    )
    """)

    conn.commit()
    cur.close()
    conn.close()


def sync_categories():
    from datetime import datetime

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with get_conn() as conn:
        for name, keywords in DEFAULT_CATEGORIES:
            existing = conn.execute(
                "SELECT id, keywords FROM categories WHERE name = %s",
                (name,),
            ).fetchone()

            if existing:
                # update only if changed
                if (existing["keywords"] or "") != keywords:
                    conn.execute(
                        "UPDATE categories SET keywords = %s WHERE name = %s",
                        (keywords, name),
                    )
            else:
                conn.execute(
                    "INSERT INTO categories (name, keywords, created_at) VALUES (%s, %s, %s)",
                    (name, keywords, now),
                )

        conn.commit()