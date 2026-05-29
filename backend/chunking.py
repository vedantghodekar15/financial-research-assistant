from langchain_text_splitters import RecursiveCharacterTextSplitter
from document_loader import load_pdf


def chunk_documents(filename):
    docs = load_pdf(filename)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = splitter.split_documents(docs)

    return chunks


