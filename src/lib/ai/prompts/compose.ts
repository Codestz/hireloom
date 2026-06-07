/** Prompt for composing a section as a primitive Box tree (A2 compose path). */

const COMPOSE_SCHEMA = `You compose a section of a resume as a tree of layout PRIMITIVES and return ONLY JSON (no prose, no markdown fences).

Node shapes:
- Box (container): { "kind":"box", "props":{ "display":"flex", "direction":"column"|"row", "gap":<px> }, "role"?:"work"|"education"|"skills"|"projects"|"certifications"|"summary"|"custom", "children":[ ...nodes ] }
- Heading:  { "kind":"heading", "data":{ "text":<string>, "level":1|2|3 } }
- Text:     { "kind":"text", "data":{ "text":<string> } }
- List:     { "kind":"list", "data":{ "items":[<string>, ...] } }
- Separator:{ "kind":"separator", "data":{ "variant":"dot"|"dash" } }
- Divider:  { "kind":"divider" }

Conventions: a section is a Box(role) containing a Heading (level 2) then its content. For a "Title · Company" line use a row Box [ Text(bold), Separator(dot), Text ]; for dates a row Box with a dash separator. Keep everything truthful and concise; do not invent specifics that weren't given. Output a SINGLE root box.`

export const composePrompt = (request: string): string =>
  `${COMPOSE_SCHEMA}\n\nCompose this section: ${request}\n\nJSON:`
