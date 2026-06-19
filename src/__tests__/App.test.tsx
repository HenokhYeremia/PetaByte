import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { AppShell } from "@/components/layout/AppShell";

describe("Routing", () => {
  it("renders dashboard heading on root route", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppShell>
          <p>Dashboard page content</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByText("Dashboard page content")).toBeInTheDocument();
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
  });

  it("renders scanner heading on /scanner route", () => {
    render(
      <MemoryRouter initialEntries={["/scanner"]}>
        <AppShell>
          <p>Scanner page content</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByText("Scanner page content")).toBeInTheDocument();
  });

  it("renders duplicates heading on /duplicates route", () => {
    render(
      <MemoryRouter initialEntries={["/duplicates"]}>
        <AppShell>
          <p>Duplicates page content</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByText("Duplicates page content")).toBeInTheDocument();
  });

  it("renders cache cleaner heading on /cleaner route", () => {
    render(
      <MemoryRouter initialEntries={["/cleaner"]}>
        <AppShell>
          <p>Cache Cleaner page content</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByText("Cache Cleaner page content")).toBeInTheDocument();
  });

  it("renders smart move heading on /move route", () => {
    render(
      <MemoryRouter initialEntries={["/move"]}>
        <AppShell>
          <p>Smart Move page content</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByText("Smart Move page content")).toBeInTheDocument();
  });

  it("renders health score heading on /health route", () => {
    render(
      <MemoryRouter initialEntries={["/health"]}>
        <AppShell>
          <p>Health Score page content</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByText("Health Score page content")).toBeInTheDocument();
  });

  it("renders settings heading on /settings route", () => {
    render(
      <MemoryRouter initialEntries={["/settings"]}>
        <AppShell>
          <p>Settings page content</p>
        </AppShell>
      </MemoryRouter>,
    );
    expect(screen.getByText("Settings page content")).toBeInTheDocument();
  });
});
