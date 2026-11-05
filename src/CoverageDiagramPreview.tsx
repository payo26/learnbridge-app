import { LessonIllustrationView } from './NotesReader';
// The coverage catalogue is deliberately shared with the API so this page
// previews the exact diagrams that are persisted in saved lessons.
// @ts-expect-error The catalogue is a checked JavaScript module used by Node and Vite.
import { curatedDiagramPreviews } from '../backend/diagram-coverage.mjs';
import type { LessonIllustration } from '../shared/notes-types';

const diagrams=curatedDiagramPreviews() as LessonIllustration[];

export default function CoverageDiagramPreview() {
  return <main className='diagram-preview-page'>
    <header><span>LearnBridge localhost test</span><strong>Diagram coverage renderer 6</strong></header>
    <section className='diagram-preview-intro'>
      <span className='eyebrow'>TEXTBOOK DIAGRAM QUALITY CHECK</span>
      <h1>Required-topic diagram catalogue</h1>
      <p>These are the built-in, deterministic diagrams used for high-priority topics. Labels are laid out outside the subject and linked directly to the feature they identify.</p>
    </section>
    <section className='diagram-preview-list'>{diagrams.map((diagram,index)=><LessonIllustrationView key={diagram.title} illustration={diagram} index={index}/>)}</section>
  </main>;
}
