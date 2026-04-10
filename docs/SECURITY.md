# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please email security@niatools.example.com instead of using the issue tracker.

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and provide a timeline for fixes.

## Security Measures

### Authentication

- Firebase session cookies (HttpOnly, Secure, SameSite=Strict)
- 5-day session expiry
- Server-side verification on every request
- Role-based access control (RBAC)

### Rate Limiting

- Distributed rate limiting with Upstash Redis
- Different limits per endpoint type
- IP-based identification
- Automatic blocking on abuse

### Input Validation

- Zod schemas for all inputs
- File type and size validation
- Filename sanitization
- SQL injection prevention

### Security Headers

- Content-Security-Policy (strict)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security (HSTS)
- Referrer-Policy
- Permissions-Policy

### CSRF Protection

- Token-based CSRF protection
- SameSite cookies
- Origin validation

### Data Protection

- No sensitive data in logs
- Error message sanitization
- Encrypted data at rest (Firebase)
- TLS 1.3 in transit

### Audit Trail

- All actions logged
- Immutable audit records
- User attribution
- Timestamp tracking

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Best Practices

### For Developers

- Never commit secrets
- Use environment variables
- Validate all inputs
- Sanitize all outputs
- Follow least privilege principle
- Keep dependencies updated

### For Users

- Use strong passwords
- Enable 2FA (when available)
- Keep browser updated
- Don't share credentials
- Report suspicious activity

## Known Security Considerations

### CSP Inline Scripts

Currently using 'unsafe-inline' for scripts in production. Plan to migrate to nonces.

### Rate Limiting in Development

Rate limiting is disabled in development. Enable for testing before production deployment.

## Security Updates

Security updates are released as soon as possible after discovery. Subscribe to releases for notifications.

## Compliance

- OWASP Top 10 compliance
- GDPR considerations
- Data minimization
- Right to deletion

## Third-Party Security

### Dependencies

- Regular security audits
- Automated dependency updates
- Vulnerability scanning

### Services

- Firebase (Google Cloud)
- Upstash (Redis)
- Vercel (Hosting)
- Sentry (Monitoring)

All third-party services are vetted for security compliance.
