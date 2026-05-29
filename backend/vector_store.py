from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from chunking import chunk_documents
import os


# -----------------------------
# Embedding Model
# -----------------------------
def get_embedding_model():
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )


# -----------------------------
# User-specific path
# -----------------------------
def get_index_path(user_id):
    return os.path.join(
        "vectorstore",
        str(user_id)
    )


# -----------------------------
# Load User FAISS
# -----------------------------
def load_db(user_id):

    embedding_model = get_embedding_model()
    index_path = get_index_path(user_id)

    faiss_file = os.path.join(
        index_path,
        "index.faiss"
    )

    pkl_file = os.path.join(
        index_path,
        "index.pkl"
    )

    if (
        os.path.exists(faiss_file)
        and
        os.path.exists(pkl_file)
    ):
        print(
            f"Loading FAISS for user {user_id}"
        )

        return FAISS.load_local(
            index_path,
            embedding_model,
            allow_dangerous_deserialization=True
        )

    print(
        f"No FAISS found for user {user_id}"
    )

    return None


# -----------------------------
# Add PDF → User FAISS
# -----------------------------
def add_pdf_to_faiss(
    pdf_path,
    user_id
):
    print(
        f"Processing {pdf_path}"
    )

    chunks = chunk_documents(pdf_path)
    texts = [
        c.page_content
        for c in chunks
    ]

    embedding_model = get_embedding_model()

    db = load_db(user_id)

    index_path = get_index_path(user_id)

    # First report
    if db is None:

        print(
            "Creating new FAISS index..."
        )

        db = FAISS.from_texts(
            texts,
            embedding_model,
            metadatas=[
                {
                    "source": pdf_path,
                    "user_id": user_id
                }
            ] * len(texts)
        )

    # Existing report
    else:

        print(
            "Adding to existing index..."
        )

        db.add_texts(
            texts,
            metadatas=[
                {
                    "source": pdf_path,
                    "user_id": user_id
                }
            ] * len(texts)
        )

    os.makedirs(
        index_path,
        exist_ok=True
    )

    db.save_local(index_path)

    print(
        f"FAISS updated for user {user_id}"
    )


# -----------------------------
# Search
# -----------------------------
def search(
    query,
    user_id,
    k=3
):

    db = load_db(user_id)

    if db is None:
        raise Exception(
            "No vector DB found"
        )

    return db.similarity_search(
        query,
        k=k
    )