from dotenv import load_dotenv
from langchain_groq import ChatGroq
from vector_store import load_db

load_dotenv()


def get_llm():
    return ChatGroq(
        model_name="llama-3.1-8b-instant",
        temperature=0
    )


def summarize_report():

    db = load_db()

    if db is None:
        raise Exception(
            "FAISS index not found. Add a document first."
        )

    # Retrieve most relevant chunks for summary
    retriever = db.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 6}
    )

    docs = retriever.invoke(
        "financial performance revenue risks business segments annual report summary"
    )

    context = "\n\n".join(
        [doc.page_content for doc in docs]
    )

    llm = get_llm()

    prompt = f"""
You are a financial analyst.

Use ONLY the report context.

Do NOT make assumptions or infer facts.

Generate a concise report summary with:

1. Revenue trend
2. Financial performance
3. Major business segments
4. Explicitly mentioned risk factors
5. Key highlights

Context:
{context}

Summary:
"""

    response = llm.invoke(prompt)

    return response.content


#if __name__ == "__main__":
#    print(summarize_report())