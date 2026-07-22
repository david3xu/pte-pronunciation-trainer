# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 3.x     | :white_check_mark: |
| 2.x     | :x:                |
| < 2.0   | :x:                |

## Reporting a Vulnerability

We take the security of our application seriously. If you discover a security vulnerability, please follow these steps:

1.  **Do NOT create a public GitHub issue.**
2.  Email the security team at `security@example.com` (Replace with actual contact).
3.  Include details about the vulnerability and steps to reproduce.

We will acknowledge your report within 48 hours and provide an estimated timeline for a fix.

## 🛡️ Best Practices

### API Keys
- Never commit API keys to the repository.
- Use environment variables (`.env`) for local development.
- Use secure secret storage in production (e.g., Vercel Environment Variables).

### Data Privacy
- This application uses Google Gemini and Azure AI Speech.
- User audio is processed but not permanently stored unless explicitly saved.
- Review the [Privacy Policy](PRIVACY.md) for more details.

### Dependencies
- We regularly audit dependencies using `npm audit`.
- Please keep dependencies up to date to avoid known vulnerabilities.
