import asyncio
from backend.analyzers.ast_analyzer import analyze_code_static
from backend.services.llm_service import review_code_with_llm, handle_conversational_chat
from backend.services.guardrails_service import validate_review_output, CodeReviewOutputSchema

def test_guardrails_validation_schema():
    raw_payload = {
        "summary": "Valid code structure with minor issues.",
        "complexity": {
            "time": "O(n)",
            "space": "O(1)",
            "bottleneck": "None",
            "targetComplexity": "O(n)",
            "explanation": "Linear single iteration."
        },
        "issues": [
            {
                "id": "test-issue-1",
                "line": 10,
                "severity": "warning",
                "category": "Maintainability",
                "title": "Unused variable",
                "description": "Variable is declared but never referenced.",
                "originalSnippet": "x = 10",
                "suggestedSnippet": "# removed x",
                "explanation": "Cleans up namespace."
            }
        ],
        "refactoredCode": "def foo():\n    return 42",
        "unitTests": "def test_foo():\n    assert foo() == 42",
        "explanation": "Simplified code"
    }
    validated = validate_review_output(raw_payload)
    assert validated["summary"] == raw_payload["summary"]
    assert len(validated["issues"]) == 1
    assert validated["issues"][0]["severity"] == "warning"

def test_review_code_with_guardrails_and_langsmith():
    sample_code = """
def sample_func(items):
    total = 0
    for i in items:
        total += i
    return total
"""
    static_analysis = analyze_code_static(sample_code, "python")
    result = asyncio.run(review_code_with_llm(sample_code, "python", "comprehensive", static_analysis))
    assert "summary" in result
    assert "complexity" in result
    assert "score" in result
    assert "issues" in result
