# Auth Route Group

Authentication flows: login, register, forgot-password, verify-email.

- Use route groups `(auth)` to share layouts without affecting URL
- These routes are **public** (unauthenticated users)
- Layout guards redirect authenticated users away from auth pages
