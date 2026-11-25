from typing import Literal, Optional, List
from pydantic import BaseModel, Field

class ReviewComment(BaseModel):
    id: str = Field(description="Unique identifier for the comment")
    file_path: str = Field(default="snippet.py", description="Target file path")
    start_line: int = Field(description="1-based starting line number")
    end_line: int = Field(description="1-based ending line number")
    severity: Literal["critical", "warning", "optimization", "info"] = Field(
        description="Severity level of the issue"
    )
    title: str = Field(description="Concise issue title")
    suggestion: str = Field(description="Actionable explanation and rationale")
    fixed_code: Optional[str] = Field(default=None, description="Proposed fixed code replacement")
    confidence: float = Field(default=0.9, ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")

class ScorecardPillar(BaseModel):
    name: Literal["Code Quality", "Originality", "Completeness", "Docs"] = Field(
        description="Pillar name"
    )
    score: float = Field(ge=0.0, le=10.0, description="Score from 0.0 to 10.0")
    verdict: str = Field(description="Concise 1-2 sentence evidence-based rationale")

class CodeReviewReport(BaseModel):
    repo_or_file_name: str = Field(default="code_snippet", description="Repository name or file name reviewed")
    summary: str = Field(description="Executive code review summary")
    overall_score: float = Field(ge=0.0, le=10.0, description="Weighted composite score out of 10.0")
    pillars: List[ScorecardPillar] = Field(description="The 4 scorecard pillars")
    comments: List[ReviewComment] = Field(default_factory=list, description="Line-level findings and recommendations")
    refactored_code: Optional[str] = Field(default=None, description="Full refactored code proposal")
