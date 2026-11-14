import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cleanEducationalText, isChemicalEquation, normalizeChemicalMath, renderMathML, splitMathText } from '../src/math-format.mjs';

test('removes markdown and repeated escaping from generated lesson text',()=>{
  const value=String.raw`#### **Solve \\( \\frac{3}{4}x + \\frac{1}{2}x = 1 \\)?**`;
  const cleaned=cleanEducationalText(value);
  assert.equal(cleaned,String.raw`Solve \( \frac{3}{4}x + \frac{1}{2}x = 1 \)?`);
});

test('keeps the complete equation in one math segment',()=>{
  const segments=splitMathText(String.raw`**Solve \( \frac{3}{4}x + \frac{1}{2}x = 1 \)?**`);
  assert.deepEqual(segments,[
    {type:'text',value:'Solve ',display:false},
    {type:'math',value:String.raw`\frac{3}{4}x + \frac{1}{2}x = 1`,display:false},
    {type:'text',value:'?',display:false},
  ]);
});

test('renders fractions with native MathML fraction bars and variables',()=>{
  const markup=renderMathML(String.raw`\frac{3}{4}x + \frac{1}{2}x = 1`);
  assert.equal((markup.match(/<mfrac>/g)||[]).length,2);
  assert.match(markup,/<mfrac><mrow><mn>3<\/mn><\/mrow><mrow><mn>4<\/mn><\/mrow><\/mfrac><mi>x<\/mi>/);
  assert.match(markup,/<mfrac><mrow><mn>1<\/mn><\/mrow><mrow><mn>2<\/mn><\/mrow><\/mfrac><mi>x<\/mi>/);
  assert.doesNotMatch(markup,/\\frac|\\\(|\*\*/);
});

test('renders brackets in the same MathML row as their fraction',()=>{
  const markup=renderMathML(String.raw`\left(\frac{x+1}{2}\right)`);
  assert.match(markup,/<mo stretchy="true" symmetric="true">\(<\/mo>.*<mfrac>.*<mo stretchy="true" symmetric="true">\)<\/mo>/);
});

test('converts textbook slash fractions in prose but leaves years alone',()=>{
  const segments=splitMathText('Use 3/4 of the amount in the 2026/2027 session.');
  assert.ok(segments.some(segment=>segment.type==='math'&&segment.value==='3/4'));
  assert.ok(segments.some(segment=>segment.type==='text'&&segment.value.includes('2026/2027')));
});

test('treats a plain fractional equation as one expression',()=>{
  const segments=splitMathText('Solve 3/4x + 1/2x = 1.');
  assert.deepEqual(segments,[
    {type:'text',value:'Solve ',display:false},
    {type:'math',value:'3/4x + 1/2x = 1',display:false},
    {type:'text',value:'.',display:false},
  ]);
  const markup=renderMathML(segments[1].value);
  assert.equal((markup.match(/<mfrac>/g)||[]).length,2);
});

test('renders grouped scaling steps as one textbook fraction',()=>{
  const expression='3/4 = (3×5)/(4×5) = 15/20';
  const segments=splitMathText(expression);
  assert.deepEqual(segments,[{type:'math',value:expression,display:false}]);
  const markup=renderMathML(expression);
  assert.equal((markup.match(/<mfrac>/g)||[]).length,3);
  assert.match(markup,/<mfrac><mrow><mn>3<\/mn><mo>×<\/mo><mn>5<\/mn><\/mrow><mrow><mn>4<\/mn><mo>×<\/mo><mn>5<\/mn><\/mrow><\/mfrac>/);
  assert.doesNotMatch(markup,/<mfrac><mrow><mo[^>]*>\)<\/mo>/);
});

test('generation rules show equivalent fractions with explicit numerator and denominator groups',async()=>{
  const server=await readFile(new URL('../backend/server.mjs',import.meta.url),'utf8');
  assert.ok(server.includes(String.raw`Correct equivalent-fraction model: \( \frac{3}{4} = \frac{3 \times 5}{4 \times 5} = \frac{15}{20} \).`));
});

test('formats a plain simultaneous-equation practice question as a textbook system',()=>{
  const segments=splitMathText('Solve the simultaneous equations 2x + 3y = 13 and 3x - y = 5.');
  assert.deepEqual(segments,[
    {type:'text',value:'Solve the simultaneous equations ',display:false},
    {type:'math',value:String.raw`\begin{cases} 2x + 3y = 13 \\ 3x - y = 5 \end{cases}`,display:true},
    {type:'text',value:'.',display:false},
  ]);
});

