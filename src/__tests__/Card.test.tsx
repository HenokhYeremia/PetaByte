import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

describe("Card", () => {
  it("renders children", () => {
    render(<Card><p data-testid="child">Content</p></Card>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("applies default padding", () => {
    render(<Card data-testid="card">Content</Card>);
    expect(screen.getByTestId("card")).toHaveClass("p-6");
  });

  it("applies custom padding", () => {
    render(<Card padding="sm" data-testid="card">Content</Card>);
    expect(screen.getByTestId("card")).toHaveClass("p-4");
  });

  it("applies border and background classes", () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId("card");
    expect(card).toHaveClass("rounded-xl");
    expect(card).toHaveClass("border");
  });
});

describe("CardHeader", () => {
  it("renders children", () => {
    render(<CardHeader><h3>Title</h3></CardHeader>);
    expect(screen.getByText("Title")).toBeInTheDocument();
  });
});

describe("CardTitle", () => {
  it("renders text", () => {
    render(<CardTitle>My Title</CardTitle>);
    expect(screen.getByText("My Title")).toBeInTheDocument();
  });
});

describe("CardContent", () => {
  it("renders children", () => {
    render(<CardContent><p>Details</p></CardContent>);
    expect(screen.getByText("Details")).toBeInTheDocument();
  });
});
