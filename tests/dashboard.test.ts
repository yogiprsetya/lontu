import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

test("app dashboard page exports a default server component", async () => {
  const pageModule = await import("../app/app/page");

  assert.equal(typeof pageModule.default, "function", "app/app/page.tsx exports a default function");
});

test("home shell component exports a default function", async () => {
  const shellModule = await import("../components/dashboard/home-shell");

  assert.equal(typeof shellModule.default, "function", "home-shell exports a default function");
});

test("home shell renders header, categories, and add-expense action", async () => {
  const { default: HomeShell } = await import("../components/dashboard/home-shell");

  const html = renderToStaticMarkup(
    React.createElement(HomeShell, {
      user: { name: "Alex", image: null },
    }),
  );

  assert.ok(html.includes("Lontu"), "renders app header");
  assert.ok(html.includes("Categories"), "renders categories section");
  assert.ok(html.includes("Add expense"), "renders add-expense action");
});

test("root page exports a default function", async () => {
  const pageModule = await import("../app/page");

  assert.equal(typeof pageModule.default, "function", "app/page.tsx exports a default function");
});