test('removes legacy equation numbers while arranging a saved system',()=>{
  const segments=splitMathText('Solve: 4x + y = 11 (1) 2x - y = 1 (2).');
  const system=segments.find(segment=>segment.type==='math');
  assert.equal(system?.value,String.raw`\begin{cases} 4x + y = 11 \\ 2x - y = 1 \end{cases}`);
  assert.equal(system?.display,true);
});

test('decodes literal saved newlines before arranging a practice-question system',()=>{
  const segments=splitMathText(String.raw`Solve the simultaneous equations by substitution method: \n\n2x + y = 7 \n\nx - y = 1`);
  const system=segments.find(segment=>segment.type==='math');
  assert.equal(system?.value,String.raw`\begin{cases} 2x + y = 7 \\ x - y = 1 \end{cases}`);
  assert.equal(system?.display,true);
  assert.ok(segments.every(segment=>!segment.value.includes(String.raw`\n`)));
  assert.equal(cleanEducationalText(String.raw`x \neq y`),String.raw`x \neq y`);
});

test('combines separately delimited simultaneous equations into one display',()=>{
  const segments=splitMathText(String.raw`Solve \(2x + y = 7\) and \(x - y = 2\).`);
  assert.deepEqual(segments,[
    {type:'text',value:'Solve ',display:false},
    {type:'math',value:String.raw`\begin{cases} 2x + y = 7 \\ x - y = 2 \end{cases}`,display:true},
    {type:'text',value:'.',display:false},
  ]);
});

