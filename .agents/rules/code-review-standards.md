---
trigger: always_on
description: AI Code Reviewer standards, 4-pillar scorecard rubric, line-bounds safety rules, and soothing slate design tokens
---

# Code Review Standards & System Norms

## 1. 4-Pillar Scorecard Rubric
Every code review must evaluate the codebase across four pillars, scored from `0.0` to `10.0` with a concise, evidence-based rationale:
- **Code Quality (0–10):** Structural architecture, typing discipline, readability, idiomatic idioms, error handling, avoidance of antipatterns (`eval`/`exec`, bare `except:`, unchecked recursion).
- **Originality (0–10):** Creative problem-solving, architectural elegance, adherence to clean-code principles, avoidance of copy-paste redundancy.
- **Completeness (0–10):** Edge-case coverage, boundary condition validation, robust test runner coverage, handling of empty/malformed inputs.
- **Docs (0–10):** Docstrings, inline annotations, clear type hints, API specifications, and architectural rationales.

Overall score is computed as:
$$\text{Overall Score} = \frac{\text{Quality} \times 0.35 + \text{Completeness} \times 0.30 + \text{Docs} \times 0.20 + \text{Originality} \times 0.15}{1.0}$$

## 2. Line-Level Finding Taxonomy & Bounded Line Constraint
All reported issues must strictly adhere to the following taxonomy:
- `critical`: Vulnerabilities, security injections, runtime crashers, data corruption risks, severe memory leaks.
- `warning`: Unhandled exceptions, suboptimal patterns, missing type safety, state mutation risks.
- `optimization`: Algorithmic Big-O improvements, caching opportunities, resource reuse.
- `info`: Stylistic enhancements, docstring suggestions, readability tips.

### Strict Line-Bounds Guarantee
- Every comment must specify `1 <= start_line <= end_line <= total_file_lines`.
- If an issue concerns the entire file or header, `start_line` and `end_line` must both be set to `1`.
- Never hallucinate out-of-bounds line numbers. Filter out findings with confidence `< 0.65`.

## 3. Editorial Soothing Slate UI Design System
- **Surfaces:**
  - Canvas background: `#111315`
  - Card & Editor background: `#171a1e`
  - Hover state: `#1e2228`
  - Hairline border: `#262b33` (1px)
- **Ink & Typography:**
  - Primary text: `#eceef2` (Geist Sans / Instrument Serif for headlines)
  - Secondary text: `#98a0ad`
  - Muted text: `#5f6773`
  - Code / Mono: Geist Mono Variable
- **Severity Accents:**
  - Calm accent: `#8fbcbb`
  - Optimization: `#a3be8c`
  - Warning: `#ebcb8b`
  - Critical: `#bf616a`
- **Philosophy:**
  - Restrained, tranquil, zero visual noise.
  - No pure black `#000000`, no harsh pure white `#ffffff`, and strictly no celebratory confetti.
