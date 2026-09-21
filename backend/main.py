"""
FastAPI Backend Application
Hybrid AI + Static Analysis Code Review System
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

from backend.analyzers.ast_analyzer import analyze_code_static
from backend.services.llm_service import review_code_with_llm, handle_conversational_chat
from backend.services.test_runner import run_python_tests
from backend.services.github_service import fetch_github_pr_files

app = FastAPI(
    title="Hybrid AI + Static Analysis Code Reviewer API",
    version="2.0.0",
    description="Full-stack code review, AST static analysis, DSA complexity profiler, and Python test runner"
)

# Allow React Frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class ReviewRequest(BaseModel):
    code: str
    language: str = "python"
    mode: str = "comprehensive"
    api_key: Optional[str] = None
    custom_instructions: Optional[str] = None

class TestRunRequest(BaseModel):
    code: str
    test_code: str
    language: str = "python"

class ChatRequest(BaseModel):
    question: str
    context_code: str
    issue_context: Optional[Dict[str, Any]] = None
    api_key: Optional[str] = None

class GitHubPRRequest(BaseModel):
    pr_url: str

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-code-reviewer-backend",
        "engine": "FastAPI + Python AST + Pytest + LLM"
    }

@app.post("/api/review")
async def review_code(req: ReviewRequest):
    """
    Hybrid review pipeline:
    1. Static AST / Linter Analysis
    2. LLM deep review with static findings context
    3. Deterministic score aggregation
    """
    if not req.code or not req.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty.")

    # 1. Run static analysis
    static_results = analyze_code_static(req.code, req.language)

    # 2. Run LLM review augmented with static findings
    review_output = await review_code_with_llm(
        code=req.code,
        language=req.language,
        mode=req.mode,
        static_analysis=static_results,
        api_key=req.api_key,
        custom_instructions=req.custom_instructions
    )

    return review_output

@app.post("/api/run-tests")
async def run_tests(req: TestRunRequest):
    """
    Executes code and test suite in an isolated test runner sandbox.
    """
    if not req.code.strip():
        raise HTTPException(status_code=400, detail="Source code cannot be empty.")
    if not req.test_code.strip():
        raise HTTPException(status_code=400, detail="Test code cannot be empty.")

    results = run_python_tests(code=req.code, test_code=req.test_code)
    return results

@app.post("/api/chat")
async def chat_followup(req: ChatRequest):
    """
    Handles conversational follow-up questions regarding specific findings.
    """
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    answer = await handle_conversational_chat(
        question=req.question,
        context_code=req.context_code,
        issue_context=req.issue_context,
        api_key=req.api_key
    )
    return {"answer": answer}

@app.post("/api/github-pr")
async def import_github_pr(req: GitHubPRRequest):
    """
    Fetches changed files from a public GitHub Pull Request URL.
    """
    try:
        data = await fetch_github_pr_files(req.pr_url)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
