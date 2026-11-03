export interface Step { title: string; why?: string; lines: string[] }

/** Standard solution layout: Given → Required → Formula → Substitution → Intermediate → Final answer. */
export function solution(o: {
  given: string[]; required: string; formula: string[]; substitution: string[]; intermediate?: string[]; final: string[];
  why?: { formula?: string; substitution?: string; intermediate?: string };
}): Step[] {
  const s: Step[] = [
    { title: 'Given', why: 'These are the values you entered.', lines: o.given },
    { title: 'Required', lines: [o.required] },
    { title: 'Formula', why: o.why?.formula, lines: o.formula },
    { title: 'Substitution', why: o.why?.substitution ?? 'Your values replace the symbols in the formula.', lines: o.substitution },
  ];
  if (o.intermediate?.length) s.push({ title: 'Intermediate calculations', why: o.why?.intermediate, lines: o.intermediate });
  s.push({ title: 'Final answer', lines: o.final });
  return s;
}
