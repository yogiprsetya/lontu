import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// DESIGN.md: the look of a components/ui primitive lives in the primitive (defaults and
// variants). Where it is used, className may only place it: width, flex/grid placement,
// margins, positioning, visibility. Anything else (height, padding, type, color, radius,
// shadow, state styles) belongs in a variant.

const ROOT = join(import.meta.dirname, "../..");
const SCANNED = ["app", "components"];
const UI_DIR = join(ROOT, "components/ui");

const LAYOUT =
  /^-?(m|mx|my|mt|mr|mb|ml|w|min-w|max-w|basis|flex|shrink|grow|self|justify-self|order|col-span|row-span|grid-cols|grid-rows|gap|gap-x|gap-y|inset|inset-x|inset-y|top|right|bottom|left|z)-[\w./[\]()%-]+$|^(grid|flex|hidden|block|inline-flex|sr-only|fixed|absolute|relative|sticky|shrink|grow)$/;
// Boxes with no look of their own: their size and inner spacing are the caller's to set.
const BOX_COMPONENTS = new Set(["Skeleton", "ChartContainer", "ScrollArea", "Tabs"]);
const BOX = /^(h|min-h|max-h|size|aspect|p|px|py|pt|pr|pb|pl)-[\w./[\]()%-]+$/;
const BREAKPOINT = /^(sm|md|lg|xl|2xl):/;

function allowed(token: string, component: string): boolean {
  let t = token;
  while (BREAKPOINT.test(t)) t = t.replace(BREAKPOINT, "");
  if (t.includes(":")) return false;
  return LAYOUT.test(t) || (BOX_COMPONENTS.has(component) && BOX.test(t));
}

function tsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return path === UI_DIR ? [] : tsxFiles(path);
    return entry.name.endsWith(".tsx") ? [path] : [];
  });
}

type Violation = { at: string; component: string; token: string };

function scan(file: string): Violation[] {
  const sf = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const uiNames = new Set<string>();
  const constants = new Map<string, ts.Expression>();
  for (const s of sf.statements) {
    if (ts.isImportDeclaration(s) && ts.isStringLiteral(s.moduleSpecifier)) {
      const bindings = s.importClause?.namedBindings;
      if (
        s.moduleSpecifier.text.startsWith("@/components/ui/") &&
        bindings &&
        ts.isNamedImports(bindings)
      ) {
        for (const el of bindings.elements) uiNames.add(el.name.text);
      }
    }
    if (ts.isVariableStatement(s)) {
      for (const d of s.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.initializer) constants.set(d.name.text, d.initializer);
      }
    }
  }
  if (uiNames.size === 0) return [];

  const violations: Violation[] = [];
  const at = (node: ts.Node) =>
    `${relative(ROOT, file)}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;

  // Every class string reachable from an expression, following same-file constants.
  function strings(node: ts.Node, out: string[] = []): string[] {
    if (ts.isStringLiteralLike(node)) out.push(node.text);
    else if (ts.isTemplateExpression(node)) {
      out.push(node.head.text, ...node.templateSpans.map((s) => s.literal.text));
      node.templateSpans.forEach((s) => strings(s.expression, out));
    } else if (ts.isIdentifier(node) && constants.has(node.text)) {
      strings(constants.get(node.text)!, out);
    } else if (ts.isCallExpression(node) && /Variants$/.test(node.expression.getText())) {
      // buttonVariants({ variant: "outline" }) names a variant; its arguments are not classes.
    } else ts.forEachChild(node, (child) => void strings(child, out));
    return out;
  }

  function check(node: ts.Node, component: string, classes: ts.Node) {
    for (const token of strings(classes).join(" ").split(/\s+/).filter(Boolean)) {
      if (!allowed(token, component)) violations.push({ at: at(node), component, token });
    }
  }

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const component = node.tagName.getText();
      if (uiNames.has(component)) {
        for (const attr of node.attributes.properties) {
          if (ts.isJsxAttribute(attr) && attr.name.getText() === "className" && attr.initializer) {
            check(node, component, attr.initializer);
          }
        }
      }
    }
    // cn(buttonVariants(...), "extra classes") on a plain element styled as a primitive.
    if (
      ts.isCallExpression(node) &&
      node.arguments.some(
        (a) =>
          ts.isCallExpression(a) &&
          uiNames.has(a.expression.getText()) &&
          /Variants$/.test(a.expression.getText()),
      )
    ) {
      for (const arg of node.arguments) check(node, "buttonVariants", arg);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return violations;
}

describe("components/ui usage", () => {
  it("only places primitives; their look comes from variants", () => {
    const violations = SCANNED.flatMap((dir) => tsxFiles(join(ROOT, dir))).flatMap(scan);
    expect(violations.map((v) => `${v.at} <${v.component}> ${v.token}`)).toEqual([]);
  });

  it("flags styling and accepts placement", () => {
    expect(allowed("h-11", "Button")).toBe(false);
    expect(allowed("text-base", "Button")).toBe(false);
    expect(allowed("rounded-xl", "Button")).toBe(false);
    expect(allowed("hover:bg-sunny", "Button")).toBe(false);
    expect(allowed("lg:text-lg", "Button")).toBe(false);
    expect(allowed("w-full", "Button")).toBe(true);
    expect(allowed("-mt-6", "DropdownMenuTrigger")).toBe(true);
    expect(allowed("lg:inline-flex", "DropdownMenuTrigger")).toBe(true);
    expect(allowed("h-56", "ChartContainer")).toBe(true);
    expect(allowed("rounded-full", "Skeleton")).toBe(false);
  });
});
