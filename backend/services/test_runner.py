"""
Sandboxed Test Runner
Executes tests in an isolated /tmp workspace with scrubbed environment variables
to prevent credential leakage and state corruption across serverless & local invocations.
"""

import os
import sys
import tempfile
import subprocess
from typing import Dict, Any

def run_sandboxed_tests(test_code: str, target_code: str, filename: str = "solution.py") -> Dict[str, Any]:
    """
    Runs pytest on the provided code in a temporary directory.
    Uses a scrubbed environment so that sensitive API keys are never leaked to subprocesses.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        target_path = os.path.join(tmpdir, filename)
        test_path = os.path.join(tmpdir, "test_" + filename)

        with open(target_path, "w", encoding="utf-8") as f:
            f.write(target_code)

        with open(test_path, "w", encoding="utf-8") as f:
            f.write(test_code)

        # Scrubbed environment: only keep essential runtime PATH
        scrubbed_env = {
            "PATH": os.environ.get("PATH", "/usr/bin:/bin:/usr/local/bin"),
            "PYTHONPATH": tmpdir,
            "HOME": tmpdir,
            "PYTHONDONTWRITEBYTECODE": "1"
        }

        try:
            result = subprocess.run(
                [sys.executable, "-m", "pytest", test_path, "-v", "--no-header", "--tb=short"],
                cwd=tmpdir,
                env=scrubbed_env,
                capture_output=True,
                text=True,
                timeout=15
            )
            return {
                "success": result.returncode == 0,
                "exit_code": result.returncode,
                "output": result.stdout + ("\n" + result.stderr if result.stderr else ""),
                "total_passed": result.stdout.count("PASSED"),
                "total_failed": result.stdout.count("FAILED")
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "exit_code": -1,
                "output": "Execution timed out after 15 seconds.",
                "total_passed": 0,
                "total_failed": 1
            }
        except Exception as e:
            return {
                "success": False,
                "exit_code": -1,
                "output": f"Test runner execution error: {str(e)}",
                "total_passed": 0,
                "total_failed": 1
            }
