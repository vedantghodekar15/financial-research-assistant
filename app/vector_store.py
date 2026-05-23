from langchain_community.vectorstores import FAISS
from embeddings import generate_embeddings
from chunking import chunk_documents


def create_faiss_index(pdf_path):
    chunks = chunk_documents(pdf_path)

    texts = [chunk.page_content for chunk in chunks]

    # get embeddings model (same as Milestone 3)
    from langchain_huggingface import HuggingFaceEmbeddings

    embedding_model = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    # create FAISS index
    db = FAISS.from_texts(texts, embedding_model)

    # save locally
    db.save_local("vectorstore")

    print("FAISS index created and saved!")


def load_faiss_index():
    from langchain_huggingface import HuggingFaceEmbeddings

    embedding_model = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    db = FAISS.load_local(
        "vectorstore",
        embedding_model,
        allow_dangerous_deserialization=True
    )

    return db

# if __name__ == "__main__":
#     create_faiss_index("RIL-IAR-2025.pdf")
#     db = load_faiss_index()
#     results = db.similarity_search("revenue growth", k=3)
#     for r in results:
#         print(r.page_content[:300])