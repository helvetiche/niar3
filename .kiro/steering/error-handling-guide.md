---
inclusion: manual
---

# Error Handling & Security Improvements Guide

This guide outlines the improvements made to error handling and security in the codebase.

## New Utilities Created

### 1. Error Handling (`lib/error-handler.ts`)

- `AppError`: Custom error class for application errors
- `safeAsync()`: Wrapper for fire-and-forget operations with error logging
- `sanitizeErrorForClient()`: Removes sensitive details from error messages
- `createErrorResponse()`: Type-safe error response builder

**Usage:**

```typescript
// Fire-and-forget with error logging
safeAsync(async () => {
  await someAsyncOperation();
}, "operation-context");

// In API routes
const { error, statusCode } = createErrorResponse(
  "INVALID_INPUT",
  "User input validation failed",
  400
);
return NextResponse.json(error, { status: statusCode });
```

### 2. CSRF Protection (`lib/csrf.ts`)

- `generateCsrfToken()`: Generate secure CSRF tokens
- `getCsrfToken()`: Get or create CSRF token in cookies
- `verifyCsrfToken()`: Verify CSRF token from request

**Usage in API routes:**

```typescript
import { verifyCsrfToken } from "@/lib/csrf";

export async function POST(request: Request) {
  const isValid = await verifyCsrfToken(request);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 });
  }
  // Handle request
}
```

### 3. Client-side CSRF (`hooks/useCsrfToken.ts`)

- `useCsrfToken()`: Hook to get CSRF token from cookies
- `addCsrfHeader()`: Helper to add CSRF token to fetch headers

**Usage in components:**

```typescript
const token = useCsrfToken();
const headers = addCsrfHeader({ "Content-Type": "application/json" }, token);

await fetch("/api/endpoint", {
  method: "POST",
  headers,
  body: JSON.stringify(data),
});
```

### 4. Async Utilities (`lib/async-utils.ts`)

- `createAsyncEffect()`: Safe async operations in useEffect
- `handleAsync()`: Type-safe async handler for event handlers
- `fireAndForget()`: Fire-and-forget with error logging

**Usage in components:**

```typescript
// In useEffect
useEffect(() => {
  return createAsyncEffect(
    () => fetchData(),
    (data) => setData(data),
    (error) => console.error(error)
  );
}, []);

// In event handlers
const handleClick = async () => {
  await handleAsync(
    () => submitForm(),
    (error) => toast.error("Failed to submit")
  );
};
```

### 5. Async Operation Hook (`hooks/useAsyncOperation.ts`)

- `useAsyncOperation()`: Unified hook for managing async operations with loading/error states

**Usage:**

```typescript
const { execute, isLoading, error } = useAsyncOperation({
  onSuccess: () => toast.success("Done"),
  showErrorToast: true,
  errorMessage: "Operation failed",
});

const handleSubmit = async () => {
  await execute(async () => {
    await submitForm();
  });
};
```

### 6. API Client (`lib/api-client.ts`)

- `apiCall()`: Enhanced fetch wrapper with automatic CSRF token injection
- `apiGet()`, `apiPost()`, `apiPut()`, `apiDelete()`, `apiPatch()`: Convenience methods

**Usage:**

```typescript
import { apiPost, apiDelete } from "@/lib/api-client";

// Automatically includes CSRF token
const result = await apiPost("/api/v1/accounts", { name: "John" });
await apiDelete("/api/v1/accounts/123");
```

### 7. API Middleware (`lib/middleware/api-middleware.ts`)

- `withApiMiddleware()`: Unified middleware for auth, CSRF, and security headers

**Usage in API routes:**

```typescript
import { withApiMiddleware } from "@/lib/middleware/api-middleware";

export async function POST(request: Request) {
  return withApiMiddleware(request, async (req) => {
    // Your handler code
    return NextResponse.json({ success: true });
  });
}
```

### 8. Configuration Constants (`constants/config.ts`)

Centralized configuration for all magic numbers:

- Session & Auth constants
- CSRF constants
- Cache TTLs
- File upload limits
- Rate limiting thresholds
- Audit trail limits
- UI animation durations

## Migration Steps

### Step 1: Update API Routes

Replace manual error handling with `withApiMiddleware`:

**Before:**

```typescript
export async function POST(request: Request) {
  const auth = await withAuth(request, { action: "accounts.create" });
  if (auth instanceof NextResponse) return auth;

  try {
    // handler code
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

**After:**

```typescript
import { withApiMiddleware } from "@/lib/middleware/api-middleware";

export async function POST(request: Request) {
  return withApiMiddleware(request, async (req) => {
    // handler code - auth and CSRF already verified
    return NextResponse.json({ success: true });
  });
}
```

### Step 2: Update Components

Replace `void asyncFn()` with proper error handling:

**Before:**

```typescript
useEffect(() => {
  void loadAccounts(1);
}, [loadAccounts]);
```

**After:**

```typescript
useEffect(() => {
  return createAsyncEffect(
    () => loadAccounts(1),
    () => {}, // onSuccess
    (error) => console.error("Failed to load accounts:", error)
  );
}, [loadAccounts]);
```

### Step 3: Update API Calls

Use the new `apiCall` utilities instead of raw fetch:

**Before:**

```typescript
const response = await fetch("/api/v1/accounts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
```

**After:**

```typescript
import { apiPost } from "@/lib/api-client";

const result = await apiPost("/api/v1/accounts", data);
```

### Step 4: Update Event Handlers

Use `useAsyncOperation` for consistent error handling:

**Before:**

```typescript
const handleDelete = async () => {
  setIsDeleting(true);
  try {
    await deleteAccount(id);
    toast.success("Deleted");
  } catch (error) {
    toast.error("Failed to delete");
  } finally {
    setIsDeleting(false);
  }
};
```

**After:**

```typescript
const { execute, isLoading } = useAsyncOperation({
  onSuccess: () => toast.success("Deleted"),
  showErrorToast: true,
  errorMessage: "Failed to delete",
});

const handleDelete = async () => {
  await execute(() => deleteAccount(id));
};
```

## Security Improvements

1. **CSRF Protection**: All state-changing operations now require CSRF tokens
2. **Error Sanitization**: Error messages no longer leak sensitive information
3. **Centralized Configuration**: All magic numbers in one place for easy auditing
4. **Type-Safe Error Responses**: Consistent error response format across all endpoints
5. **Automatic Error Logging**: All async operations log errors for debugging

## Performance Improvements

1. **Reduced Re-renders**: Proper error handling prevents unnecessary state updates
2. **Better Error Recovery**: Errors are caught and logged without crashing components
3. **Consistent Caching**: Configuration constants ensure consistent cache behavior

## Testing

When testing components using these utilities:

1. Mock `apiCall` functions
2. Test error scenarios with `useAsyncOperation`
3. Verify CSRF tokens are included in requests
4. Test error messages are sanitized

Example test:

```typescript
import { render, screen } from "@testing-library/react";
import { useAsyncOperation } from "@/hooks/useAsyncOperation";

test("handles async errors", async () => {
  const { execute } = useAsyncOperation({
    showErrorToast: true,
  });

  await execute(async () => {
    throw new Error("Test error");
  });

  expect(screen.getByText("Operation failed")).toBeInTheDocument();
});
```
