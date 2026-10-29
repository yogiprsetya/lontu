import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Greeting } from "@/components/dashboard/greeting";

describe("Greeting", () => {
  // Offline, the service worker can hydrate this HTML on a later day; a clock value in it
  // would then disagree with the browser's first render.
  it("leaves the time-of-day line out of the server render", () => {
    const html = renderToString(createElement(Greeting));
    expect(html).toContain("Halo!");
    expect(html).not.toMatch(/Selamat (pagi|siang|sore|malam)/);
    expect(html).not.toMatch(/\d{4}/);
  });
});
