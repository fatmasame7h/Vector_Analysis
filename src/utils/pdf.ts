import type { Step } from '../components/calc/steps';

const MAP: Record<string, string> = {
  'ρ': 'rho', 'φ': 'phi', 'θ': 'theta', 'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'κ': 'kappa', 'π': 'pi', 'Δ': 'Delta',
  '∇': 'grad ', '√': 'sqrt', '²': '^2', '³': '^3', '₀': '0', '₁': '1', '₂': '2', '≈': '~', '≠': '!=', '≥': '>=', '≤': '<=',
  '−': '-', '×': 'x', '·': '*', '°': ' deg', '∥': '||', '→': '->', '∈': 'in', '•': '-', '‖': '|', '′': "'", '⃗': '', '‑': '-',
};
/** jsPDF's built-in fonts only cover Latin-1, so Greek/math symbols are transliterated. */
const ascii = (s: string) => s.replace(/[^\x00-\x7F]/g, (c) => MAP[c] ?? '');

export interface Report {
  title: string; meta: { operation: string; system?: string; method?: string };
  answer: { label: string; value: string }[]; steps: Step[];
}
export async function exportPdf(r: Report) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth() - 80, H = doc.internal.pageSize.getHeight() - 50;
  let y = 50;
  const write = (text: string, size = 10, bold = false, gap = 4) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    for (const line of doc.splitTextToSize(ascii(text), W) as string[]) {
      if (y > H) { doc.addPage(); y = 50; }
      doc.text(line, 40, y); y += size + gap;
    }
  };
  write(`VectorLab - ${r.title}`, 18, true, 8);
  write(new Date().toLocaleString(), 9, false, 10);
  write(`Operation: ${r.meta.operation}`, 11, true);
  if (r.meta.system) write(`Coordinate system: ${r.meta.system}`, 11);
  if (r.meta.method) write(`Method: ${r.meta.method}`, 11);
  y += 6; write('Final result', 13, true, 6);
  r.answer.forEach((a) => write(`${a.label}: ${a.value}`, 11));
  y += 6; write('Step-by-step solution', 13, true, 6);
  r.steps.forEach((s) => { write(s.title, 11, true); if (s.why) write(`(${s.why})`, 9); s.lines.forEach((l) => write(l, 10)); y += 4; });
  doc.save(`vectorlab-${r.title.toLowerCase().replace(/\W+/g, '-')}.pdf`);
}
