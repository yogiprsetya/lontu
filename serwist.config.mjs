import { serwist } from "@serwist/next/config";

export default await serwist({
  swSrc: "worker/sw.ts",
  swDest: "public/sw.js",
  // Prerendered (app) shells only hold the Suspense skeleton; serving them offline would show it forever.
  precachePrerendered: false,
});
