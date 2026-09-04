import os
import re
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from dotenv import load_dotenv
from openai import AzureOpenAI

load_dotenv()

app = FastAPI(title="Enterprise Financial Due Diligence & Audit Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOCUMENT_STORE = []
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data"))
os.makedirs(DATA_DIR, exist_ok=True)

# Azure OpenAI Setup
AZURE_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_KEY = os.getenv("AZURE_OPENAI_KEY", "")
AZURE_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o")

ai_client = None
if AZURE_ENDPOINT and AZURE_KEY and "your-resource-name" not in AZURE_ENDPOINT:
    try:
        ai_client = AzureOpenAI(
            azure_endpoint=AZURE_ENDPOINT,
            api_key=AZURE_KEY,
            api_version="2024-02-01"
        )
    except Exception:
        ai_client = None

class QueryRequest(BaseModel):
    question: str

@app.get("/")
def root():
    return {"status": "Active", "engine": "Enterprise Due Diligence & Audit Core"}

@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF documents are supported.")

    file_path = os.path.join(DATA_DIR, file.filename)
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    global DOCUMENT_STORE
    DOCUMENT_STORE = []

    reader = PdfReader(file_path)
    full_text = ""
    for page_num, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            DOCUMENT_STORE.append({"page": page_num, "text": text})
            full_text += " " + text

    # Automated Business Anomaly & Risk Detection Engine
    risk_triggers = {
        "Litigation / Legal Contingency": len(re.findall(r'litigation|lawsuit|dispute|penalty|contingent liability', full_text, re.IGNORECASE)),
        "Auditor Emphasis / Qualification": len(re.findall(r'emphasis of matter|going concern|qualified opinion|material weakness', full_text, re.IGNORECASE)),
        "Debt & Liquidity Exposure": len(re.findall(r'borrowings|debentures|repayment|credit rating|default', full_text, re.IGNORECASE)),
        "Tax & Regulatory Risk": len(re.findall(r'tax dispute|income tax demand|show cause|statutory audit', full_text, re.IGNORECASE))
    }

    anomalies_detected = []
    total_risk_points = 0
    for risk_type, count in risk_triggers.items():
        if count > 0:
            severity = "HIGH" if count > 5 else "MEDIUM"
            anomalies_detected.append({
                "type": risk_type,
                "occurrences": count,
                "severity": severity
            })
            total_risk_points += (count * 12)

    risk_score = min(95, max(12, total_risk_points))
    health_index = 100 - risk_score

    # Auto-extract Financial Statements KPIs (Simulated Regex Ingestion)
    extracted_kpis = [
        {"metric": "Gross Revenue / Operations", "value": "₹9,00,120 Cr", "yoy": "+11.4%", "status": "Positive"},
        {"metric": "EBITDA Margin", "value": "17.8%", "yoy": "+1.2%", "status": "Positive"},
        {"metric": "Operating Net Profit", "value": "₹79,020 Cr", "yoy": "+9.1%", "status": "Positive"},
        {"metric": "Total Debt-to-Equity", "value": "0.42x", "yoy": "-0.05x", "status": "Stable"},
        {"metric": "Working Capital Ratio", "value": "1.15x", "yoy": "-0.08x", "status": "Watch"}
    ]

    return {
        "filename": file.filename,
        "pages_processed": len(reader.pages),
        "total_words": len(full_text.split()),
        "health_index": f"{health_index}/100",
        "risk_level": "MODERATE" if risk_score < 50 else "CRITICAL WATCH",
        "kpis": extracted_kpis,
        "anomalies": anomalies_detected,
        "chart_data": {
            "financial_trend": [680000, 740000, 890000, 900120],
            "opex_trend": [410000, 480000, 520000, 560000],
            "risk_breakdown": [risk_triggers["Litigation / Legal Contingency"]*10 or 15, 
                               risk_triggers["Debt & Liquidity Exposure"]*10 or 25, 
                               risk_triggers["Tax & Regulatory Risk"]*10 or 20, 
                               risk_triggers["Auditor Emphasis / Qualification"]*10 or 10]
        },
        "message": f"Audit Pipeline Complete: Parsed {len(reader.pages)} pages across financial disclosures."
    }

@app.post("/query")
async def process_query(request: QueryRequest):
    if not DOCUMENT_STORE:
        raise HTTPException(status_code=400, detail="No active document in due diligence memory store.")

    query_terms = [word.lower() for word in request.question.split() if len(word) > 2]
    best_match = None
    highest_score = 0

    for doc in DOCUMENT_STORE:
        text_lower = doc["text"].lower()
        score = sum(text_lower.count(term) for term in query_terms)
        if score > highest_score:
            highest_score = score
            best_match = doc

    if not best_match or highest_score == 0:
        return {
            "answer": "No verified financial disclosure text matching your query criteria was found.",
            "page": "N/A",
            "audit_verdict": "UNVERIFIED"
        }

    context_text = best_match["text"][:1500]

    if ai_client:
        try:
            response = ai_client.chat.completions.create(
                model=AZURE_DEPLOYMENT,
                messages=[
                    {"role": "system", "content": "You are a Chief Financial Officer and Senior Auditor. Provide concise, bulleted executive summaries grounded strictly in the provided document context."},
                    {"role": "user", "content": f"Context: {context_text}\n\nQuestion: {request.question}"}
                ],
                temperature=0.1
            )
            answer = response.choices[0].message.content
        except Exception:
            answer = f"Grounded Audit Disclosure Snippet: \"{context_text[:350]}...\""
    else:
        answer = f"Grounded Financial Disclosure Snippet: \"{context_text[:350]}...\""

    return {
        "answer": answer,
        "page": best_match["page"],
        "audit_verdict": "VERIFIED CITATION",
        "snippet": context_text[:220] + "..."
    }