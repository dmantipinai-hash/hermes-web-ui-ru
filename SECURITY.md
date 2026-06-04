# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| main (latest) | ✅ |
| everything else | ❌ |

This is an **alpha-stage** project. Only the latest commit on `main` receives security fixes.

---

## Reporting a Vulnerability

**Public:** Open a GitHub Issue with the `security` label.

**Private:** If the vulnerability is sensitive (credential leak, exploit), use [GitHub Security Advisories](https://github.com/dmantipinai-hash/hermes-web-ui-ru/security/advisories/new).

**Expected response time:** up to 7 days.

---

## What We Consider a Vulnerability

- **XSS through chat input** — unsanitized user/agent messages rendered as HTML
- **API key exposure** — Hermes tokens, Gemini keys, or other secrets leaked through the web UI
- **Unauthorized API access** — bypassing auth on Koa endpoints (`/api/*`)
- **Path traversal** — reading/writing files outside the workspace via API
- **Socket.IO hijacking** — unauthorized WebSocket connections

---

## Default Credentials

> ⚠️ **Development-only.** The default login is `admin` / `123456`.

This exists solely for local development. **Before deploying to any server or sharing access:**

1. Set `AUTH_USER` and `AUTH_PASS` environment variables
2. Or modify the auth config in `packages/server/src/config.ts`

If you see `admin/123456` in production — that's a misconfiguration, not a vulnerability in the code. But we still want to know about it.

---

## Out of Scope

- **Hermes Agent bugs** — report to [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent/security)
- **Upstream hermes-web-ui bugs** — report to [EKKOLearnAI/hermes-web-ui](https://github.com/EKKOLearnAI/hermes-web-ui)
- **Dependency CVEs** — we track Dependabot alerts; PRs with `npm audit fix` are welcome
- **Social engineering** — phishing, credential stuffing, etc.
- **DoS** — this is a local-first tool, not a high-availability service

---

## Disclosure Policy

- Confirmed vulnerabilities are fixed on `main` first
- A GitHub Security Advisory is published after the fix is merged
- Credit is given to the reporter (unless they prefer to stay anonymous)

---

*This project is built by a small team. We take security seriously but response times reflect our capacity. Thank you for understanding.*
