export type Topic = { id: string; title: string; term: number; objectives: string[] };
export type Plan = { topics: Topic[]; provenance: string };
export type IllustrationElement = {
  kind: 'circle' | 'ellipse' | 'rect' | 'line' | 'arrow' | 'polygon' | 'polyline' | 'text' | 'callout' | 'map' | 'specimen' | 'anatomy';
  x: number;
  y: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
  points: string;
  label: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  fontSize: number;
  mapId: '' | 'nigeria' | 'africa' | 'west-africa';
  specimenId: '' | 'flowering-plant' | 'goat-external' | 'bird-external' | 'fish-external';
  anatomyId: '' | 'digestive-system' | 'respiratory-system' | 'circulatory-system' | 'skeletal-system' | 'nervous-system' | 'urinary-system' | 'endocrine-system' | 'lymphatic-system' | 'muscular-system' | 'female-reproductive-system';
  regionIds: string;
};
export type LessonIllustration = {
  title: string;
  description: string;
  elements: IllustrationElement[];
};
export type Notes = {
  objectives: string[];
  keyTerms: { term: string; definition: string }[];
  sections: { heading: string; paragraphs: string[] }[];
  examples: { title: string; steps: string[] }[];
  summary: string[];
  exercises: { question: string; answer: string; explanation: string }[];
  quiz: { question: string; choices: string[]; answer: number; explanation: string }[];
  illustrations?: LessonIllustration[];
  illustrationStatus?: 'generated' | 'not-needed';
  illustrationVersion?: 6;
};
export type NoteRecord = { id: string; profile: string; year: number; subjectId: string; topic: Topic; read: boolean; bookmarked: boolean; score?: number };

