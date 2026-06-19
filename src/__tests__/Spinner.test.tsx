import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Spinner } from "@/components/ui/Spinner";

describe("Spinner", () => {
  it("renders an SVG element", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("animate-spin");
  });

  it("applies size classes", () => {
    const { container } = render(<Spinner size="lg" />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("h-12");
  });

  it("renders with default size", () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveClass("h-8");
  });
});
