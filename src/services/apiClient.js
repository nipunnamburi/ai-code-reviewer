/**
 * Frontend API Client communicating with FastAPI Backend
 */

const BACKEND_URL = 'http://127.0.0.1:8000';

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function requestReview({ code, language, mode, apiKey, customInstructions }) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        language,
        mode,
        api_key: apiKey || null,
        custom_instructions: customInstructions || null
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Server error ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.warn('Backend request failed, using client-side fallback:', error);
    // Fallback to client service if backend not running
    const { analyzeCode } = await import('./aiService');
    const result = await analyzeCode({ code, language, mode, apiKey, customInstructions });
    result.apiNotice = `Note: Running on client-mode (${error.message}). Start FastAPI backend for full AST & test runner.`;
    return result;
  }
}

export async function executeTests({ code, testCode, language = 'python' }) {
  const res = await fetch(`${BACKEND_URL}/api/run-tests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      test_code: testCode,
      language
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Execution failed with status ${res.status}`);
  }

  return await res.json();
}

export async function askFollowupChat({ question, contextCode, issueContext, apiKey }) {
  const res = await fetch(`${BACKEND_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      context_code: contextCode,
      issue_context: issueContext || null,
      api_key: apiKey || null
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Chat query failed.');
  }

  const data = await res.json();
  return data.answer;
}

export async function importGitHubPR(prUrl) {
  const res = await fetch(`${BACKEND_URL}/api/github-pr`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pr_url: prUrl })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch GitHub PR.');
  }

  return await res.json();
}
