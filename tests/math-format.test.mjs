import test from 'node:test';
import assert from 'node:assert/strict';
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
