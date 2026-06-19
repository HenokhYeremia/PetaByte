import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

function ThrowError({ message }: { message: string }): React.ReactNode {
  throw new Error(message);
  return null;
}

describe("ErrorBoundary", () => {
  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <p>All good</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("All good")).toBeInTheDocument();
  });

  it("renders error UI when child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError message="Test crash" />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Test crash")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("recovers after clicking Try Again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError message="Crash" />
      </ErrorBoundary>,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <p>Recovered</p>
      </ErrorBoundary>,
    );

    await userEvent.click(screen.getByText("Try Again"));
    expect(screen.getByText("Recovered")).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it("renders custom fallback when provided", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div data-testid="custom">Custom error</div>}>
        <ThrowError message="crash" />
      </ErrorBoundary>,
    );

    expect(screen.getByTestId("custom")).toBeInTheDocument();

    vi.restoreAllMocks();
  });
});
