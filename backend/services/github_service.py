"""
GitHub Service
Fetches files from public GitHub Pull Requests or repository URLs.
"""

import re
import httpx
from typing import Dict, Any

async def fetch_github_pr_files(pr_url: str) -> Dict[str, Any]:
    """
    Parses a GitHub PR URL (e.g., https://github.com/owner/repo/pull/123)
    or a GitHub repository URL (e.g., https://github.com/owner/repo)
    and fetches files via GitHub Public REST API.
    """
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "AI-Code-Review-Assistant"
    }

    pr_match = re.search(r"github\.com/([^/]+)/([^/]+)/pull/(\d+)", pr_url)
    if pr_match:
        owner, repo, pr_number = pr_match.groups()
        repo = repo.removesuffix(".git")
        api_url = f"https://api.github.com/repos/{owner}/{repo}/pulls/{pr_number}/files"

        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(api_url, headers=headers)
            if response.status_code != 200:
                raise ValueError(f"GitHub API returned {response.status_code}: {response.text}")

            files_data = response.json()
            if not files_data:
                raise ValueError("No changed files found in this Pull Request.")

            files_list = [
                {
                    "filename": f.get("filename"),
                    "status": f.get("status"),
                    "patch": f.get("patch", ""),
                    "raw_url": f.get("raw_url"),
                    "additions": f.get("additions"),
                    "deletions": f.get("deletions")
                }
                for f in files_data[:5]
            ]

            return {
                "owner": owner,
                "repo": repo,
                "pr_number": pr_number,
                "files": files_list
            }

    repo_match = re.search(r"github\.com/([^/]+)/([^/?#]+)", pr_url)
    if not repo_match:
        raise ValueError("Invalid GitHub URL. Use https://github.com/owner/repo or https://github.com/owner/repo/pull/<number>")

    owner, repo = repo_match.groups()
    repo = repo.removesuffix(".git")

    async with httpx.AsyncClient(timeout=15.0) as client:
        repo_res = await client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
        if repo_res.status_code != 200:
            raise ValueError(f"GitHub API returned {repo_res.status_code}: {repo_res.text}")
        default_branch = repo_res.json().get("default_branch", "main")

        tree_res = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1",
            headers=headers
        )
        if tree_res.status_code != 200:
            raise ValueError(f"GitHub API returned {tree_res.status_code}: {tree_res.text}")

        code_exts = (".py", ".js", ".jsx", ".ts", ".tsx", ".go", ".rs", ".java", ".cpp", ".c")
        blobs = [
            item for item in tree_res.json().get("tree", [])
            if item.get("type") == "blob" and item.get("path", "").endswith(code_exts)
        ][:5]

        if not blobs:
            raise ValueError("No supported source code files found in this repository.")

        files_list = []
        for blob in blobs:
            path = blob["path"]
            raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{default_branch}/{path}"
            raw_res = await client.get(raw_url, headers=headers)
            if raw_res.status_code == 200:
                files_list.append({
                    "filename": path,
                    "status": "modified",
                    "content": raw_res.text,
                    "raw_url": raw_url
                })

        if not files_list:
            raise ValueError("Failed to download source files from repository.")

        return {
            "owner": owner,
            "repo": repo,
            "files": files_list
        }
