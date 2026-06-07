/**
 * AI service — the public surface for every resume AI feature. This file is a thin BARREL: the
 * implementations live in `features/` (orchestration), `prompts/` (every prompt), and route
 * through `engine.ts` (device on-device model, or the user's Gemini key — callers never know
 * which). Import from here; the internals can be reorganized without touching call sites.
 */
export { aiActionsAvailable } from './features/availability'
export { transformText, transformTextStream } from './features/transform'
export {
  streamPrompt,
  generateSummary,
  generateCoverLetter,
  tailorSummary,
  structureResumeJson,
} from './features/generators'
export { suggestSkills, mergeSkills } from './features/skills'
export { composeBlock } from './features/compose'
export { chatBuildCanvas, chatEdit } from './features/chat'
export type { ChatResult, ChatAction } from './features/chat'
export { TEXT_ACTIONS } from './prompts/text-actions'
export type { TextAction } from './prompts/text-actions'
