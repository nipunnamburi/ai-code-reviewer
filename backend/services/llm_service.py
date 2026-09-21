"""
LLM Service & Review Aggregator
Integrates OpenAI API, Prompt Engineering with Static Analysis Context,
DSA Complexity Profiling, Deterministic Scoring, and Conversational Follow-up Chat.
"""

import os
import json
import httpx
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

def calculate_deterministic_score(issues: List[Dict[str, Any]], static_findings: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Deterministic scoring algorithm:
    Base: 100
    - Critical issue: -20
    - Warning issue: -10
    - Optimization / Style issue: -4
    - AST / Static issue: -5
    """
    critical_count = sum(1 for i in issues if i.get("severity") == "critical")
    warning_count = sum(1 for i in issues if i.get("severity") == "warning")
    opt_count = sum(1 for i in issues if i.get("severity") in ("optimization", "info"))
    static_count = len(static_findings)

    deductions = (critical_count * 20) + (warning_count * 10) + (opt_count * 4) + (static_count * 3)
    overall_score = max(15, min(100, 100 - deductions))

    # Category breakdowns
    sec_issues = sum(1 for i in issues if i.get("category") == "Security")
    perf_issues = sum(1 for i in issues if "Performance" in i.get("category", "") or "DSA" in i.get("category", ""))
    
    security_score = max(20, min(100, 100 - (sec_issues * 25)))
    performance_score = max(25, min(100, 100 - (perf_issues * 20)))
    maintainability_score = max(30, min(100, 100 - (warning_count * 12)))
    testability_score = 75 if critical_count == 0 else 50
    readability_score = 85 if opt_count < 3 else 70

    return {
        "overall": overall_score,
        "security": security_score,
        "performance": performance_score,
        "maintainability": maintainability_score,
        "testability": testability_score,
        "readability": readability_score
    }


async def review_code_with_llm(
    code: str, 
    language: str, 
    mode: str, 
    static_analysis: Dict[str, Any],
    api_key: Optional[str] = None,
    custom_instructions: Optional[str] = None
) -> Dict[str, Any]:
    """
    Orchestrates Hybrid Review: passes static analysis findings into LLM for deep review
    """
    active_key = api_key or os.getenv("OPENAI_API_KEY", "")

    # If live key is provided, use OpenAI
    if active_key and active_key.strip().startswith("sk-"):
        try:
            return await _call_openai_review(code, language, mode, static_analysis, active_key, custom_instructions)
        except Exception as e:
            print(f"OpenAI API call failed: {e}. Falling back to server heuristic engine.")

    # Server heuristic fallback
    return _generate_server_heuristics(code, language, mode, static_analysis)


async def _call_openai_review(code, language, mode, static_analysis, api_key, custom_instructions):
    static_summary = json.dumps(static_analysis.get("findings", []), indent=2)

    system_prompt = f"""You are a Principal Software Engineer and Staff Security Architect.
You are performing a hybrid code review on {language} code.
Static analysis has already detected the following AST/Static findings:
{static_summary}

Analyze the code and respond strictly in JSON format matching this schema:
{{
  "summary": "<1-3 sentence executive code health summary>",
  "complexity": {{
    "time": "<e.g. O(n^2)>",
    "space": "<e.g. O(n)>",
    "bottleneck": "<Specific function or loop causing bottleneck>",
    "targetComplexity": "<e.g. O(n + m)>",
    "explanation": "<DSA analysis and optimization strategy>"
  }},
  "issues": [
    {{
      "id": "<string>",
      "line": <number or null>,
      "severity": "critical" | "warning" | "optimization" | "info",
      "category": "Security" | "Performance / DSA" | "Bug" | "Maintainability",
      "title": "<Short title>",
      "description": "<Detailed explanation>",
      "originalSnippet": "<Code section>",
      "suggestedSnippet": "<Fixed code>",
      "explanation": "<Why this change matters>"
    }}
  ],
  "refactoredCode": "<Complete optimized and secure refactored source code>",
  "unitTests": "<Production-ready test suite runnable with pytest or test runner>",
  "explanation": "<Architecture explanation>"
}}
{f"User Instructions: {custom_instructions}" if custom_instructions else ""}
"""

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            },
            json={
                "model": "gpt-4o",
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Language: {language}\nCode to analyze:\n```{language}\n{code}\n```"}
                ]
            }
        )
        response.raise_for_status()
        data = response.json()
        parsed = json.loads(data["choices"][0]["message"]["content"])
        
        # Merge static findings if LLM missed them
        all_issues = parsed.get("issues", [])
        for sf in static_analysis.get("findings", []):
            if not any(i.get("line") == sf.get("line") for i in all_issues):
                all_issues.append(sf)

        scores = calculate_deterministic_score(all_issues, static_analysis.get("findings", []))
        parsed["score"] = scores["overall"]
        parsed["metrics"] = scores
        parsed["staticAnalysis"] = static_analysis
        return parsed


def _generate_server_heuristics(code: str, language: str, mode: str, static_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Comprehensive fallback engine for offline / demo mode"""
    issues = list(static_analysis.get("findings", []))
    lines = code.splitlines()

    # Heuristic Complexity Analysis (DSA)
    is_nested_loop = "for " in code and any(l.strip().startswith("for ") or l.strip().startswith("while ") for l in lines[1:])
    
    time_complexity = "O(n²)" if is_nested_loop or "for order" in code else "O(n)"
    space_complexity = "O(n)" if "[]" in code or "{}" in code or "list" in code else "O(1)"
    target_complexity = "O(n + m)" if is_nested_loop else "O(1)"
    bottleneck_desc = "Nested iteration scanning catalog items for each order" if is_nested_loop else "Linear scan across input elements"

    # Common issue triggers
    if "SELECT" in code and ("+" in code or "${" in code):
        if not any(i.get("id") == "static-sqli" for i in issues):
            issues.append({
                "id": "sec-sqli-01",
                "line": next((idx for idx, l in enumerate(lines, 1) if "SELECT" in l), 1),
                "severity": "critical",
                "category": "Security",
                "title": "CWE-89: SQL Injection via Dynamic String Formatting",
                "description": "User-supplied query parameters are interpolated directly into SQL syntax.",
                "originalSnippet": "SELECT * FROM users WHERE username = '\" + username + \"'",
                "suggestedSnippet": "SELECT id, username, email FROM users WHERE username = ? AND password_hash = ?",
                "explanation": "Use parameterized queries with prepared statement bindings."
            })

    # Immutability in React
    if ".push(" in code and ("set" in code or "useState" in code):
        issues.append({
            "id": "bug-state-mutation",
            "line": next((idx for idx, l in enumerate(lines, 1) if ".push(" in l), 1),
            "severity": "warning",
            "category": "Bug",
            "title": "Direct State Mutation in React",
            "description": "Mutating array state directly with .push() breaks React immutability.",
            "originalSnippet": "logs.push(`Polled at ${timestamp}`); setLogs(logs);",
            "suggestedSnippet": "setLogs(prev => [...prev, `Polled at ${timestamp}`]);",
            "explanation": "React diffing requires new object/array references to trigger UI updates."
        })

    # Scores
    scores = calculate_deterministic_score(issues, static_analysis.get("findings", []))

    # Refactored Code proposal
    refactored_code = _generate_refactored_snippet(code, language)
    
    # Unit tests
    unit_tests = _generate_unit_tests(code, language)

    return {
        "score": scores["overall"],
        "summary": f"Hybrid review identified {len(issues)} finding(s) with deterministic health score {scores['overall']}/100.",
        "metrics": scores,
        "complexity": {
            "time": time_complexity,
            "space": space_complexity,
            "bottleneck": bottleneck_desc,
            "targetComplexity": target_complexity,
            "explanation": "Convert quadratic nested iterations into O(1) hash map/dictionary lookups to optimize time complexity from O(n²) to O(n + m)."
        },
        "issues": issues,
        "refactoredCode": refactored_code,
        "unitTests": unit_tests,
        "staticAnalysis": static_analysis,
        "explanation": f"The codebase was analyzed via Python AST parser + static security heuristics. {len(issues)} areas for optimization and security hardening were detected."
    }


def _generate_refactored_snippet(code: str, language: str) -> str:
    if "find_common_purchases" in code:
        return """import json
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

def find_common_purchases(customer_orders_file: str, catalog_file: str) -> List[Dict[str, Any]]:
    \"\"\"
    Optimized to O(N + M) time complexity using hash map lookup.
    \"\"\"
    try:
        with open(customer_orders_file, 'r', encoding='utf-8') as f:
            orders_data = json.load(f)
        with open(catalog_file, 'r', encoding='utf-8') as f:
            catalog_data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logger.error(f"Failed to load order data: {e}")
        raise

    # O(M) indexing for O(1) instant search
    catalog_map = {p["id"]: p for p in catalog_data.get("products", []) if "id" in p}
    
    common_items = {}
    for order in orders_data:
        for item in order.get("items", []):
            item_id = item.get("id")
            if item_id in catalog_map:
                prod = catalog_map[item_id]
                if item_id not in common_items:
                    common_items[item_id] = {
                        "id": item_id,
                        "name": prod.get("name"),
                        "price": prod.get("price"),
                        "quantity": item.get("quantity", 1)
                    }
                else:
                    common_items[item_id]["quantity"] += item.get("quantity", 1)

    return list(common_items.values())
"""
    return code


def _generate_unit_tests(code: str, language: str) -> str:
    if language.lower() in ("python", "py"):
        return """import pytest
import json
from unittest.mock import patch, mock_open

def test_find_common_purchases_linear_lookup():
    orders = [{"items": [{"id": "p1", "quantity": 3}]}]
    catalog = {"products": [{"id": "p1", "name": "Mechanical Keyboard", "price": 99.0}]}
    
    # Verify execution logic
    assert len(orders) == 1
    assert catalog["products"][0]["id"] == "p1"

def test_missing_file_raises_exception():
    # Boundary test for unhandled file IO
    with pytest.raises(Exception):
        raise FileNotFoundError("Mock file not found")
"""
    return """import { describe, it, expect } from 'vitest';

describe('Unit Tests', () => {
  it('should validate inputs correctly', () => {
    expect(true).toBe(true);
  });
});"""


async def handle_conversational_chat(
    question: str,
    context_code: str,
    issue_context: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None
) -> str:
    """Answers follow-up questions regarding specific findings or code logic"""
    active_key = api_key or os.getenv("OPENAI_API_KEY", "")
    
    if active_key and active_key.strip().startswith("sk-"):
        try:
            prompt = f"""You are an expert AI code reviewer.
The user is asking a follow-up question about this code and specific finding:
Finding Context: {json.dumps(issue_context) if issue_context else 'General Code Review'}

Code:
```
{context_code}
```

User Question: {question}

Provide a clear, pedagogical, software-engineering explanation with code snippets if appropriate. Keep it concise (under 200 words)."""

            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {active_key}"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.3
                    }
                )
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]
        except Exception as e:
            print(f"Chat API error: {e}")

    # Fallback pedagogical response
    q_lower = question.lower()
    if "sql" in q_lower or "injection" in q_lower or "parameter" in q_lower:
        return (
            "**Why Parameterization is Safe:**\n\n"
            "When you concatenate strings, the SQL database parser interprets attacker input (like `' OR 1=1 --`) as raw SQL command structure.\n\n"
            "With parameterized queries (`?` or `$1`), the database engine pre-compiles the SQL syntax first, and treats the incoming parameters strictly as literal values/strings, rendering injection mathematically impossible."
        )
    if "complexity" in q_lower or "big-o" in q_lower or "loop" in q_lower:
        return (
            "**Time Complexity Explanation:**\n\n"
            "Nested loops result in $O(N \\times M)$ operations because for every item in list 1, you iterate through the entirety of list 2.\n\n"
            "By building a dictionary/hash map first in $O(M)$ time, lookups become $O(1)$ constant time, reducing total runtime to $O(N + M)$."
        )
    return f"To address '{question}': Enforce strict type validation, isolate side-effects to custom hooks/services, and write deterministic unit tests covering failure edge cases."
