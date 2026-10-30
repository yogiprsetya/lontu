/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import {
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  type PrecacheEntry,
  type RuntimeCaching,
  Serwist,
} from "serwist";
import { API_CACHE } from "@/lib/offline/cache-names";

declare global {
  interface WorkerGlobalScope {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const THIRTY_DAYS = 30 * 24 * 60 * 60;

// Only 200s: never store 401s, errors, or the opaque redirect to /login.
const okOnly = () => new CacheableResponsePlugin({ statuses: [200] });

const lontuCaching: RuntimeCaching[] = [
  {
    matcher: ({ sameOrigin, url: { pathname } }) =>
      sameOrigin &&
      (pathname.startsWith("/api/auth/") ||
        pathname === "/api/transactions/export" ||
        pathname === "/login"),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && pathname.startsWith("/api/"),
    method: "GET",
    handler: new NetworkFirst({
      cacheName: API_CACHE,
      networkTimeoutSeconds: 4,
      plugins: [
        okOnly(),
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: THIRTY_DAYS,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: ({ request, sameOrigin }) => sameOrigin && request.mode === "navigate",
    handler: new NetworkFirst({
      cacheName: "pages",
      networkTimeoutSeconds: 4,
      plugins: [
        okOnly(),
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: THIRTY_DAYS,
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // The user decides when a new version takes over, so a half-filled form is never reloaded away.
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...lontuCaching, ...defaultCache],
  fallbacks: {
    entries: [{ url: "/~offline", matcher: ({ request }) => request.destination === "document" }],
  },
});

serwist.addEventListeners();
