import asyncio
import pytest
from backend.models.review import ReviewComment, CodeReviewReport, ScorecardPillar
from backend.services.reviewer import clamp_line_bounds, run_pass1_ast_and_diff, generate_offline_report, stream_review_pipeline
from backend.services.test_runner import run_sandboxed_tests

def test_line_bounds_clamping():
    comments = [
        ReviewComment(
            id="c1",
            file_path="foo.py",
            start_line=0,  # Below 1
            end_line=150,  # Far above total_lines (10)
            severity="critical",
            title="Out of bounds",
            suggestion="Fix it",
            confidence=0.9
        ),
        ReviewComment(
            id="c2",
            file_path="foo.py",
            start_line=3,
            end_line=5,
            severity="warning",
            title="Valid range",
            suggestion="Fix it",
            confidence=0.95
        ),
        ReviewComment(
            id="c3",
            file_path="foo.py",
            start_line=2,
            end_line=2,
            severity="info",
            title="Low confidence",
            suggestion="Fix it",
            confidence=0.4  # < 0.65, should be filtered
        )
    ]

    clamped = clamp_line_bounds(comments, total_lines=10)
    assert len(clamped) == 2  # c3 dropped
    assert clamped[0].start_line == 1
    assert clamped[0].end_line == 10
    assert clamped[1].start_line == 3
    assert clamped[1].end_line == 5

def test_ast_pass1_detection():
    sample = """
def bad_func():
    eval("2 + 2")
    try:
        x = 1
    except:
        pass
    for i in range(10):
        for j in range(10):
            print(i, j)
"""
    res = run_pass1_ast_and_diff(sample, "python")
    assert res["has_nested_loops"] is True
    assert "eval" in res["dangerous_calls"]
    severities = [f["severity"] for f in res["findings"]]
    assert "critical" in severities
    assert "warning" in severities
    assert "optimization" in severities

def test_offline_fallback_report():
    sample = "def hello():\n    eval('1')\n"
    pass1 = run_pass1_ast_and_diff(sample, "python")
    report = generate_offline_report(sample, "python", "test.py", pass1)
    
    assert isinstance(report, CodeReviewReport)
    assert report.overall_score >= 0.0 and report.overall_score <= 10.0
    assert len(report.pillars) == 4
    pillar_names = [p.name for p in report.pillars]
    assert "Code Quality" in pillar_names
    assert "Originality" in pillar_names
    assert "Completeness" in pillar_names
    assert "Docs" in pillar_names

def test_sse_event_formatting():
    async def run_stream():
        events = []
        async for chunk in stream_review_pipeline("x = 1\n", "python", "snippet.py"):
            events.append(chunk)
        return events

    chunks = asyncio.run(run_stream())
    event_names = [c["event"] for c in chunks]
    assert "progress" in event_names
    assert "complete" in event_names
    
    progress_steps = [c["data"].get("step") for c in chunks if c["event"] == "progress"]
    assert "reading" in progress_steps
    assert "ast" in progress_steps
    assert "deep_review" in progress_steps
    assert "reflection" in progress_steps

def test_sandboxed_test_runner():
    target = "def add(a, b):\n    return a + b\n"
    test_code = "from solution import add\ndef test_add():\n    assert add(1, 2) == 3\n"
    res = run_sandboxed_tests(test_code, target)
    assert res["success"] is True
    assert res["total_passed"] == 1
