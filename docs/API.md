# API Reference

## Base URL

```
Development: http://localhost:3000/api/v1
Production: https://niatools.vercel.app/api/v1
```

## Authentication

All API endpoints require authentication via session cookie (`__session`). The cookie is set after successful login via Firebase Auth.

### Headers

```http
Cookie: __session=<session-token>
Content-Type: application/json (for JSON requests)
Content-Type: multipart/form-data (for file uploads)
```

## Rate Limiting

- **Public endpoints**: 30 requests/minute per IP
- **API endpoints**: 10 requests/10 seconds per IP
- **Auth endpoints**: 5 requests/minute per IP
- **Heavy operations**: 5 requests/minute per IP

Rate limit headers:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1234567890
Retry-After: 60 (on 429 response)
```

## Endpoints

### Health Check

#### GET `/health`

Check API health status.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-03-06T12:00:00.000Z"
}
```

---

### Authentication

#### POST `/auth/session`

Create session cookie from Firebase ID token.

**Request:**

```json
{
  "idToken": "firebase-id-token"
}
```

**Response:**

```json
{
  "success": true,
  "expiresIn": 1209600000
}
```

#### POST `/auth/refresh`

Refresh session cookie.

**Response:**

```json
{
  "success": true,
  "expiresIn": 1209600000
}
```

#### GET `/auth/session`

Get current session information.

**Response:**

```json
{
  "user": {
    "uid": "user-id",
    "email": "user@example.com",
    "emailVerified": true,
    "customClaims": {
      "role": "admin",
      "permissions": ["workspace:read", "workspace:write"]
    }
  }
}
```

---

### Templates

#### GET `/templates?scope={scope}`

List templates for a specific scope.

**Query Parameters:**

- `scope` (required): `ifr-scanner` | `swrft` | `consolidation`

**Response:**

```json
{
  "templates": [
    {
      "id": "template-id",
      "name": "Template Name",
      "scope": "ifr-scanner",
      "storagePath": "templates/ifr-scanner/file.xlsx",
      "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "sizeBytes": 12345,
      "createdAt": 1234567890,
      "updatedAt": 1234567890,
      "uploaderUid": "user-id"
    }
  ]
}
```

#### POST `/templates`

Upload a new template.

**Request (multipart/form-data):**

```
scope: ifr-scanner
file: <file>
name: Template Name (optional)
```

**Response:**

```json
{
  "id": "template-id",
  "name": "Template Name",
  "scope": "ifr-scanner",
  "storagePath": "templates/ifr-scanner/file.xlsx",
  "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "sizeBytes": 12345,
  "createdAt": 1234567890,
  "uploaderUid": "user-id"
}
```

#### PATCH `/templates/{templateId}`

Update template name and/or file.

**Request (multipart/form-data):**

```
name: New Name (optional)
file: <file> (optional)
```

**Response:**

```json
{
  "id": "template-id",
  "name": "New Name",
  "scope": "ifr-scanner",
  "storagePath": "templates/ifr-scanner/file.xlsx",
  "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "sizeBytes": 12345,
  "createdAt": 1234567890,
  "updatedAt": 1234567891,
  "updatedByUid": "user-id"
}
```

#### DELETE `/templates/{templateId}`

Delete a template.

**Response:**

```json
{
  "success": true,
  "scope": "ifr-scanner"
}
```

---

### Accounts

#### GET `/accounts`

List all user accounts (admin only).

**Required Permission:** `users:read`

**Response:**

```json
{
  "accounts": [
    {
      "uid": "user-id",
      "email": "user@example.com",
      "displayName": "User Name",
      "role": "admin",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "disabled": false,
      "permissions": ["workspace:read", "workspace:write"]
    }
  ]
}
```

#### POST `/accounts`

Create a new user account (admin only).

**Required Permission:** `users:write`

**Request:**

```json
{
  "email": "user@example.com",
  "password": "secure-password",
  "displayName": "User Name",
  "role": "user",
  "permissions": ["workspace:read"]
}
```

**Response:**

