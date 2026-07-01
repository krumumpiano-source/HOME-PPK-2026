
## Encoding Safety Rule
When editing files or performing bulk find/replace operations on files (especially HTML or files containing Thai characters), **NEVER** use PowerShell commands like \Get-Content\ and \Set-Content\ without explicitly setting the encoding to UTF8 (e.g., \-Encoding UTF8\).
Even better, use the provided Node.js script \
ode bump-cache.js\ to safely update cache versions in HTML files, as Node.js preserves standard UTF-8 encoding natively without adding a Windows BOM.

