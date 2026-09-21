"""
Python Test Runner Service
Executes user code and generated test suites in an isolated temporary sandbox
Returns execution results: pass/fail counts, execution time, stdout, stderr, and failure tracebacks.
"""

import os
import sys
import time
import tempfile
import subprocess
from typing import Dict, Any

def run_python_tests(code: str, test_code: str) -> Dict[str, Any]:
    """
    Safely executes test_code against code in an isolated temporary directory.
    """
    start_time = time.time()
    
    with tempfile.TemporaryDirectory() as temp_dir:
        src_path = os.path.join(temp_dir, "solution.py")
        test_path = os.path.join(temp_dir, "test_solution.py")

        # Write user source code
        with open(src_path, "w", encoding="utf-8") as f:
            f.write(code)

        # Write test file, ensuring it imports from solution
        full_test_content = f"""# Test Runner Wrapper
import sys
import os
sys.path.insert(0, '{temp_dir}')

{test_code}
"""
        with open(test_path, "w", encoding="utf-8") as f:
            f.write(full_test_content)

        # Run pytest via subprocess with 5s timeout
        try:
            cmd = [sys.executable, "-m", "pytest", test_path, "-v", "--tb=short"]
            result = subprocess.run(
                cmd,
                cwd=temp_dir,
                capture_output=True,
                text=True,
                timeout=5
            )
            elapsed = round(time.time() - start_time, 3)

            output = result.stdout + "\n" + result.stderr
            return parse_pytest_output(result.returncode, output, elapsed)

        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "passed": 0,
                "failed": 1,
                "total": 1,
                "runtime": 5.0,
                "output": "Execution timed out (5.0s limit exceeded). Check for infinite loops.",
                "traceback": "TimeoutExpired: Test execution took longer than 5 seconds."
            }
        except Exception as e:
            return {
                "success": False,
                "passed": 0,
                "failed": 1,
                "total": 1,
                "runtime": round(time.time() - start_time, 3),
                "output": str(e),
                "traceback": f"Test runner execution error: {str(e)}"
            }

def parse_pytest_output(returncode: int, output: str, elapsed: float) -> Dict[str, Any]:
    """Parses pytest stdout/stderr to extract counts"""
    passed = 0
    failed = 0

    # Look for patterns like "2 passed, 1 failed in 0.05s" or "3 passed in 0.02s"
    for line in output.splitlines():
        if "passed" in line or "failed" in line:
            import re
            p_match = re.search(r"(\d+)\s+passed", line)
            f_match = re.search(r"(\d+)\s+failed", line)
            e_match = re.search(r"(\d+)\s+error", line)
            
            if p_match:
                passed = int(p_match.group(1))
            if f_match:
                failed += int(f_match.group(1))
            if e_match:
                failed += int(e_match.group(1))

    total = passed + failed
    if total == 0:
        # Fallback if no specific count line matched
        if returncode == 0:
            passed = 1
            total = 1
        else:
            failed = 1
            total = 1

    return {
        "success": (returncode == 0 and failed == 0),
        "passed": passed,
        "failed": failed,
        "total": total,
        "runtime": elapsed,
        "output": output.strip(),
        "traceback": output if returncode != 0 else ""
    }
