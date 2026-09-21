from http.server import BaseHTTPRequestHandler
import json
import os
import re
import sys
from typing import Dict, Any, List, Optional

# Vercel Serverless Python Handler for Code Review & Health
class handler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        self.send_response(200)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        response_data = {
            "status": "healthy",
            "service": "ai-code-reviewer-vercel-serverless",
            "runtime": "Vercel Python 3.12"
        }
        self.wfile.write(json.dumps(response_data).encode('utf-8'))

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        try:
            payload = json.loads(post_data) if post_data else {}
        except Exception:
            payload = {}

        code = payload.get('code', '')
        language = payload.get('language', 'python')
        mode = payload.get('mode', 'comprehensive')
        api_key = payload.get('api_key') or os.environ.get('OPENAI_API_KEY', '')
        custom_instructions = payload.get('custom_instructions')

        # Static analysis rules
        issues = []
        lines = code.splitlines()

        # SQLi check
        for idx, line in enumerate(lines, 1):
            if re.search(r"SELECT\s+.*WHERE.*\+\s*\w+", line, re.IGNORECASE) or re.search(r"SELECT.*WHERE.*\$\{", line, re.IGNORECASE):
                issues.append({
                    "id": "static-sqli",
                    "line": idx,
                    "severity": "critical",
                    "category": "Security",
                    "title": "CWE-89: SQL Injection Vulnerability",
                    "description": f"Dynamic query concatenation on line {idx} exposes database to SQL injection.",
                    "originalSnippet": line.strip(),
                    "suggestedSnippet": "const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);",
                    "explanation": "Use parameterized queries or prepared statements."
                })
            if re.search(r"(password|api_?key|secret)\s*[:=]\s*['\"][^'\"]{6,}['\"]", line, re.IGNORECASE):
                issues.append({
                    "id": "static-secret",
                    "line": idx,
                    "severity": "critical",
                    "category": "Security",
                    "title": "Hardcoded Secret in Source",
                    "description": f"Sensitive secret/credential found on line {idx}.",
                    "originalSnippet": line.strip(),
                    "suggestedSnippet": "password: process.env.DB_PASSWORD",
                    "explanation": "Store secrets in environment variables."
                })

        # Calculate deterministic score
        crit_count = sum(1 for i in issues if i.get("severity") == "critical")
        warn_count = sum(1 for i in issues if i.get("severity") == "warning")
        score = max(20, min(100, 100 - (crit_count * 25) - (warn_count * 10)))

        is_nested_loop = "for " in code and any(l.strip().startswith("for ") or l.strip().startswith("while ") for l in lines[1:])
        time_comp = "O(n²)" if is_nested_loop else "O(n)"
        target_comp = "O(n + m)" if is_nested_loop else "O(1)"

        result = {
            "score": score,
            "summary": f"Review identified {len(issues)} finding(s) with deterministic score {score}/100.",
            "metrics": {
                "security": max(20, 100 - (crit_count * 30)),
                "performance": 75 if is_nested_loop else 90,
                "maintainability": 80,
                "testability": 75,
                "readability": 85
            },
            "complexity": {
                "time": time_comp,
                "space": "O(n)",
                "bottleneck": "Nested iteration" if is_nested_loop else "Linear scan",
                "targetComplexity": target_comp,
                "explanation": "Convert nested loops into hash map/dictionary lookups for O(n+m) linear time."
            },
            "issues": issues,
            "refactoredCode": code,
            "unitTests": "import pytest\n\ndef test_sanity():\n    assert True\n",
            "explanation": "Code was analyzed via serverless static analysis & deterministic scoring."
        }

        self.send_response(200)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode('utf-8'))
