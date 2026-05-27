from dotenv import load_dotenv
from langchain_groq import ChatGroq
from vector_store import load_db

load_dotenv()


def get_retriever(k=4):
    db = load_db()

    if db is None:
        raise Exception("FAISS index not found. Add a document first.")

    return db.as_retriever(
        search_type="similarity",
        search_kwargs={"k": k}
    )


def ask_question(query):
    retriever = get_retriever()
    docs = retriever.invoke(query)

    context = "\n\n".join([doc.page_content for doc in docs])

    llm = ChatGroq(
        model_name="llama-3.1-8b-instant",
        temperature=0
    )

    prompt = f"""
You are a financial research assistant.

Use ONLY the context below to answer.

Context:
{context}

Question:
{query}

Answer clearly and concisely.
"""

    response = llm.invoke(prompt)

    return response.content


#if __name__ == "__main__":
#    question = "What are the major financial highlights?"
#    print(ask_question(question))