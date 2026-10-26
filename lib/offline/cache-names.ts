export const API_CACHE = "lontu-api";

// Serwist's defaultCache names for HTML and RSC payloads; `pages` is reused by our own navigation rule.
export const PAGE_CACHES = ["pages", "pages-rsc", "pages-rsc-prefetch"] as const;

// Everything that holds user data. Precached build assets are deliberately left out.
export const USER_DATA_CACHES = [API_CACHE, ...PAGE_CACHES];
