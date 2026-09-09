from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    transactions = relationship("Transaction", back_populates="user")
    categories = relationship("Category", back_populates="user")

class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String) # 'income' or 'expense'
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Nullable for backward compatibility
    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    transaction_type = Column(String) # 'income' or 'expense'
    date = Column(DateTime)
    description = Column(String)
    input_method = Column(String, default="manual") # 'manual' or 'nlp'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    category_id = Column(Integer, ForeignKey("categories.id"))
    category = relationship("Category", back_populates="transactions")
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True) # Nullable for backward compatibility
    user = relationship("User", back_populates="transactions")
