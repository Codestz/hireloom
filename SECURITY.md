# Security Policy

HireLoom is **local-first**: it runs entirely in your browser, with no backend, accounts, or servers holding your data. Your résumé lives in your browser's IndexedDB; the only outbound network traffic is (a) the optional cloud AI engine you opt into with your own key (browser → your provider directly), and (b) anonymous, cookieless page views. That sharply limits the attack surface — there's no server or database to breach.

The realistic risks worth reporting are therefore client-side: XSS or content-injection in the editor/preview/export, a malicious import file (PDF/JSON) that can execute code or exfiltrate data, dependency vulnerabilities, or anything that causes résumé data to leave the device unexpectedly.

## Supported versions

Security fixes target the latest `main` (what's deployed at https://hireloom.codestz.dev). There are no long-term support branches.

## Reporting a vulnerability

**Please report privately — do not open a public issue.**

Use GitHub's private vulnerability reporting:
**https://github.com/Codestz/hireloom/security/advisories/new**

Include steps to reproduce, affected version/commit, and the impact. We'll acknowledge as soon as we can and keep you updated on the fix. Responsible disclosure is appreciated — thank you for helping keep people's career data safe.
