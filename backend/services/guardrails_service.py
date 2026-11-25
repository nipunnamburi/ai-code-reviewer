"""
Guardrails AI Service
Validates LLM-generated code reviews, DSA complexity metrics, and issue schemas.
Guarantees schema compliance and clean formatting for the frontend Monaco/diff views.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional, Literal
from pydantic import BaseModel, Field

# Disable OTEL default telemetry exporter from Guardrails if not configured
if not os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"):
    os.environ["OTEL_SDK_DISABLED"] = "true"

from guardrails import Guard

logger = logging.getLogger(__name__)

class ComplexitySchema(BaseModel):
    time: str = Field(description="Time complexity, e.g. O(n^2)")
    space: str = Field(description="Space complexity, e.g. O(n)")
    bottleneck: str = Field(description="Specific loop, function or recursion causing the bottleneck")
    targetComplexity: str = Field(description="Target optimized time complexity, e.g. O(n + m)")
    explanation: str = Field(description="Detailed DSA explanation and optimization roadmap")

class IssueSchema(BaseModel):
    id: str = Field(description="Unique issue identifier")
    line: Optional[int] = Field(default=None, description="1-indexed line number in source code where the issue exists")
    severity: Literal["critical", "warning", "optimization", "info"] = Field(
        description="Severity level of the finding"
    )
    category: str = Field(
        description="Category: Security, Performance / DSA, Bug, or Maintainability"
    )
    title: str = Field(description="Concise issue title")
    description: str = Field(description="Detailed finding explanation")
    originalSnippet: str = Field(default="", description="Code snippet containing the issue")
    suggestedSnippet: str = Field(default="", description="Fixed / secure replacement code snippet")
    explanation: str = Field(description="Justification for the recommendation")

class CodeReviewOutputSchema(BaseModel):
    summary: str = Field(description="1-3 sentence executive code health summary")
    complexity: ComplexitySchema = Field(description="DSA Big-O complexity breakdown")
    issues: List[IssueSchema] = Field(default_factory=list, description="List of detected code issues")
    refactoredCode: str = Field(description="Complete refactored and secured code")
    unitTests: str = Field(description="Complete unit test suite runnable with pytest or test runner")
    explanation: str = Field(description="Architectural breakdown of refactoring")


# Build Guardrails Guard
review_guard = Guard.for_pydantic(output_class=CodeReviewOutputSchema)


def validate_review_output(raw_output: str | dict) -> Dict[str, Any]:
    """
    Validates output using Guardrails AI.
    If parsing succeeds, returns validated dict.
    If parsing fails, falls back gracefully to standard Pydantic model validation.
    """
    try:
        input_str = json.dumps(raw_output) if isinstance(raw_output, dict) else str(raw_output)
        res = review_guard.parse(input_str)
        if res.validated_output:
            return res.validated_output
    except Exception as e:
        logger.warning(f"Guardrails AI parsing warning: {e}. Falling back to Pydantic validation.")

    # Fallback validation directly via Pydantic model
    if isinstance(raw_output, str):
        validated = CodeReviewOutputSchema.model_validate_json(raw_output)
    else:
        validated = CodeReviewOutputSchema.model_validate(raw_output)
    return validated.model_dump()