test('renders simultaneous equations on separate rows beneath one brace',()=>{
  const markup=renderMathML(String.raw`\begin{cases} 2x + y = 7 \\ x - y = 2 \end{cases}`);
  assert.equal((markup.match(/<mtr>/g)||[]).length,2);
  assert.match(markup,/<mo[^>]*fence="true"[^>]*>\{<\/mo><mtable/);
  assert.match(markup,/<mn>2<\/mn><mi>x<\/mi><mo>\+<\/mo><mi>y<\/mi><mo>=<\/mo><mn>7<\/mn>/);
  assert.doesNotMatch(markup,/begin|cases|end/);
});

test('generation rules require the same system layout in practice questions',async()=>{
  const server=await readFile(new URL('../backend/server.mjs',import.meta.url),'utf8');
  assert.ok(server.includes('use this layout in worked examples, practice questions, model answers and checkpoint questions'));
  assert.ok(server.includes(String.raw`Correct simultaneous-equation model: \[ \begin{cases} 2x + y = 7 \\ x - y = 2 \end{cases} \].`));
});

test('renders a square-bracket matrix as genuine rows and columns',()=>{
  const markup=renderMathML(String.raw`\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}`);
  assert.equal((markup.match(/<mtr>/g)||[]).length,2);
  assert.equal((markup.match(/<mtd>/g)||[]).length,4);
  assert.match(markup,/<mo[^>]*fence="true"[^>]*>\[<\/mo><mtable/);
  assert.match(markup,/<\/mtable><mo[^>]*fence="true"[^>]*>\]<\/mo>/);
  assert.doesNotMatch(markup,/begin|bmatrix|end|&amp;/);
});

test('keeps an assigned round-bracket matrix inside one MathML expression',()=>{
  const markup=renderMathML(String.raw`A = \begin{pmatrix} 1 & -2 \\ \frac{1}{2} & x \end{pmatrix}`);
  assert.match(markup,/<mi>A<\/mi><mo>=<\/mo><mrow><mo[^>]*>\(<\/mo><mtable/);
  assert.match(markup,/<mfrac><mrow><mn>1<\/mn><\/mrow><mrow><mn>2<\/mn><\/mrow><\/mfrac>/);
  assert.match(markup,/<\/mtable><mo[^>]*>\)<\/mo><\/mrow>/);
});

test('upgrades legacy nested-list and semicolon matrices to textbook layout',()=>{
  const nested=splitMathText('Given A = [[1, 2], [3, 4]], find det(A).');
  assert.deepEqual(nested,[
    {type:'text',value:'Given ',display:false},
    {type:'math',value:String.raw`A = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}`,display:true},
    {type:'text',value:', find det(A).',display:false},
  ]);
  const flat=splitMathText('Use [1 2; 3 4] in the calculation.');
  assert.equal(flat.find(segment=>segment.type==='math')?.value,String.raw`\begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix}`);
});

test('upgrades saved row and column matrices from production lessons',()=>{
  const segments=splitMathText('Write the system as A = [[2, 3], [4, 1]], X = [[x], [y]], and B = [[8], [7]].');
  const matrices=segments.filter(segment=>segment.type==='math');
  assert.equal(matrices.length,3);
  assert.equal(matrices[0].value,String.raw`A = \begin{bmatrix} 2 & 3 \\ 4 & 1 \end{bmatrix}`);
  assert.equal(matrices[1].value,String.raw`X = \begin{bmatrix} x \\ y \end{bmatrix}`);
  assert.equal(matrices[2].value,String.raw`B = \begin{bmatrix} 8 \\ 7 \end{bmatrix}`);
  const columnMarkup=renderMathML(matrices[1].value);
  assert.equal((columnMarkup.match(/<mtr>/g)||[]).length,2);
  assert.equal((columnMarkup.match(/<mtd>/g)||[]).length,2);

  const row=splitMathText('Use R = [[1, 2, 3]] in the calculation.');
  assert.equal(row.find(segment=>segment.type==='math')?.value,String.raw`R = \begin{bmatrix} 1 & 2 & 3 \end{bmatrix}`);
});

test('leaves an ordinary closed interval unchanged',()=>{
  assert.deepEqual(splitMathText('Use the interval [0, 1].'),[
    {type:'text',value:'Use the interval [0, 1].',display:false},
  ]);
});

test('renders determinant notation with vertical matrix bars',()=>{
  const markup=renderMathML(String.raw`\begin{vmatrix} a & b \\ c & d \end{vmatrix}`);
  assert.equal((markup.match(/<mtr>/g)||[]).length,2);
  assert.equal((markup.match(/fence="true">\|<\/mo>/g)||[]).length,2);
});

test('generation rules require true matrix layout throughout lesson content',async()=>{
  const server=await readFile(new URL('../backend/server.mjs',import.meta.url),'utf8');
  assert.ok(server.includes('Apply true matrix layout in worked examples, practice questions, model answers and checkpoint questions'));
  assert.ok(server.includes(String.raw`Correct matrix model: \[ A = \begin{bmatrix} 1 & 2 \\ 3 & 4 \end{bmatrix} \].`));
});

test('normalises raw and plain chemical formula numbers as subscripts',()=>{
  assert.equal(normalizeChemicalMath('2H_2 + O_2 → 2H_2O'),'2H_{2} + O_{2} → 2H_{2}O');
  assert.equal(normalizeChemicalMath('2H2 + O2 -> 2H2O'),'2H_{2} + O_{2} → 2H_{2}O');
  assert.equal(normalizeChemicalMath('CaCO3(s) → CaO(s) + CO2(g)'),String.raw`CaCO_{3}\text{(s)} → CaO\text{(s)} + CO_{2}\text{(g)}`);
});

test('detects a balanced reaction inside prose and renders true MathML subscripts',()=>{
  const segments=splitMathText('Water forms according to 2H_2 + O_2 → 2H_2O.');
  const equation=segments.find(segment=>segment.type==='chemistry');
  assert.equal(equation?.value,'2H_{2} + O_{2} → 2H_{2}O');
  const markup=renderMathML(equation.value);
  assert.equal((markup.match(/<msub>/g)||[]).length,3);
  assert.match(markup,/<mn>2<\/mn><msub><mi>H<\/mi><mrow><mn>2<\/mn><\/mrow><\/msub>/);
  assert.doesNotMatch(markup,/>_|_</);
});

test('keeps coefficients baseline and renders explicit ionic charges as superscripts',()=>{
  const normalized=normalizeChemicalMath('2Fe^{3+} + 3SO₄²⁻ → Fe2(SO4)3');
  assert.equal(normalized,'2Fe^{3+} + 3SO_{4}^{2-} → Fe_{2}(SO_{4})_{3}');
  const markup=renderMathML(normalized);
  assert.ok((markup.match(/<msup>|<msubsup>/g)||[]).length>=2);
  assert.match(markup,/^<math[^>]*>.*<mn>2<\/mn><msup>/);
});

test('does not mistake British curriculum class labels for chemical formulae',()=>{
  assert.equal(isChemicalEquation('KS3 Science'),false);
  assert.deepEqual(splitMathText('Suitable for KS3 and JSS2 learners.'),[
    {type:'text',value:'Suitable for KS3 and JSS2 learners.',display:false},
  ]);
});
