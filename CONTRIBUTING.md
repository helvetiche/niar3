# Contributing to NIA Tools

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow the project's coding standards

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm, yarn, or pnpm
- Git
- Firebase project (for testing)

### Setup Development Environment

1. Fork and clone the repository
```bash
git clone https://github.com/your-username/niatools.git
cd niatools
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

4. Run development server
```bash
npm run dev
```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions/updates

Example: `feature/add-export-functionality`

### Commit Messages

Follow conventional commits:

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting
- `refactor`: Code restructuring
- `test`: Tests
- `chore`: Maintenance

Examples:
```
feat(inventory): add quarterly data tracking
fix(auth): resolve session expiry issue
docs(api): update authentication endpoints
```

### Code Style

We use ESLint and Prettier for code formatting.

```bash
# Check linting
npm run lint

# Format code
npm run format

# Type check
npm run type-check
```

### Testing

All new features must include tests.

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

### Test Requirements

- Unit tests for utilities and hooks
- Component tests for UI components
- Integration tests for API routes
- Minimum 70% code coverage for new code

## Pull Request Process

### Before Submitting

1. ✅ All tests pass
2. ✅ No linting errors
3. ✅ Type checking passes
4. ✅ Code is formatted
5. ✅ Documentation updated
6. ✅ Commit messages follow convention

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. Automated checks must pass
2. At least one approval required
3. Address all review comments
4. Squash commits before merge

## Project Structure

```
niatools/
├── app/              # Next.js pages and API routes
├── components/       # React components
├── contexts/         # React contexts
├── hooks/           # Custom hooks
├── lib/             # Business logic
├── types/           # TypeScript types
├── tests/           # Test files
└── docs/            # Documentation
```

## Coding Standards

### TypeScript

- Use strict mode
- Avoid `any` type
- Define interfaces for complex objects
- Use type inference when possible

```typescript
// Good
interface User {
  uid: string;
  email: string;
}

function getUser(uid: string): Promise<User> {
  // ...
}

// Bad
function getUser(uid: any): any {
  // ...
}
```

### React Components

- Use functional components
- Use hooks for state management
- Keep components small and focused
- Extract reusable logic to hooks

```typescript
// Good
export function UserProfile({ userId }: { userId: string }) {
  const { data, error } = useUser(userId);
  
  if (error) return <Error />;
  if (!data) return <Loading />;
  
  return <div>{data.name}</div>;
}

// Bad
export function UserProfile(props: any) {
  const [data, setData] = useState();
  // 200 lines of code...
}
```

### File Organization

- One component per file
- Co-locate related files
- Use index.ts for public exports
- Keep files under 300 lines

```
components/Feature/
├── index.tsx          # Main component
├── types.ts           # Type definitions
├── utils.ts           # Utility functions
├── constants.ts       # Constants
└── hooks/
    └── useFeature.ts  # Custom hooks
```

### API Routes

- Use proper HTTP methods
- Validate all inputs
- Handle errors gracefully
- Apply security headers
- Add audit logging

```typescript
export async function POST(request: NextRequest) {
  // 1. Authenticate
  const user = await requireAuth();
  
  // 2. Authorize
  await requirePermission(user, "resource.create");
  
  // 3. Validate
  const body = await request.json();
  const validated = schema.parse(body);
  
  // 4. Process
  const result = await createResource(validated);
  
  // 5. Audit
  safeAsync(() => logAudit(user, "resource.create", result));
  
  // 6. Respond
  return secureJsonResponse(result, { status: 201 });
}
```

### Error Handling

- Use custom error classes
- Sanitize error messages
- Log errors appropriately
- Provide helpful messages

```typescript
// Good
try {
  await processFile(file);
} catch (error) {
  logger.error("File processing failed", { error, fileId });
  throw new AppError(
    "FILE_PROCESSING_ERROR",
    "Unable to process file. Please try again.",
    500
  );
}

// Bad
try {
  await processFile(file);
} catch (error) {
  console.log(error);
  throw error;
}
```

## Security Guidelines

### Input Validation

- Validate all user inputs
- Use Zod schemas
- Sanitize file names
- Check file types and sizes

### Authentication

- Never trust client data
- Verify sessions server-side
- Check permissions on every request
- Use secure session cookies

### Data Handling

- Never log sensitive data
- Sanitize error messages
- Use parameterized queries
- Validate file uploads

## Documentation

### Code Comments

- Explain "why", not "what"
- Document complex algorithms
- Add JSDoc for public APIs
- Keep comments up to date

```typescript
/**
 * Validates consolidated file against source IFR data.
 * 
 * @param ifrFiles - Source IFR files to validate against
 * @param consolidatedFile - Consolidated file to check
 * @returns Validation results with issues and summary
 * @throws {AppError} If file processing fails
 */
export async function validateIFR(
  ifrFiles: File[],
  consolidatedFile: File
): Promise<ValidationResult> {
  // Implementation
}
```

### README Updates

- Update README for new features
- Add examples for complex features
- Keep setup instructions current
- Document breaking changes

## Getting Help

- Check existing issues and PRs
- Read the documentation
- Ask in discussions
- Contact maintainers

## Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Credited in documentation

Thank you for contributing to NIA Tools!
