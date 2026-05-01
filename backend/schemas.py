from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    identifier: str
    password: str

class ExpenseCreate(BaseModel):
    note: str