/**
 * Service abstractions.
 *
 * Every integration Publica will eventually need (AI, OCR, notifications,
 * file storage) sits behind an interface with a working mock implementation,
 * so the product functions end-to-end before external providers are wired in.
 * Provider selection is driven by environment variables only — no keys ever
 * live in frontend code.
 */
export * from "./ai";
export * from "./ocr";
export * from "./notifications";
export * from "./storage";
