"""
AST Static Analysis Engine
Analyzes Abstract Syntax Tree (AST) for Python and static rules for JS/TS/C++
Extracts cyclomatic complexity, security violations, and anti-patterns.
"""

import ast
import re
from typing import List, Dict, Any

class SecurityAndQualityVisitor(ast.NodeVisitor):
    def __init__(self):
        self.findings = []
        self.complexity_score = 1 # Base cyclomatic complexity
        self.nested_depth = 0
        self.max_nested_depth = 0

    def generic_visit(self, node):
        super().generic_visit(node)

    def visit_For(self, node):
        self.complexity_score += 1
        self.nested_depth += 1
        self.max_nested_depth = max(self.max_nested_depth, self.nested_depth)
        
        # Check for nested loops indicating potential O(N^2)
        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.For, ast.While)):
                self.findings.append({
                    "id": "ast-nested-loop",
                    "line": node.lineno,
                    "severity": "optimization",
                    "category": "Performance / DSA",
                    "title": "Nested Loop Detected (Quadratic O(N²) Risk)",
                    "description": f"Nested loop at line {node.lineno} may result in O(N²) time complexity. Consider indexing into a dictionary/hash map or using set operations for O(N) linear time.",
                    "explanation": "Nested loops over collections result in quadratic complexity when searching or cross-referencing items."
                })
        self.generic_visit(node)
        self.nested_depth -= 1

    def visit_While(self, node):
        self.complexity_score += 1
        self.nested_depth += 1
        self.max_nested_depth = max(self.max_nested_depth, self.nested_depth)
        self.generic_visit(node)
        self.nested_depth -= 1

    def visit_If(self, node):
        self.complexity_score += 1
        self.generic_visit(node)

    def visit_ExceptHandler(self, node):
        self.complexity_score += 1
        if node.type is None:
            self.findings.append({
                "id": "ast-bare-except",
                "line": node.lineno,
                "severity": "warning",
                "category": "Bug / Quality",
                "title": "Anti-Pattern: Bare 'except:' Clause",
                "description": f"Bare 'except:' on line {node.lineno} catches all exceptions including SystemExit and KeyboardInterrupt, masking fatal runtime bugs and preventing graceful shutdown.",
                "explanation": "Always specify explicit exception classes like 'except Exception:' or 'except (ValueError, KeyError):'."
            })
        self.generic_visit(node)

    def visit_Call(self, node):
        # Detect eval() / exec()
        if isinstance(node.func, ast.Name):
            if node.func.id in ("eval", "exec"):
                self.findings.append({
                    "id": f"ast-dangerous-{node.func.id}",
                    "line": node.lineno,
                    "severity": "critical",
                    "category": "Security",
                    "title": f"CWE-95: Dangerous Use of {node.func.id}()",
                    "description": f"Executing dynamic input via {node.func.id}() allows arbitrary remote code execution (RCE).",
                    "explanation": "Avoid dynamic code execution. Use safer parsers such as ast.literal_eval() or json.loads()."
                })
            elif node.func.id == "open":
                # Check if it is within a with context
                pass
        self.generic_visit(node)


def analyze_python_ast(code: str) -> Dict[str, Any]:
    """Runs concrete Python AST analysis"""
    try:
        tree = ast.parse(code)
    except SyntaxError as err:
        return {
            "syntax_valid": False,
            "syntax_error": f"Line {err.lineno}: {err.msg}",
            "findings": [{
                "id": "syntax-error",
                "line": err.lineno,
                "severity": "critical",
                "category": "Syntax Error",
                "title": "Syntax Error in Python Source",
                "description": f"Code contains invalid Python syntax on line {err.lineno}: {err.msg}",
                "explanation": "The Python interpreter failed to parse the source code."
            }],
            "cyclomatic_complexity": 0,
            "max_nested_depth": 0
        }

    visitor = SecurityAndQualityVisitor()
    visitor.visit(tree)

    # Static checks for open() without with
    lines = code.splitlines()
    for idx, line in enumerate(lines, 1):
        if "open(" in line and not line.strip().startswith("with "):
            # Check if assigned without with
            if "=" in line and ("open(" in line):
                visitor.findings.append({
                    "id": "ast-unclosed-file",
                    "line": idx,
                    "severity": "warning",
                    "category": "Resource Leak",
                    "title": "Unclosed File Descriptor",
                    "description": f"File handle opened on line {idx} without a context manager ('with open(...)').",
                    "explanation": "Using 'with open(...)' guarantees file handles are closed immediately even if exceptions occur."
                })

    return {
        "syntax_valid": True,
        "syntax_error": None,
        "findings": visitor.findings,
        "cyclomatic_complexity": visitor.complexity_score,
        "max_nested_depth": visitor.max_nested_depth
    }


def analyze_code_static(code: str, language: str) -> Dict[str, Any]:
    """Generic static analysis dispatcher"""
    language = language.lower()
    if language in ("python", "py"):
        return analyze_python_ast(code)
    
    # Generic static regex checks for JS/TS/C++
    findings = []
    lines = code.splitlines()

    for idx, line in enumerate(lines, 1):
        # SQL Injection
        if re.search(r"SELECT\s+.*WHERE.*\+\s*\w+", line, re.IGNORECASE) or re.search(r"SELECT.*WHERE.*\$\{", line, re.IGNORECASE):
            findings.append({
                "id": "static-sqli",
                "line": idx,
                "severity": "critical",
                "category": "Security",
                "title": "CWE-89: SQL Injection Vulnerability",
                "description": f"Dynamic query concatenation on line {idx} exposes database to SQL injection.",
                "explanation": "Use parameterized queries or prepared statements."
            })
        
        # Hardcoded secrets
        if re.search(r"(password|api_?key|secret)\s*[:=]\s*['\"][^'\"]{6,}['\"]", line, re.IGNORECASE):
            findings.append({
                "id": "static-secret",
                "line": idx,
                "severity": "critical",
                "category": "Security",
                "title": "Hardcoded Secret Detected",
                "description": f"Credential or API secret detected in source code on line {idx}.",
                "explanation": "Extract sensitive values to environment variables."
            })

    return {
        "syntax_valid": True,
        "syntax_error": None,
        "findings": findings,
        "cyclomatic_complexity": max(1, len(re.findall(r"\b(if|for|while|catch|case)\b", code))),
        "max_nested_depth": 1
    }
