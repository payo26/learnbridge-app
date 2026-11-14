import MathText from './MathText';

const samples=[
  {
    title:'Reported equation',
    description:'Repeated escaping and Markdown are cleaned before the whole expression is typeset.',
    text:String.raw`**Solve \\( \\frac{3}{4}x + \\frac{1}{2}x = 1 \\)?**`,
  },
  {
    title:'Plain slash input',
    description:'Short slash fractions are converted to stacked textbook fractions.',
    text:'Calculate 3/4x + 1/2x = 1.',
  },
  {
    title:'Equivalent-fraction scaling',
    description:'Grouped numerator and denominator calculations remain inside one fraction bar.',
    text:'3/4 = (3×5)/(4×5) = 15/20',
  },
  {
    title:'Saved simultaneous-equation practice question',
    description:'Literal saved newline markers are decoded and the equations are arranged as a textbook system.',
    text:String.raw`Solve the simultaneous equations by substitution method: \n\n2x + y = 7 \n\nx - y = 1`,
  },
  {
    title:'Further Mathematics matrix',
    description:'Entries are arranged in true rows and columns within correctly sized square brackets.',
    text:String.raw`Given \( A = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} \), find the determinant of A.`,
  },
  {
    title:'Saved matrix and column vectors',
    description:'Older nested-list matrices and vectors are upgraded automatically to textbook matrix notation.',
    text:'Write the system as A = [[2, 3], [4, 1]], X = [[x], [y]], and B = [[8], [7]].',
  },
  {
    title:'Stretching round brackets',
    description:'Both brackets are in the same MathML row as the fraction.',
    text:String.raw`Simplify \( \left(\frac{x+1}{2}\right) + \frac{3}{5} \).`,
  },
  {
    title:'Powers and roots',
    description:'Superscripts, square roots, operators and fractions share one baseline.',
    text:String.raw`Evaluate \( \sqrt{x^2 + \frac{1}{4}} \).`,
  },
  {
    title:'Balanced chemical equation',
    description:'Coefficients remain on the baseline while atom counts become true subscripts.',
    text:String.raw`Water forms according to \( 2H_{2}(g) + O_{2}(g) \rightarrow 2H_{2}O(l) \).`,
  },
];

export default function MathPreview() {
  return <main className='math-preview-page'>
    <header><span>LearnBridge localhost test</span><strong>Native MathML renderer 4</strong></header>
    <section className='math-preview-intro'>
      <span className='eyebrow'>EQUATION QUALITY CHECK</span>
      <h1>Textbook mathematics and chemistry notation</h1>
      <p>Review every sample at normal browser zoom and on the screen sizes you intend to support.</p>
    </section>
    <section className='math-preview-grid'>{samples.map(sample=><article key={sample.title}>
      <h2>{sample.title}</h2>
      <p>{sample.description}</p>
      <div className='math-preview-example'><MathText text={sample.text}/></div>
    </article>)}</section>
    <p className='math-preview-note'>This page uses the same MathText component used by lesson explanations, worked examples, exercises, model answers and checkpoint choices.</p>
  </main>;
}
