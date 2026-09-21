"""
GitHub Service
Fetches files from public GitHub Pull Requests or repository URLs
"""

import re
import httpx
from typing import Dict, Any, List

async def fetch_github_pr_files(pr_url: str) -> Dict[str, Any]:
    """
    Parses a GitHub PR URL (e.g., https://github.com/owner/repo/pull/123)
    and fetches changed files via GitHub Public REST API.
    """
    match = re.search(r"github\.com/([^/]+)/([^/]+)/pull/(\d+)", pr_url)
    if not match:
        raise ValueError("Invalid GitHub PR URL. Format should be: https://github.com/owner/repo/pull/<number>")

    owner, repo, pr_number = match.groups()
    api_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/files"

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "AI-Code-Review-Assistant"
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(api_url, headers=headers)
        if response.status_code != 200:
            raise ValueError(f"GitHub API returned {response.status_code}: {response.text}")
        
        files_data = response.json()
        if not files_data:
            raise ValueError("No changed files found in this Pull Request.")

        files_list = []
        for f in files_data[:5]: # Take first 5 files
            files_list.append({
                "filename": f.get("filename"),
                "status": f.get("status"),
                "patch": f.get("patch", ""),
                "raw_url": f.get("raw_url"),
                "additions": f.get("additions"),
                "deletions": f.get("deletions")
            })

        return {
            "owner": owner,
            "repo": repo,
            "pr_number": pr_number,
            "files": files_list
        }
