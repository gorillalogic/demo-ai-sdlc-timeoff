// Single in-memory store shared by the whole app. Resets on restart.
export const store: Map<string, unknown> = new Map();
