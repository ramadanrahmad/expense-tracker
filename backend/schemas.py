from pydantic import BaseModel, EmailStr
from datetime import date, datetime
from typing import Optional, List

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class CategoryBase(BaseModel):
    name: str
    type: str

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    amount: float
    transaction_type: str
    date: datetime
    description: Optional[str] = None
    input_method: str = "manual"
    category_id: int

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int
    created_at: datetime
    category: Optional[Category] = None
    
    class Config:
        from_attributes = True

class NLPInput(BaseModel):
    text: str
