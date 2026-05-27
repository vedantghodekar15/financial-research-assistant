from fastapi import FastAPI, UploadFile, File
import shutil
import os
from pathlib import Path

from vector_store import add_pdf_to_faiss
from rag_pipeline import ask_question, get_retriever
from summarizer import summarize_report

app = FastAPI(
    title="Financial Research Assistant API"
)

BASE_DIR = Path(__file__).resolve().parent.parent
REPORTS_DIR = BASE_DIR / "data" / "reports"

os.makedirs(REPORTS_DIR, exist_ok=True)


# -----------------------------
# Upload Financial Report
# -----------------------------
@app.post("/upload")
async def upload_report(file: UploadFile = File(...)):

    file_path = REPORTS_DIR / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Process PDF -> chunk -> embeddings -> FAISS
    add_pdf_to_faiss(file.filename)

    return {
        "message": "Report uploaded and indexed successfully",
        "filename": file.filename
    }


# -----------------------------
# Ask Questions
# -----------------------------
@app.post("/ask")
async def ask(query: str):

    answer = ask_question(query)

    return {
        "question": query,
        "answer": answer
    }

# -----------------------------
# Semantic Search
# -----------------------------
@app.post("/search")
async def search(query: str):

    retriever = get_retriever()
    docs = retriever.invoke(query)

    results = []

    for doc in docs:
        results.append({
            "source": doc.metadata.get("source", "Unknown"),
            "content": doc.page_content
        })

    return {
        "query": query,
        "results": results
    }


# -----------------------------
# Summarize Report
# -----------------------------
@app.get("/summarize")
async def summarize():

    summary = summarize_report()

    return {
        "summary": summary
    }