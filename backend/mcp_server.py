"""
Local FastMCP Server for Antigravity IDE Integration.
Exposes AST analysis and sandboxed test execution as local tools.
"""

from mcp.server.fastmcp import FastMCP
from backend.services.reviewer import run_pass1_ast_and_diff
from backend.services.test_runner import run_sandboxed_tests

mcp = FastMCP("ai-code-reviewer-mcp")

@mcp.tool()
def analyze_ast(code: str, language: str = "python") -> str:
    """Analyze code with AST parser to identify complexity bottlenecks and dangerous calls."""
    res = run_pass1_ast_and_diff(code, language)
    return str(res)

@mcp.tool()
def run_sandboxed_code_tests(test_code: str, target_code: str, filename: str = "solution.py") -> str:
    """Run pytest suite on target code inside a secure scrubbed /tmp environment."""
    res = run_sandboxed_tests(test_code, target_code, filename)
    return str(res)

if __name__ == "__main__":
    mcp.run()
