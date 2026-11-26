const administratorRoles = new Set(['school_admin', 'super_admin']);

const cleanList = value => Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim()) : [];

function safeTextCut(value, maximumCharacters) {
  if (value.length <= maximumCharacters) return value;
  let cut = value.lastIndexOf(' ', maximumCharacters);
  if (cut < Math.floor(maximumCharacters * 0.65)) cut = maximumCharacters;

  for (const [opening, closing] of [['\\(', '\\)'], ['\\[', '\\]']]) {
    const openAt = value.lastIndexOf(opening, cut);
    const closeAt = value.lastIndexOf(closing, cut);
    if (openAt > closeAt) {
      const nextClose = value.indexOf(closing, cut);
      if (nextClose !== -1 && nextClose + closing.length <= maximumCharacters + 100) cut = nextClose + closing.length;
      else if (openAt > Math.floor(maximumCharacters * 0.65)) cut = openAt;
    }
  }

  return `${value.slice(0, cut).trim().replace(/[,:;\-]+$/u, '')}…`;
}

export function briefLessonText(value, { sentences = 1, maximumCharacters = 260 } = {}) {
  const text = typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';
  if (!text) return '';
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z0-9\\])/u).filter(Boolean);
  return safeTextCut(parts.slice(0, sentences).join(' '), maximumCharacters);
}

function compactWorkedSteps(value) {
  const steps = cleanList(value);
  const selected = steps.length <= 4 ? steps : [...steps.slice(0, 3), steps.at(-1)];
  return selected.map(step => briefLessonText(step, { sentences:1, maximumCharacters:220 })).filter(Boolean);
}

export function canSelectLessonAudience(auth) {
  return administratorRoles.has(auth?.role);
}

export function lessonAudience(auth, requestedAudience) {
  if (canSelectLessonAudience(auth)) {
    return requestedAudience === 'student' ? 'student' : 'teacher';
  }
  return auth?.role === 'teacher' ? 'teacher' : 'student';
}

export function studentLessonNotes(notes) {
  return {
    ...notes,
    exercises: Array.isArray(notes?.exercises)
      ? notes.exercises.map(exercise => ({ ...exercise, answer:'', explanation:'' }))
      : [],
    quiz: Array.isArray(notes?.quiz)
      ? notes.quiz.map(question => ({ ...question, answer:-1, explanation:'' }))
      : [],
  };
}

export function isMathematicsSubject({ subjectId = '', subjectName = '' } = {}) {
  const value = `${subjectId} ${subjectName}`.replace(/[-_]+/g, ' ').toLowerCase();
  return /\b(?:mathematics|maths?)\b/.test(value);
}

export function conciseStudentMathematicsNotes(notes) {
  const studentNotes = studentLessonNotes(notes);
  return {
    ...studentNotes,
    objectives: cleanList(studentNotes.objectives)
      .slice(0, 3)
      .map(objective => briefLessonText(objective, { sentences:1, maximumCharacters:180 })),
    keyTerms: Array.isArray(studentNotes.keyTerms)
      ? studentNotes.keyTerms
        .filter(item => item?.term)
        .slice(0, 4)
        .map(item => ({
          ...item,
          definition:briefLessonText(item.definition, { sentences:1, maximumCharacters:180 }),
        }))
      : [],
    sections: Array.isArray(studentNotes.sections)
      ? studentNotes.sections
        .filter(section => section?.heading)
        .slice(0, 3)
        .map(section => ({
          ...section,
          paragraphs:cleanList(section.paragraphs)
            .slice(0, 1)
            .map(paragraph => briefLessonText(paragraph, { sentences:1, maximumCharacters:260 }))
            .filter(Boolean),
        }))
      : [],
    examples: Array.isArray(studentNotes.examples)
      ? studentNotes.examples
        .filter(example => example?.title)
        .slice(0, 2)
        .map(example => ({ ...example, steps:compactWorkedSteps(example.steps) }))
      : [],
    summary: cleanList(studentNotes.summary)
      .slice(0, 4)
      .map(item => briefLessonText(item, { sentences:1, maximumCharacters:180 })),
  };
}

