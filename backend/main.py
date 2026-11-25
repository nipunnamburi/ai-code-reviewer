"""
FastAPI Backend Application
Dual-mode runtime supporting both local uvicorn and Vercel serverless.
"""

import json
import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.services.reviewer import stream_review_pipeline, run_pass1_ast_and_diff, generate_offline_report
from backend.services.test_runner import run_sandboxed_tests
from backend.services.github_service import fetch_github_pr_files

app = FastAPI(
    title="Editorial AI Code Reviewer API",
    version="3.0.0",
    description="Dual-mode hybrid code review engine with 4-pillar scorecard and line-bounded Monaco diff integration"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ReviewStreamRequest(BaseModel):
    code: str
    language: str = "python"
    target_name: str = "snippet.py"
    api_key: Optional[str] = None
    model: str = "gemini-3.8-flash"

class TestExecutionRequest(BaseModel):
    code: str
    test_code: str
    filename: str = "solution.py"

class GitHubFetchRequest(BaseModel):
    pr_url: str

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-code-reviewer-backend",
        "dual_mode": True,
        "engine": "google-genai + AST + FastMCP"
    }

@app.post("/api/review/stream")
async def stream_review(req: ReviewStreamRequest):
    """
    Streams SSE events for real-time file reading, AST analysis,
    deep review, and line-bounds reflection.
    """
    if not req.code or not req.code.strip():
        raise HTTPException(status_code=400, detail="Code cannot be empty.")

    async def event_generator():
        try:
            async for chunk in stream_review_pipeline(
                code=req.code,
                language=req.language,
                target_name=req.target_name,
                api_key=req.api_key,
                model_choice=req.model
            ):
                event_name = chunk.get("event", "message")
                data_str = json.dumps(chunk.get("data", {}))
                yield f"event: {event_name}\ndata: {data_str}\n\n"
        except Exception as e:
            err_data = json.dumps({"error": str(e)})
            yield f"event: error\ndata: {err_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@app.post("/api/tests/run")
async def execute_tests(req: TestExecutionRequest):
    return run_sandboxed_tests(req.test_code, req.code, req.filename)

@app.post("/api/github/pr")
async def fetch_github_pr(req: GitHubFetchRequest):
    res = await fetch_github_pr_files(req.pr_url)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res
