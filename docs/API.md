# API Documentation

## Base URL

```
Production: https://niatools.vercel.app/api/v1
Development: http://localhost:3000/api/v1
```

## Authentication

All API endpoints (except health check) require authentication via Firebase session cookies.

### Headers

```
Cookie: __session=<firebase-session-token>
x-csrf-token: <csrf-token>
```

## Rate Limiting

- **Auth endpoints**: 5 requests per 60 seconds
- **API endpoints**: 10 requests per 10 seconds
- **Heavy operations**: 5 requests per 60 seconds
- **Public pages**: 30 requests per 60 seconds

Rate limit headers:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1234567890
Retry-After: 60 (on 429 responses)
```

## Endpoints

### Health Check

```http
GET /api/v1/health
```

**Response**
```json
{
  "status": "ok",
  "timestamp": "2024-03-25T10:00:00.000Z"
}
```

---

### Authentication

#### Get Session

```http
GET /api/v1/auth/session
```

**Response**
```json
{
  "user": {
    "uid": "user-id",
    "email": "user@example.com",
    "emailVerified": true,
    "customClaims": {
      "role": "user"
    }
  }
}
```

#### Refresh Token

```http
POST /api/v1/auth/refresh-token
```

**Request Body**
```json
{
  "refreshToken": "firebase-refresh-token"
}
```

**Response**
```json
{
  "sessionCookie": "new-session-cookie",
  "expiresIn": 432000000
}
```

---

### Accounts Management

#### List Accounts

```http
GET /api/v1/accounts
```

**Query Parameters**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

**Response**
```json
{
  "accounts": [
    {
      "uid": "user-id",
      "email": "user@example.com",
      "emailVerified": true,
      "disabled": false,
      "customClaims": {
        "role": "user"
      },
      "metadata": {
        "creationTime": "2024-01-01T00:00:00.000Z",
        "lastSignInTime": "2024-03-25T10:00:00.000Z"
      }
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### Get Account

```http
GET /api/v1/accounts/:uid
```

**Response**
```json
{
  "uid": "user-id",
  "email": "user@example.com",
  "emailVerified": true,
  "disabled": false,
  "customClaims": {
    "role": "user"
  }
}
```

#### Create Account

```http
POST /api/v1/accounts
```

**Request Body**
```json
{
  "email": "newuser@example.com",
  "password": "SecurePassword123!",
  "role": "user"
}
```

**Response**
```json
{
  "uid": "new-user-id",
  "email": "newuser@example.com"
}
```

#### Update Account

```http
PUT /api/v1/accounts/:uid
```

**Request Body**
```json
{
  "email": "updated@example.com",
  "role": "admin",
  "disabled": false
}
```

#### Delete Account

```http
DELETE /api/v1/accounts/:uid
```

**Response**
```json
{
  "success": true,
  "message": "Account deleted successfully"
}
```

---

### IFR Checker

Validate consolidated files against source IFR data.

```http
POST /api/v1/ifr-checker
```

**Request Body** (multipart/form-data)
- `ifrFiles`: File[] - Source IFR files
- `consolidatedFile`: File - Consolidated file to validate

**Response**
```json
{
  "success": true,
  "summary": {
    "totalLots": 100,
    "consolidatedLots": 98,
    "matchingLots": 95,
    "totalIssues": 5,
    "errors": 2,
    "warnings": 3
  },
  "issues": [
    {
      "lotCode": "LOT-001",
      "issueType": "principal_mismatch",
      "field": "Principal",
      "ifrValue": "1000.00",
      "consolidatedValue": "1050.00",
      "difference": 50,
      "severity": "warning",
      "reason": "Principal mismatch: Expected 1000.00 from IFR, found 1050.00 in consolidated (difference: 50.00)"
    }
  ]
}
```

---

### Templates

#### List Templates

```http
GET /api/v1/templates
```

**Response**
```json
{
  "templates": [
    {
      "id": "template-id",
      "name": "Billing Template",
      "type": "billing",
      "uploadedBy": "user@example.com",
      "uploadedAt": "2024-03-25T10:00:00.000Z",
      "size": 102400
    }
  ]
}
```

#### Upload Template

```http
POST /api/v1/templates
```

**Request Body** (multipart/form-data)
- `file`: File - Template file (.xlsx, .xls)
- `type`: string - Template type (billing, accomplishment)

**Response**
```json
{
  "id": "template-id",
  "name": "template.xlsx",
  "downloadUrl": "/api/v1/templates/template-id/download"
}
```

#### Download Template

```http
GET /api/v1/templates/:templateId/download
```

**Response**: Binary file download

#### Delete Template

```http
DELETE /api/v1/templates/:templateId
```

---

### Inventory

#### List Inventory Items

```http
GET /api/v1/inventory
```

**Query Parameters**
- `category` (optional): Filter by category
- `search` (optional): Search term

**Response**
```json
{
  "items": [
    {
      "id": "item-id",
      "name": "Item Name",
      "category": "Equipment",
      "quantity": 10,
      "unit": "pcs",
      "lastUpdated": "2024-03-25T10:00:00.000Z"
    }
  ]
}
```

#### Create Inventory Item

```http
POST /api/v1/inventory
```

**Request Body**
```json
{
  "name": "New Item",
  "category": "Equipment",
  "quantity": 5,
  "unit": "pcs"
}
```

#### Update Inventory Item

```http
PUT /api/v1/inventory/:itemId
```

#### Delete Inventory Item

```http
DELETE /api/v1/inventory/:itemId
```

---

### Audit Trail

```http
GET /api/v1/audit-trail
```

**Query Parameters**
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string
- `userId` (optional): Filter by user
- `action` (optional): Filter by action type

**Response**
```json
{
  "entries": [
    {
      "id": "audit-id",
      "timestamp": "2024-03-25T10:00:00.000Z",
      "userId": "user-id",
      "action": "account.create",
      "details": {
        "targetEmail": "newuser@example.com"
      },
      "ipAddress": "192.168.1.1"
    }
  ]
}
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

### Common Error Codes

- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

---

## Security

### CSRF Protection

All state-changing requests (POST, PUT, DELETE) require CSRF token:

```http
x-csrf-token: <token-from-cookie>
```

### File Upload Limits

- Maximum file size: 2GB
- Template files: 100MB max
- Allowed extensions: .xlsx, .xls, .pdf

### Content Security Policy

Strict CSP headers are applied to all responses. See security documentation for details.
