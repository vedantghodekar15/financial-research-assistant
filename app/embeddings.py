from langchain_huggingface import HuggingFaceEmbeddings
from chunking import chunk_documents


def generate_embeddings(filename):
    chunks = chunk_documents(filename)

    embedding_model = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        model_kwargs={"device": "cpu"}
    )

    vectors = embedding_model.embed_documents(
        [chunk.page_content for chunk in chunks]
    )

    return vectors


