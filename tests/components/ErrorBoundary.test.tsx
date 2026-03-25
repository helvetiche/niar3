import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Suppress console.error for these tests
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});

const ThrowError = ({ error }: { error: string }) => {
  throw new Error(error);
};

describe("ErrorBoundary", () => {
  it("should render children when no error", () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });

  it("should render error UI when error occurs", () => {
    render(
      <ErrorBoundary>
        <ThrowError error="Test error" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("should display error message in development", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    render(
      <ErrorBoundary>
        <ThrowError error="Detailed error message" />
      </ErrorBoundary>
    );

    expect(screen.getByText(/detailed error message/i)).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });
});
