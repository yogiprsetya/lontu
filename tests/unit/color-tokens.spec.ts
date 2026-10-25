import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  return css.slice(start, css.indexOf("}", start));
}

function token(scope: string, name: string): [number, number, number] {
  const match = block(scope).match(new RegExp(`--${name}:\\s*oklch\\(([\\d.]+) ([\\d.]+) ([\\d.]+)\\)`));
  if (!match) throw new Error(`--${name} missing in ${scope}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

// OKLCH → linear sRGB (Björn Ottosson's reference matrices), clamped to gamut.
function luminance([l, c, h]: [number, number, number]): number {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const r = clamp(4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_);
  const g = clamp(-1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_);
  const bl = clamp(-0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

function contrast(x: [number, number, number], y: [number, number, number]): number {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each([":root", ".dark"])("semantic color tokens in %s", (scope) => {
  it.each(["income", "expense", "budget", "transfer"])("--%s has at least 4.5:1 contrast on --background", (name) => {
    expect(contrast(token(scope, name), token(scope, "background"))).toBeGreaterThanOrEqual(4.5);
  });
});

const CHARTS = ["chart-1", "chart-2", "chart-3", "chart-4", "chart-5"];

describe.each([":root", ".dark"])("chart color tokens in %s", (scope) => {
  // WCAG 1.4.11: graphical objects need 3:1. "Lainnya" uses --muted-foreground.
  it.each([...CHARTS, "muted-foreground"])("--%s has at least 3:1 contrast on --background", (name) => {
    expect(contrast(token(scope, name), token(scope, "background"))).toBeGreaterThanOrEqual(3);
  });

  it("gives every category slice its own hue", () => {
    const hues = CHARTS.map((name) => token(scope, name));
    for (const [i, [, c1, h1]] of hues.entries()) {
      expect(c1).toBeGreaterThanOrEqual(0.1);
      for (const [, , h2] of hues.slice(i + 1)) {
        const gap = Math.abs(h1 - h2) % 360;
        expect(Math.min(gap, 360 - gap)).toBeGreaterThanOrEqual(40);
      }
    }
  });
});
