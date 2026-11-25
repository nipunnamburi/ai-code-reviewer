---
description: Run static AST analysis, execute test suite, and produce a structured 4-pillar Markdown and JSON review report
---

# Workflow: /review-repo

This workflow performs a hybrid 3-pass automated review on the repository or specified files.

## Step 1: Pre-flight Verification & Testing
1. Run `pytest` across the project:
   ```bash
   pytest
   ```
2. Verify all test files pass or record failures as input for the completeness pillar.

## Step 2: AST Static Analysis
1. Execute AST parser on Python files to detect:
   - Nested loops (potential $O(n^2)$ bottlenecks)
   - Dangerous calls (`eval`, `exec`, `os.system`)
   - Empty or bare `except:` blocks
   - Missing docstrings in public functions

## Step 3: Deep Review & Reflection
1. Generate the 4-pillar evaluation (`Code Quality`, `Originality`, `Completeness`, `Docs`) on a scale of `0.0–10.0`.
2. Generate specific `ReviewComment` annotations with clamped line bounds:
   $$1 \le \text{start\_line} \le \text{end\_line} \le \text{total\_lines}$$
3. Drop any comments with confidence $< 0.65$.

## Step 4: Report Output
Emit the final report as Markdown with an attached JSON payload compliant with `CodeReviewReport`.
