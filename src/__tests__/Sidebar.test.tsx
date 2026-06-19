import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { Sidebar } from "@/components/layout/Sidebar";

describe("Sidebar", () => {
  it("renders all navigation links", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    const labels = [
      "Dashboard",
      "Scanner",
      "Duplicates",
      "Cache Cleaner",
      "Smart Move",
      "Health Score",
      "Settings",
    ];

    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders PetaByte branding", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText("PetaByte")).toBeInTheDocument();
  });

  it("has 7 navigation links", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    const nav = document.querySelector("nav");
    expect(nav).toBeInTheDocument();
    const links = nav!.querySelectorAll("a");
    expect(links.length).toBe(7);
  });

  it("renders collapse button", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByText("Collapse")).toBeInTheDocument();
  });
});
