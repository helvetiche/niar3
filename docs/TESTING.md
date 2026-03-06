# Testing Guide

## Overview

This project uses Vitest for unit and integration testing, with React Testing Library for component tests.

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.ts                 # Test setup and global mocks
├── lib/                     # Library function tests
│   ├── auth/               # Authentication tests
│   ├── excel/              # Excel utility tests
│   └── file-validation.test.ts
├── components/             # Component tests
└── integration/            # Integration tests
```

## Writing Tests

### Unit Tests

Test individual functions in isolation:

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "@/lib/my-module";

describe("myFunction", () => {
  it("should return expected result", () => {
    const result = myFunction("input");
    expect(result).toBe("expected");
  });

  it("should handle edge cases", () => {
    expect(myFunction("")).toBe("");
    expect(myFunction(null)).toBeNull();
  });
});
```

### Component Tests

Test React components with React Testing Library:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyComponent } from "@/components/MyComponent";

describe("MyComponent", () => {
  it("should render correctly", () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("should handle user interactions", async () => {
    const { user } = render(<MyComponent />);
    await user.click(screen.getByRole("button"));
    expect(screen.getByText("Clicked")).toBeInTheDocument();
  });
});
```

### Integration Tests

Test multiple components or modules together:

```typescript
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MyFeature } from "@/components/MyFeature";

describe("MyFeature Integration", () => {
  it("should complete full workflow", async () => {
    render(<MyFeature />);

    // Step 1
    await user.click(screen.getByText("Start"));

    // Step 2
    await user.type(screen.getByLabelText("Input"), "test");

    // Step 3
    await user.click(screen.getByText("Submit"));

    // Verify result
    await waitFor(() => {
      expect(screen.getByText("Success")).toBeInTheDocument();
    });
  });
});
```

## Mocking

### Mocking Modules

```typescript
import { vi } from "vitest";

vi.mock("@/lib/firebase-admin/app", () => ({
  getFirebaseAdminApp: vi.fn(),
  getAdminAuth: vi.fn(),
}));
```

### Mocking Functions

```typescript
import { vi } from "vitest";

const mockFn = vi.fn().mockReturnValue("mocked");
const mockAsyncFn = vi.fn().mockResolvedValue("mocked");
```

### Mocking Next.js

Next.js modules are automatically mocked in `tests/setup.ts`:

```typescript
// Already mocked:
// - next/navigation (useRouter, usePathname, useSearchParams)
// - next/headers (cookies, headers)
```

## Coverage

### Coverage Thresholds

Minimum coverage requirements:

- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

### Viewing Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html
```

### Coverage Exclusions

The following are excluded from coverage:

- `node_modules/`
- `tests/`
- `**/*.d.ts`
- `**/*.config.*`
- `**/mockData.ts`
- `.next/`

## Best Practices

### 1. Test Behavior, Not Implementation

❌ Bad:

```typescript
it("should call setState", () => {
  const component = render(<MyComponent />);
  expect(component.setState).toHaveBeenCalled();
});
```

✅ Good:

```typescript
it("should display updated value", async () => {
  render(<MyComponent />);
  await user.click(screen.getByText("Update"));
  expect(screen.getByText("Updated")).toBeInTheDocument();
});
```

### 2. Use Descriptive Test Names

❌ Bad:

```typescript
it("works", () => { ... });
```

✅ Good:

```typescript
it("should validate email format and show error for invalid input", () => { ... });
```

### 3. Arrange-Act-Assert Pattern

```typescript
it("should calculate total correctly", () => {
  // Arrange
  const items = [{ price: 10 }, { price: 20 }];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(30);
});
```

### 4. Test Edge Cases

```typescript
describe("divide", () => {
  it("should divide positive numbers", () => {
    expect(divide(10, 2)).toBe(5);
  });

  it("should handle division by zero", () => {
    expect(() => divide(10, 0)).toThrow("Division by zero");
  });

  it("should handle negative numbers", () => {
    expect(divide(-10, 2)).toBe(-5);
  });

  it("should handle decimals", () => {
    expect(divide(10, 3)).toBeCloseTo(3.33, 2);
  });
});
```

### 5. Keep Tests Independent

Each test should be able to run independently:

```typescript
describe("UserList", () => {
  beforeEach(() => {
    // Reset state before each test
    cleanup();
  });

  it("test 1", () => { ... });
  it("test 2", () => { ... });
});
```

## Testing Checklist

- [ ] All new features have tests
- [ ] All bug fixes have regression tests
- [ ] Tests are independent and can run in any order
- [ ] Tests have descriptive names
- [ ] Edge cases are covered
- [ ] Error scenarios are tested
- [ ] Async operations are properly awaited
- [ ] Mocks are cleaned up after tests
- [ ] Coverage meets minimum thresholds

## Continuous Integration

Tests run automatically on:

- Every push to main/develop branches
- Every pull request
- Before deployment

CI pipeline includes:

1. Linting
2. Type checking
3. Unit tests
4. Coverage report
5. Build verification

## Debugging Tests

### Run Single Test

```bash
npm test -- path/to/test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --grep "authentication"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal"
}
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
