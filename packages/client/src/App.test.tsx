import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "./App.js";

describe("App", () => {
  it("muestra el nombre de la marca", () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );
    expect(screen.getByText("Amanda Home & Deco")).toBeInTheDocument();
  });
});
