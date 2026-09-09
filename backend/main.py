from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models
import schemas
from database import engine, get_db
import nlp_service

# We remove the synchronous create_all here to prevent Vercel Serverless cold start crashes.
# models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Expense Tracker API")

@app.get("/init-db")
def init_database():
    try:
        models.Base.metadata.create_all(bind=engine)
        return {"status": "Database tables created successfully!"}
    except Exception as e:
        return {"error": str(e)}

import os

# Configure CORS for frontend
allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Expense Tracker API"}

# --- Categories ---
@app.post("/categories/", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db)):
    db_category = models.Category(**category.model_dump())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@app.get("/categories/", response_model=List[schemas.Category])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    categories = db.query(models.Category).offset(skip).limit(limit).all()
    return categories

# --- Transactions ---
@app.post("/transactions/", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = models.Transaction(**transaction.model_dump())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.get("/transactions/", response_model=List[schemas.Transaction])
def read_transactions(skip: int = 0, limit: int = 1000, start_date: str = None, end_date: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Transaction)
    if start_date:
        query = query.filter(models.Transaction.date >= start_date)
    if end_date:
        # Append 23:59:59 if it's just a date string so it includes the whole day
        if len(end_date) == 10:
            end_date += " 23:59:59"
        query = query.filter(models.Transaction.date <= end_date)
        
    transactions = query.order_by(models.Transaction.date.desc(), models.Transaction.id.desc()).offset(skip).limit(limit).all()
    return transactions

# --- NLP Input ---
@app.post("/transactions/nlp/", response_model=List[schemas.Transaction])
def create_transaction_from_nlp(nlp_input: schemas.NLPInput, db: Session = Depends(get_db)):
    # Get existing categories to help NLP model
    existing_cats = db.query(models.Category).all()
    cat_names = [c.name for c in existing_cats]
    
    # 1. Parse text using NLP
    parsed_transactions = nlp_service.parse_text_to_transaction(nlp_input.text, cat_names)
    
    if not parsed_transactions:
        raise HTTPException(status_code=400, detail="Could not parse transaction from text. Check your API key or text format.")
        
    created_transactions = []
    
    for parsed_data in parsed_transactions:
        # 2. Find or create category
        category_name = parsed_data.get("category", "Lainnya")
        category = db.query(models.Category).filter(models.Category.name == category_name).first()
        
        if not category:
            # Create default category if not exists
            category = models.Category(name=category_name, type=parsed_data.get("type", "expense"))
            db.add(category)
            db.commit()
            db.refresh(category)
            
        # 3. Create transaction
        transaction_data = schemas.TransactionCreate(
            amount=parsed_data["amount"],
            transaction_type=parsed_data.get("type", "expense"),
            date=parsed_data["date"],
            description=parsed_data.get("description", nlp_input.text),
            input_method="nlp",
            category_id=category.id
        )
        
        db_transaction = models.Transaction(**transaction_data.model_dump())
        db.add(db_transaction)
        db.commit()
        db.refresh(db_transaction)
        
        created_transactions.append(db_transaction)
    
    return created_transactions

@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    db.delete(db_transaction)
    db.commit()
    return {"message": "Transaction deleted successfully"}

@app.put("/transactions/{transaction_id}", response_model=schemas.Transaction)
def update_transaction(transaction_id: int, transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
        
    for key, value in transaction.model_dump().items():
        setattr(db_transaction, key, value)
        
    db.commit()
    db.refresh(db_transaction)
    return db_transaction
