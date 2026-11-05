export const partSchemas = [
  {
    type: 'object',
    properties: {
      objectives: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 5 },
      keyTerms: { type: 'array', minItems: 4, maxItems: 6, items: { type: 'object', properties: { term: { type: 'string' }, definition: { type: 'string' } }, required: ['term', 'definition'], additionalProperties: false } },
      sections: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'object', properties: { heading: { type: 'string' }, paragraphs: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2 } }, required: ['heading', 'paragraphs'], additionalProperties: false } }
    },
    required: ['objectives', 'keyTerms', 'sections'],
    additionalProperties: false
  },
  {
    type: 'object',
    properties: {
      sections: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', properties: { heading: { type: 'string', minLength: 1 }, paragraphs: { type: 'array', items: { type: 'string', minLength: 1 }, minItems: 2, maxItems: 2 } }, required: ['heading', 'paragraphs'], additionalProperties: false } }
    },
    required: ['sections'],
    additionalProperties: false
  },
  {
    type: 'object',
    properties: {
      examples: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'object', properties: { title: { type: 'string' }, steps: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 6 } }, required: ['title', 'steps'], additionalProperties: false } },
      summary: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 6 }
    },
    required: ['examples', 'summary'],
    additionalProperties: false
  },
  {
    type: 'object',
    properties: {
      exercises: { type: 'array', minItems: 5, maxItems: 5, items: { type: 'object', properties: { question: { type: 'string' }, answer: { type: 'string' }, explanation: { type: 'string' } }, required: ['question', 'answer', 'explanation'], additionalProperties: false } },
      quiz: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', properties: { question: { type: 'string' }, choices: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 }, answer: { type: 'integer', minimum: 0, maximum: 2 }, explanation: { type: 'string' } }, required: ['question', 'choices', 'answer', 'explanation'], additionalProperties: false } }
    },
    required: ['exercises', 'quiz'],
    additionalProperties: false
  }
];
export function strings(value, minimum = 1) {
  return Array.isArray(value) && value.length >= minimum && value.every(s => typeof s === 'string' && s.trim().length > 0);
}
function sections(value, minimum) {
  return Array.isArray(value) && value.length >= minimum && value.every(s => s && typeof s.heading === 'string' && strings(s.paragraphs, 2));
}
export function validPart(value, part) {
  if (!value || typeof value !== 'object') return false;
  if (part === 0) return strings(value.objectives, 3) && Array.isArray(value.keyTerms) && value.keyTerms.length >= 4 && value.keyTerms.every(t => t && typeof t.term === 'string' && typeof t.definition === 'string') && sections(value.sections, 2);
  if (part === 1) return sections(value.sections, 3);
  if (part === 2) return Array.isArray(value.examples) && value.examples.length >= 2 && value.examples.every(e => e && typeof e.title === 'string' && strings(e.steps, 3)) && strings(value.summary, 4);
  if (part === 3) return Array.isArray(value.exercises) && value.exercises.length >= 5 && value.exercises.every(e => e && typeof e.question === 'string' && typeof e.answer === 'string' && typeof e.explanation === 'string') && Array.isArray(value.quiz) && value.quiz.length >= 3 && value.quiz.every(q => q && typeof q.question === 'string' && strings(q.choices, 3) && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length && typeof q.explanation === 'string');
  return false;
}
export function assemble(parts) {
  if (!Array.isArray(parts) || parts.length !== 4 || !parts.every((part, index) => validPart(part, index))) throw new Error('Lesson sections are incomplete.');
  return { ...parts[0], sections: [...parts[0].sections, ...parts[1].sections], ...parts[2], ...parts[3] };
}

