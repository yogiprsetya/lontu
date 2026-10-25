import crypto from "node:crypto";
import { serwist } from "@serwist/next/config";

export default await serwist({
  swSrc: "worker/sw.ts",
  swDest: "public/sw.js",
  // Prerendered (app) shells only hold the Suspense skeleton; serving them offline would show it forever.
  precachePrerendered: false,
  additionalPrecacheEntries: [{ url: "/~offline", revision: process.env.VERCEL_GIT_COMMIT_SHA ?? crypto.randomUUID() }],
});
