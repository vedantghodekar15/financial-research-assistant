from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from chunking import chunk_documents
import os

INDEX_PATH = "vectorstore"


# -----------------------------
# Embedding Model (single source)
# -----------------------------
def get_embedding_model():
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )


# -----------------------------
# Load existing FAISS or None
# -----------------------------
def load_db():
    embedding_model = get_embedding_model()

    faiss_file = os.path.join(INDEX_PATH, "index.faiss")
    pkl_file = os.path.join(INDEX_PATH, "index.pkl")

    if os.path.exists(faiss_file) and os.path.exists(pkl_file):
        print("Loading existing FAISS index...")
        return FAISS.load_local(
            INDEX_PATH,
            embedding_model,
            allow_dangerous_deserialization=True
        )

    print("No index found. Will create new one...")
    return None


# -----------------------------
# Add new PDF into FAISS (MAIN LOGIC)
# -----------------------------
def add_pdf_to_faiss(pdf_path):
    print(f"Processing: {pdf_path}")

    chunks = chunk_documents(pdf_path)
    texts = [c.page_content for c in chunks]

    embedding_model = get_embedding_model()

    db = load_db()

    # ----------------------------
    # CASE 1: First document
    # ----------------------------
    if db is None:
        print("Creating new FAISS index...")
        db = FAISS.from_texts(
            texts,
            embedding_model,
            metadatas=[{"source": pdf_path}] * len(texts)
        )

    # ----------------------------
    # CASE 2: Existing index
    # ----------------------------
    else:
        print("Adding to existing FAISS index...")
        db.add_texts(
            texts,
            metadatas=[{"source": pdf_path}] * len(texts)
        )

    # Save after BOTH cases
    os.makedirs(INDEX_PATH, exist_ok=True)
    db.save_local(INDEX_PATH)

    print("FAISS index updated successfully!")


# -----------------------------
# Search function
# -----------------------------
def search(query, k=3):
    embedding_model = get_embedding_model()

    db = FAISS.load_local(
        INDEX_PATH,
        embedding_model,
        allow_dangerous_deserialization=True
    )

    return db.similarity_search(query, k=k)


# -----------------------------
# Test
# -----------------------------
#if __name__ == "__main__":
#    add_pdf_to_faiss("RIL-IAR-2025.pdf")
#
#    results = search("revenue growth", k=3)
#
#    print("\nTop results:\n")
#    for r in results:
#        print(r.page_content[:300])
#        print(r.metadata["source"])
#        print("-" * 50)