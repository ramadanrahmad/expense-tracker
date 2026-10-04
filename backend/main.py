from fastapi import FastAPI
app = FastAPI()

@app.get("/")
def read_root():
    return {"status": "ok"}

@app.post("/parse-nlp")
def dummy():
    return []