```json
{
  "uid": "user-id",
  "email": "user@example.com",
  "displayName": "User Name",
  "role": "user",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "disabled": false,
  "permissions": ["workspace:read"]
}
```

#### PATCH `/accounts/{uid}`

Update user account (admin only).

**Required Permission:** `users:write`

**Request:**

```json
{
  "displayName": "New Name",
  "role": "admin",
  "disabled": false,
  "permissions": ["workspace:read", "workspace:write"]
}
```

**Response:**

```json
{
  "uid": "user-id",
  "email": "user@example.com",
  "displayName": "New Name",
  "role": "admin",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "disabled": false,
  "permissions": ["workspace:read", "workspace:write"]
}
```

#### DELETE `/accounts/{uid}`

Delete user account (admin only).

**Required Permission:** `users:delete`

**Response:**

```json
{
  "success": true
}
```

---

### Consolidate Land Profiles

#### POST `/consolidate-land-profiles`

Consolidate multiple land profile Excel files.

**Request (multipart/form-data):**

```
template: <template-file>
landProfile_0: <file>
landProfile_1: <file>
...
```

**Response:**
Binary Excel file with headers:

```http
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="consolidated-ifr-{timestamp}.xlsx"
X-Processed-Count: 10
X-Error-Count: 0
X-Warning-Count: 1
X-Errors: []
X-Warnings: ["Column I (Area) is left blank..."]
```

---

### IFR Checker

#### POST `/ifr-checker`

Validate consolidated file against source IFR data.

**Request (multipart/form-data):**

```
consolidatedFile: <file>
sourceFile_0: <file>
sourceFile_1: <file>
...
```

**Response:**

```json
{
  "discrepancies": [
    {
      "lotCode": "LOT-001",
      "field": "principal",
      "consolidated": 1000.0,
      "source": 1050.0,
      "difference": -50.0
    }
  ],
  "summary": {
    "totalLots": 100,
    "lotsWithDiscrepancies": 5,
    "missingLots": 2,
    "extraLots": 1
  }
}
```

---

### Merge Files

#### POST `/merge-files`

Merge PDF or Excel files.

**Request (multipart/form-data):**

```
mode: pdf | excel
file_0: <file>
file_1: <file>
...
fileName: output-name (optional)
```

**Response:**
Binary file (PDF or Excel) with headers:

```http
Content-Type: application/pdf (or Excel MIME type)
Content-Disposition: attachment; filename="merged-{timestamp}.pdf"
```

---

### LIPA Summary

#### POST `/lipa-summary/scan`

Scan LIPA files and extract data.

**Request (multipart/form-data):**

```
file_0: <file>
file_1: <file>
...
```

**Response:**

```json
{
  "scannedData": [
    {
      "fileName": "file1.xlsx",
      "data": { ... }
    }
  ]
}
```

#### POST `/lipa-summary/report`

Generate LIPA summary report.

**Request:**

```json
{
  "scannedData": [ ... ],
  "options": { ... }
}
```

**Response:**
Binary Excel file

---

### Accomplishment Tasks

#### GET `/accomplishment-tasks`

Get accomplishment tasks.

**Response:**

```json
{
  "tasks": [
    {
      "id": "task-id",
      "title": "Task Title",
      "description": "Task Description",
      "category": "Category"
    }
  ]
}
```

#### POST `/accomplishment-tasks`

Create accomplishment task.

**Request:**

```json
{
  "title": "Task Title",
  "description": "Task Description",
  "category": "Category"
}
```

**Response:**

```json
{
  "id": "task-id",
  "title": "Task Title",
  "description": "Task Description",
  "category": "Category",
  "createdAt": 1234567890
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": { ... }
}
```

### Common Error Codes

- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Example Error Response

```json
{
  "error": "Forbidden",
  "requiredPermission": "users:write"
}
```

## Security Headers

All responses include security headers:

```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

## Audit Trail

All API requests are logged to the audit trail with:

- User ID and email
- Action performed
- Request route and method
- HTTP status code
- IP address and user agent
- Timestamp
- Additional details (errors, warnings, etc.)

Access audit trail via Firebase Realtime Database at `/audit_trails/{uid}`.
