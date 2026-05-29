from fastapi import (
    FastAPI,
    UploadFile,
    File,
    Depends,
    HTTPException
)

import shutil
import os
from pathlib import Path
from sqlalchemy.orm import Session

from vector_store import add_pdf_to_faiss
from rag_pipeline import ask_question, get_retriever
from summarizer import summarize_report

from database import (
    User,
    UserCreate,
    UserLogin,
    get_db
)

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)

app = FastAPI(
    title="Financial Research Assistant API"
)

BASE_DIR = Path(__file__).resolve().parent.parent
REPORTS_DIR = BASE_DIR / "data" / "reports"

os.makedirs(REPORTS_DIR, exist_ok=True)


# -----------------------------
# Signup
# -----------------------------
@app.post("/signup")
def signup(
    user: UserCreate,
    db: Session = Depends(get_db)
):

    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = User(
        username=user.username,
        email=user.email,
        password=hash_password(user.password)
    )

    db.add(new_user)
    db.commit()

    return {
        "message": "Signup successful"
    }


# -----------------------------
# Login
# -----------------------------
from fastapi.security import OAuth2PasswordRequestForm
@app.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    db_user = db.query(User).filter(
        User.email == form_data.username
    ).first()

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    if not verify_password(
        form_data.password,
        db_user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    token = create_access_token(
        {"sub": db_user.email}
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }

# -----------------------------
# Upload Financial Report
# -----------------------------
@app.post("/upload")
async def upload_report(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):

    file_path = REPORTS_DIR / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # PDF -> Loader -> Chunking -> Embeddings -> FAISS
    add_pdf_to_faiss(
        file.filename,
        current_user.id
    )

    return {
        "message": "Report uploaded and indexed successfully",
        "filename": file.filename
    }


# -----------------------------
# Ask Questions
# -----------------------------
@app.post("/ask")
async def ask(
    query: str,
    current_user=Depends(get_current_user)
):

    answer = ask_question(query)

    return {
        "question": query,
        "answer": answer
    }


# -----------------------------
# Semantic Search
# -----------------------------
@app.post("/search")
async def search(
    query: str,
    current_user=Depends(get_current_user)
):

    retriever = get_retriever()
    docs = retriever.invoke(query)

    results = []

    for doc in docs:
        results.append({
            "source": doc.metadata.get(
                "source",
                "Unknown"
            ),
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
async def summarize(
    current_user=Depends(get_current_user)
):

    summary = summarize_report()

    return {
        "summary": summary
    }