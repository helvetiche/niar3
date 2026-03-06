import { expect, afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    pathname: "/",
    query: {},
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Next.js headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

// Mock environment variables
vi.stubEnv("NODE_ENV", "test");
vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "test-api-key");
vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "test.firebaseapp.com");
vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "test-project");
vi.stubEnv("FIREBASE_ADMIN_PROJECT_ID", "test-project");
vi.stubEnv("FIREBASE_ADMIN_CLIENT_EMAIL", "test@test.iam.gserviceaccount.com");
vi.stubEnv("FIREBASE_ADMIN_PRIVATE_KEY", "test-private-key");
