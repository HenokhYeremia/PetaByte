import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { AppShell } from "@/components/layout/AppShell";

describe("AppShell", () => {
  it("renders children inside main content area", () => {
    render(
      <MemoryRouter>
        <AppShell>
          <p data-testid="child">Test content</p>
        </AppShell>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("renders sidebar navigation", () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Content</div>
        </AppShell>
      </MemoryRouter>,
    );

    const sidebar = document.querySelector("aside");
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveClass("border-zinc-800");
  });

  it("renders header with page title", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppShell>
          <div>Content</div>
        </AppShell>
      </MemoryRouter>,
    );

    const header = document.querySelector("header");
    expect(header).toBeInTheDocument();
    const heading = header?.querySelector("h2");
    expect(heading?.textContent).toBe("Dashboard");
  });
});
