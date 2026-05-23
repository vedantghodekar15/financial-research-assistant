from pathlib import Path
from langchain_community.document_loaders import PyPDFLoader

BASE_DIR = Path(__file__).resolve().parent.parent

def load_pdf(filename):
    pdf_path = BASE_DIR / "data" / "reports" / filename
    loader = PyPDFLoader(str(pdf_path))
    return loader.load()

docs = load_pdf("RIL-IAR-2025.pdf")
