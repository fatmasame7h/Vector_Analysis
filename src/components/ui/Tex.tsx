import katex from 'katex';
import 'katex/dist/katex.min.css';

export default function Tex({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = katex.renderToString(tex, { throwOnError: false, displayMode: display });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