export function buildTeacherGuide({ notes, topic, subjectName, classLabel }) {
  const objectives = cleanList(notes?.objectives);
  const keyTerms = Array.isArray(notes?.keyTerms) ? notes.keyTerms.filter(item => item?.term) : [];
  const examples = Array.isArray(notes?.examples) ? notes.examples : [];
  const exercises = Array.isArray(notes?.exercises) ? notes.exercises : [];
  const quiz = Array.isArray(notes?.quiz) ? notes.quiz : [];
  const hasDiagrams = Array.isArray(notes?.illustrations) && notes.illustrations.length > 0;
  const firstObjective = objectives[0] || `Explain the main ideas in ${topic?.title || 'the lesson topic'}.`;
  const secondObjective = objectives[1] || `Apply ${topic?.title || 'the topic'} to a suitable example.`;
  const terms = keyTerms.slice(0, 4).map(item => item.term).join(', ');

  return {
    lessonTitle: topic?.title || 'Lesson',
    subjectName,
    classLabel,
    recommendedDurationMinutes: 50,
    preparation: [
      `Review the learning objectives and confirm the expected prior knowledge for ${classLabel}.`,
      terms ? `Prepare a visible vocabulary list for: ${terms}.` : 'Prepare the key vocabulary learners will need during the lesson.',
      hasDiagrams ? 'Display or print the labelled textbook diagrams before guided explanation.' : 'Prepare the worked examples and any simple classroom materials needed for demonstration.',
    ],
    successCriteria: objectives.length ? objectives : [firstObjective, secondObjective],
    sequence: [
      { phase:'Starter and prior knowledge', durationMinutes:5, activities:[`Ask a short retrieval question connected to ${topic?.title || 'the topic'}.`, 'Invite two or three responses before introducing the lesson objectives.'] },
      { phase:'Direct teaching', durationMinutes:15, activities:[firstObjective, hasDiagrams ? 'Use the labelled diagram while explaining each relevant feature.' : 'Model the central idea using the lesson explanation and key terms.'] },
      { phase:'Guided practice', durationMinutes:15, activities:[examples[0]?.title ? `Work through “${examples[0].title}” with the class.` : 'Work through the first example with the class.', 'Question learners at each step and correct misconceptions immediately.'] },
      { phase:'Independent practice', durationMinutes:10, activities:[exercises.length ? `Assign practice questions 1–${Math.min(3, exercises.length)} without displaying the answer key.` : 'Assign a short independent task.', 'Circulate, check working and note learners who need support.'] },
      { phase:'Assessment and closure', durationMinutes:5, activities:['Use the knowledge checkpoint as an exit assessment.', 'Return to the success criteria and ask learners to explain what they can now do.'] },
    ],
    teachingPrompts: [
      `What do you already know that connects to ${topic?.title || 'this topic'}?`,
      `How would you explain ${keyTerms[0]?.term || 'the main idea'} in your own words?`,
      `What mistake is someone most likely to make here, and how can it be corrected?`,
    ],
    assessmentGuidance: [
      exercises.length ? `Use practice questions 1–${Math.min(3, exercises.length)} for formative assessment.` : 'Use a short written response for formative assessment.',
      quiz.length ? `The ${quiz.length}-question checkpoint provides a quick end-of-lesson check.` : 'Ask learners to demonstrate the second success criterion before the lesson ends.',
      'Record misconceptions for reteaching; do not display the teacher answer key before learners attempt the questions.',
    ],
    homework: exercises.slice(-2).map(exercise => exercise.question),
    answerKey: {
      exercises: exercises.map((exercise, index) => ({ number:index + 1, question:exercise.question, answer:exercise.answer, explanation:exercise.explanation })),
      checkpoint: quiz.map((question, index) => ({ number:index + 1, question:question.question, correctChoice:question.choices?.[question.answer] || '', explanation:question.explanation })),
    },
  };
}

export function lessonPayloadForAudience({ auth, requestedAudience, notes, topic, subjectId, subjectName, classLabel }) {
  const audience = lessonAudience(auth, requestedAudience);
  if (audience === 'teacher') {
    return { audience, notes, teacherGuide:buildTeacherGuide({ notes, topic, subjectName, classLabel }) };
  }
  const conciseMathematics = isMathematicsSubject({ subjectId, subjectName });
  return {
    audience,
    conciseMathematics,
    notes:conciseMathematics ? conciseStudentMathematicsNotes(notes) : studentLessonNotes(notes),
  };
}
