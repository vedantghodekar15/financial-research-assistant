from vector_store import load_db, get_embedding_model

# -----------------------------
# Semantic Retriever
# -----------------------------
def retrieve_context(query, k=3):
    """
    Returns top-k relevant financial chunks
    """

    db = load_db()

    if db is None:
        raise Exception("FAISS index not found. Please add a document first.")

    results = db.similarity_search(query, k=k)

    return results


# -----------------------------
# Test Retrieval
# -----------------------------
#if __name__ == "__main__":
#    query = "revenue growth"
#
#    results = retrieve_context(query, k=3)
#
#    print("\nTop relevant chunks:\n")
#
#    for i, r in enumerate(results, 1):
#        print(f"Result {i}")
#        print(r.page_content[:300])
#        print("Source:", r.metadata.get("source", "Unknown"))
#        print("-" * 60)