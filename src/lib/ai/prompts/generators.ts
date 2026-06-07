/** Prompt builders for the document generators (summary, cover letter, tailor, import, skills). */

export const summaryPrompt = (experience: string): string =>
  `Write a concise, compelling professional resume summary — 2 to 3 sentences, about 50 words, implied first person (no "I"/"my"). Use ONLY the experience below; do not invent anything. Respond with ONLY the summary text.\n\nExperience:\n${experience.slice(0, 3000)}`

export const coverLetterPrompt = (resume: string, jd: string): string =>
  `Write a focused, professional cover letter (3 short paragraphs) for the job below, drawing only on the candidate's real resume. Be specific and confident; never fabricate experience or use clichés. Respond with ONLY the letter body — no addresses, date, or "Dear Hiring Manager" header.\n\nJob description:\n${jd.slice(0, 1500)}\n\nResume:\n${resume.slice(0, 2500)}`

export const tailorPrompt = (resume: string, jd: string): string =>
  `Rewrite the candidate's professional resume summary to target the job below. Naturally adopt the job's key terminology WHERE the candidate's real experience already supports it — never claim a skill or experience not present in the resume. 2-3 sentences, implied first person (no "I"/"my"). Respond with ONLY the summary text.\n\nJOB DESCRIPTION:\n${jd.slice(0, 1500)}\n\nresume:\n${resume.slice(0, 2500)}`

export const importStructurePrompt = (text: string): string =>
  `Convert the resume text below into JSON Resume format. Respond with ONLY a JSON object, no commentary:
{"basics":{"name":"","label":"job title","email":"","phone":"","url":"","summary":"","location":{"city":""}},"work":[{"name":"company","position":"title","startDate":"","endDate":"","highlights":["bullet","bullet"]}],"education":[{"institution":"","studyType":"degree","area":"field","startDate":"","endDate":""}],"skills":[{"name":""}]}
Rules: use ONLY information present in the text; omit any field you cannot fill. Put each achievement/bullet as its own highlight string. Keep dates as written.

resume TEXT:
${text.slice(0, 6000)}

JSON:`

export const suggestSkillsPrompt = (experience: string): string =>
  `From the resume experience below, extract the concrete technical skills, tools, languages, and frameworks that are actually mentioned. Respond as a single comma-separated list — no categories, no duplicates, no commentary.\n\nExperience:\n${experience.slice(0, 3000)}`

export const mergeSkillsPrompt = (existing: Array<string>, adds: Array<string>): string =>
  `These are resume skill groups, one per line in the format "Group: item, item, item":\n${existing.join('\n')}\n\nAdd each of these skills to the single most relevant existing group: ${adds.join(', ')}.\nRules: keep the exact same groups and "Group: items" format, do NOT create new groups, do NOT duplicate, append the new skills to the end of the matching group's list. Respond with ONLY the updated groups, one per line.`
