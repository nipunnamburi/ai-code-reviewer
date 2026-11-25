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

from backend.services.reviewer import run_pass1_ast_and_diff, generate_offline_report
from backend.services.test_runner import run_sandboxed_tests

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
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length).decode('utf-8')
        
        try:
            payload = json.loads(post_data) if post_data else {}
        except Exception:
            payload = {}

        code = payload.get('code', '')
        language = payload.get('language', 'python')
        target_name = payload.get('target_name', 'snippet.py')

        pass1 = run_pass1_ast_and_diff(code, language)
        report = generate_offline_report(code, language, target_name, pass1)

        self.send_response(200)
        self._send_cors_headers()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(report.model_dump()).encode('utf-8'))
