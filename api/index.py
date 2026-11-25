"""
Vercel Serverless Python entry point.
Provides dual-mode compatibility for Vercel Hobby / Free deployments
without writing outside /tmp.
"""

from http.server import BaseHTTPRequestHandler
import json
import os
import sys

# Ensure backend modules can be imported
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


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
            "runtime": "Vercel Python Serverless",
            "dual_mode": True
        }
        self.wfile.write(json.dumps(response_data).encode('utf-8'))

    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            payload = json.loads(post_data) if post_data else {}

            if self.path.endswith('/github/pr'):
                import asyncio
                from backend.services.github_service import fetch_github_pr_files
                pr_url = payload.get('pr_url', '')
                res = asyncio.run(fetch_github_pr_files(pr_url))
                if "error" in res:
                    self.send_response(400)
                    self._send_cors_headers()
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({"detail": res["error"]}).encode('utf-8'))
                    return
                self.send_response(200)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(res).encode('utf-8'))
                return

            code = payload.get('code', '')
            language = payload.get('language', 'python')
            target_name = payload.get('target_name', 'snippet.py')

            if not code or not code.strip():
                self.send_response(400)
                self._send_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"detail": "Code cannot be empty."}).encode('utf-8'))
                return

            from backend.services.reviewer import run_pass1_ast_and_diff, generate_offline_report

            pass1 = run_pass1_ast_and_diff(code, language)
            report = generate_offline_report(code, language, target_name, pass1)
            report_dict = report.model_dump()

            if self.path.endswith('/stream'):
                self.send_response(200)
                self._send_cors_headers()
                self.send_header('Content-Type', 'text/event-stream')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()

                events = [
                    ("progress", {"step": "reading", "file": target_name, "detail": f"Reading {len(code.splitlines())} lines of {language}..."}),
                    ("progress", {"step": "ast", "detail": f"Checked AST complexity & security smells. Found {len(pass1['findings'])} initial signal(s)."}),
                    ("progress", {"step": "deep_review", "detail": "Evaluating architecture & 4-pillar scorecard..."}),
                    ("progress", {"step": "reflection", "detail": f"Verified line bounds & filtered low-confidence findings. Retained {len(report_dict['comments'])} finding(s)."}),
                    ("complete", report_dict),
                ]
                for event_name, data in events:
                    chunk = f"event: {event_name}\ndata: {json.dumps(data)}\n\n"
                    self.wfile.write(chunk.encode('utf-8'))
                return

            self.send_response(200)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(report_dict).encode('utf-8'))

        except Exception as e:
            self.send_response(500)
            self._send_cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
