/**
 * Sampling presets for the engine. Models decode near-deterministically by default, so
 * "Regenerate" returns the same text — temperature + topK restore variety. Structured calls
 * (skill merge, legacy chat action) intentionally stay on engine defaults.
 */
export const CREATIVE = { temperature: 1.0, topK: 8 }
