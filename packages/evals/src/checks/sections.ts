export const ANSWER_SECTIONS: readonly string[] = ['What the system received', 'Actions taken', 'Actions refused', 'Escalated', 'What failed', 'Final result'];

/** Extract standalone Markdown bold or heading sections, preserving their bodies. */
export function textSections(text: string): { title: string; body: string }[] {
  const marks = [...text.matchAll(/^[\t ]*(?:#{1,6}[\t ]+(.+?)|\*\*(.+?)\*\*)[\t ]*\r?$/gm)];
  return marks.map((mark, i) => ({
    title: (mark[1] ?? mark[2] ?? '').replace(/[\t ]+#+[\t ]*$/, '').replace(/^\*\*(.*?)\*\*$/, '$1').trim().toLowerCase(),
    body: text.slice(mark.index! + mark[0].length, marks[i + 1]?.index ?? text.length).trim(),
  }));
}

/** Return required ANSWER section names that lack a standalone bold or heading line. */
export function missingAnswerSections(answer: string): string[] {
  const found = new Set(textSections(answer).map((section) => section.title));
  return ANSWER_SECTIONS.filter((name) => !found.has(name.toLowerCase()));
}

/** Require a decision-step body or a non-placeholder handover body in the rendered reasoning. */
export function hasReasoning(reasoning: string): boolean {
  return textSections(reasoning).some(({ title, body }) =>
    (/^(?:step|decision)\s+\d+\b/.test(title) || title === 'handover') && !!body && !/^[_*]*(?:none|no|nothing)[.!]?[_*]*$/i.test(body));
}
