from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import nlp_service

app = FastAPI(title="Expense Tracker NLP API")

allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://expense-tracker-soramame1.vercel.app",
    "https://expense-tracker-git-main-soramame1.vercel.app"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for now to avoid CORS issues on PWA
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NLPInput(BaseModel):
    text: str

@app.get("/")
def read_root():
    return {"message": "Welcome to Expense Tracker API - Offline Mode NLP Backend"}

@app.post("/parse-nlp")
def parse_transaction_nlp(nlp_input: NLPInput):
    try:
        result = nlp_service.parse_transaction(nlp_input.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"NLP Processing Error: {str(e)}")
