const COMMAND_SYMBOLS = Object.freeze({
  times: '×', cdot: '⋅', div: '÷', pm: '±', mp: '∓',
  le: '≤', leq: '≤', ge: '≥', geq: '≥', neq: '≠', ne: '≠',
  approx: '≈', equiv: '≡', propto: '∝', infty: '∞',
  to: '→', rightarrow: '→', longrightarrow: '→', leftarrow: '←',
  leftrightharpoons: '⇌', rightleftharpoons: '⇌',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', theta: 'θ',
  lambda: 'λ', mu: 'μ', pi: 'π', rho: 'ρ', sigma: 'σ', omega: 'ω',
  Delta: 'Δ', Sigma: 'Σ', Omega: 'Ω',
});

const UNICODE_FRACTIONS = Object.freeze({
  '½':['1','2'], '⅓':['1','3'], '⅔':['2','3'], '¼':['1','4'], '¾':['3','4'],
  '⅕':['1','5'], '⅖':['2','5'], '⅗':['3','5'], '⅘':['4','5'],
  '⅙':['1','6'], '⅚':['5','6'], '⅛':['1','8'], '⅜':['3','8'], '⅝':['5','8'], '⅞':['7','8'],
});

const escapeXml = value => String(value)
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
  .replaceAll('"','&quot;').replaceAll("'",'&apos;');

function collapseMathBackslashes(value) {
  let result=String(value);
  const doubled=/\\\\(?=(?:begin|end|frac|sqrt|text|left|right|times|cdot|div|pm|mp|leq?|geq?|neq?|approx|equiv|propto|infty|to|right(?:arrow|leftharpoons)|longrightarrow|leftrightharpoons|leftarrow|alpha|beta|gamma|delta|theta|lambda|mu|pi|rho|sigma|omega|Delta|Sigma|Omega)\b|[()[\]])/g;
  for(let pass=0;pass<4;pass++) {
    const next=result.replace(doubled,'\\');
    if(next===result)break;
    result=next;
  }
  return result;
}

function matchingDelimiterIndex(value,start) {
  const pairs={ '(':')', '[':']' };
  const opening=value[start];
  const closing=pairs[opening];
  if(!closing)return -1;
  let depth=0;
  for(let index=start;index<value.length;index++) {
    if(value[index]===opening)depth++;
    else if(value[index]===closing) {
      depth--;
      if(depth===0)return index;
    }
  }
  return -1;
}

// AI-authored and legacy notes sometimes express a complex fraction as
// (numerator)/(denominator). Convert the grouping parentheses into a real
// fraction before tokenisation; otherwise the infix slash sees only the two
// adjacent brackets as its operands and scatters the equation.
function normalizeGroupedSlashFractions(value) {
  let result=String(value);
  for(let pass=0;pass<4;pass++) {
    let output='';
    let cursor=0;
    let changed=false;
    for(let index=0;index<result.length;index++) {
      if(result[index]!=='('&&result[index]!=='[')continue;
      const numeratorEnd=matchingDelimiterIndex(result,index);
      if(numeratorEnd<0)continue;
      let slashIndex=numeratorEnd+1;
      while(/\s/.test(result[slashIndex]||''))slashIndex++;
      if(result[slashIndex]!=='/')continue;
      let denominatorStart=slashIndex+1;
      while(/\s/.test(result[denominatorStart]||''))denominatorStart++;
      if(result[denominatorStart]!=='('&&result[denominatorStart]!=='[')continue;
      const denominatorEnd=matchingDelimiterIndex(result,denominatorStart);
      if(denominatorEnd<0)continue;
      const numerator=result.slice(index+1,numeratorEnd);
      const denominator=result.slice(denominatorStart+1,denominatorEnd);
      output+=result.slice(cursor,index)+`\\frac{${numerator}}{${denominator}}`;
      cursor=denominatorEnd+1;
      index=denominatorEnd;
      changed=true;
    }
    if(!changed)break;
    result=output+result.slice(cursor);
  }
  return result;
}

const ALGEBRA_NUMBER = String.raw`(?:\d+(?:\.\d+)?|\d+[ \t]*\/[ \t]*\d+)`;
const ALGEBRA_VARIABLE_TERM = String.raw`(?:(?:${ALGEBRA_NUMBER})[ \t]*(?:[×*][ \t]*)?)?[A-Za-z]`;
const ALGEBRA_ATOM = String.raw`(?:${ALGEBRA_VARIABLE_TERM}|${ALGEBRA_NUMBER})`;
const ALGEBRA_SIDE = String.raw`[+\-−]?[ \t]*${ALGEBRA_ATOM}(?:[ \t]*[+\-−][ \t]*${ALGEBRA_ATOM})*`;
const LINEAR_EQUATION_SOURCE = String.raw`${ALGEBRA_SIDE}[ \t]*=[ \t]*${ALGEBRA_SIDE}`;
const COMPLETE_LINEAR_EQUATION_PATTERN = new RegExp(String.raw`^${LINEAR_EQUATION_SOURCE}$`);
const LINEAR_EQUATION_PATTERN = new RegExp(String.raw`(?<![A-Za-z0-9_])${LINEAR_EQUATION_SOURCE}(?![A-Za-z0-9_])`,'g');

function isLinearEquation(value) {
  return COMPLETE_LINEAR_EQUATION_PATTERN.test(String(value).trim());
}

function equationVariables(value) {
  return new Set((String(value).match(/[A-Za-z]/g)||[]).map(variable=>variable.toLowerCase()));
}

function isSimultaneousPair(first,second) {
  if(!isLinearEquation(first)||!isLinearEquation(second))return false;
  const firstVariables=equationVariables(first);
  const secondVariables=equationVariables(second);
  const union=new Set([...firstVariables,...secondVariables]);
  return union.size>=2&&[...firstVariables].some(variable=>secondVariables.has(variable));
}

function casesExpression(equations) {
  return String.raw`\begin{cases} ${equations.join(String.raw` \\ `)} \end{cases}`;
}

function findPlainSimultaneousSystem(value) {
  LINEAR_EQUATION_PATTERN.lastIndex=0;
  const matches=[...String(value).matchAll(LINEAR_EQUATION_PATTERN)];
  for(let index=0;index<matches.length-1;index++) {
    const first=matches[index];
    const second=matches[index+1];
    const firstEnd=(first.index||0)+first[0].length;
    const secondStart=second.index||0;
    const separator=String(value).slice(firstEnd,secondStart);
    if(!/^\s*(?:\(\s*\d+\s*\)\s*)?(?:(?:,|;|\band\b|\btogether\s+with\b)\s*)?$/i.test(separator))continue;
    if(!isSimultaneousPair(first[0],second[0]))continue;
    const secondEnd=secondStart+second[0].length;
    const trailingLabel=String(value).slice(secondEnd).match(/^\s*\(\s*\d+\s*\)/)?.[0]||'';
    return {
      start:first.index||0,
      end:secondEnd+trailingLabel.length,
      equations:[first[0].trim(),second[0].trim()],
    };
  }
  return null;
}

function parseEquationEnvironment(value) {
  let input=String(value).trim();
  let brace=false;
  if(/^\\left\s*\\\{/.test(input)) {
    brace=true;
    input=input.replace(/^\\left\s*\\\{\s*/,'').replace(/\s*\\right\s*\.\s*$/,'');
  }
  const match=input.match(/^\\begin\{(cases|aligned|array)\}(?:\{[^{}]*\})?([\s\S]*?)\\end\{\1\}$/);
  if(!match)return null;
  const rows=match[2]
    .split(/\\\\(?:\[[^\]]*\])?|\n+/)
    .map(row=>row.replaceAll('&','').trim())
    .filter(Boolean);
  if(rows.length<2||!rows.every(row=>row.includes('=')))return null;
  return { rows, brace:brace||match[1]==='cases' };
}

const MATRIX_ENVIRONMENT_PATTERN = /\\begin\{(matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|array)\}(?:\{[^{}]*\})?([\s\S]*?)\\end\{\1\}/g;
const MATRIX_FENCES = Object.freeze({
  matrix:null,
  array:null,
  pmatrix:['(',')'],
  bmatrix:['[',']'],
  Bmatrix:['{','}'],
  vmatrix:['|','|'],
  Vmatrix:['‖','‖'],
});

function parseMatrixRows(value) {
  const rows=String(value)
    .split(/\\\\(?:\[[^\]]*\])?|\n+/)
    .map(row=>row.trim())
    .filter(Boolean)
    .map(row=>row.split('&').map(cell=>cell.trim()));
  if(!rows.length||rows.some(row=>!row.length||row.some(cell=>!cell)))return null;
  const columnCount=rows[0].length;
  if(rows.some(row=>row.length!==columnCount))return null;
  return rows;
}

function matrixExpression(rows,environment='bmatrix') {
  return `\\begin{${environment}} ${rows.map(row=>row.join(' & ')).join(String.raw` \\ `)} \\end{${environment}}`;
}

function isPlainMatrixCell(value) {
  const cell=String(value).trim();
  return Boolean(cell&&cell.length<=60&&/^[A-Za-z0-9.+\-−×*\/=(){}_^\\\s]+$/u.test(cell));
}

function parsePlainMatrix(value) {
  const candidate=String(value).trim();
  if(!candidate.startsWith('[')||!candidate.endsWith(']'))return null;
  const inner=candidate.slice(1,-1).trim();
  let rows=[];
  if(inner.startsWith('[')) {
    const matches=[...inner.matchAll(/\[([^\[\]]+)\]/g)];
    if(!matches.length)return null;
    const remainder=inner.replace(/\[[^\[\]]+\]/g,'').replace(/[\s,]/g,'');
    if(remainder)return null;
    rows=matches.map(match=>{
      const row=match[1].trim();
      return row.includes(',')?row.split(',').map(cell=>cell.trim()):row.split(/\s+/);
    });
  } else {
    if(!/[;\n]/.test(inner))return null;
    rows=inner.split(/;|\n+/).map(row=>{
      const trimmed=row.trim();
      return trimmed.includes(',')?trimmed.split(',').map(cell=>cell.trim()):trimmed.split(/\s+/);
    }).filter(row=>row.some(Boolean));
  }
  if(!rows.length||!rows[0].length||rows.length*rows[0].length<2)return null;
  const columnCount=rows[0].length;
  if(rows.some(row=>row.length!==columnCount||row.some(cell=>!isPlainMatrixCell(cell))))return null;
  return rows;
}

function findPlainMatrix(value) {
  const text=String(value);
  for(let start=0;start<text.length;start++) {
    if(text[start]!=='[')continue;
    const end=matchingDelimiterIndex(text,start);
    if(end<0)continue;
    const rows=parsePlainMatrix(text.slice(start,end+1));
    if(!rows)continue;
    let expressionStart=start;
    let assignment='';
    const assignmentMatch=text.slice(0,start).match(/([A-Za-z](?:_[A-Za-z0-9{}]+)?\s*=\s*)$/);
    if(assignmentMatch) {
      assignment=assignmentMatch[1];
      expressionStart=start-assignment.length;
    }
    return {
      start:expressionStart,
      end:end+1,
      expression:`${assignment}${matrixExpression(rows)}`.trim(),
    };
  }
  return null;
}

function containsMatrixEnvironment(value) {
  MATRIX_ENVIRONMENT_PATTERN.lastIndex=0;
  return MATRIX_ENVIRONMENT_PATTERN.test(String(value));
}

function findBareMatrixEnvironment(value) {
  const text=String(value);
  MATRIX_ENVIRONMENT_PATTERN.lastIndex=0;
  for(const match of text.matchAll(MATRIX_ENVIRONMENT_PATTERN)) {
    if(!parseMatrixRows(match[2]))continue;
    let start=match.index||0;
    const assignmentMatch=text.slice(0,start).match(/([A-Za-z](?:_[A-Za-z0-9{}]+)?\s*=\s*)$/);
    if(assignmentMatch)start-=assignmentMatch[1].length;
    return {start,end:(match.index||0)+match[0].length,expression:text.slice(start,(match.index||0)+match[0].length).trim()};
  }
  return null;
}

const CHEMICAL_ELEMENT = String.raw`(?:Ac|Ag|Al|Am|Ar|As|At|Au|Ba|Be|Bh|Bi|Bk|Br|Ca|Cd|Ce|Cf|Cl|Cm|Cn|Co|Cr|Cs|Cu|Db|Ds|Dy|Er|Es|Eu|Fe|Fl|Fm|Fr|Ga|Gd|Ge|He|Hf|Hg|Ho|Hs|In|Ir|Kr|La|Li|Lr|Lu|Lv|Mc|Md|Mg|Mn|Mo|Mt|Na|Nb|Nd|Ne|Nh|Ni|No|Np|Og|Os|Pa|Pb|Pd|Pm|Po|Pr|Pt|Pu|Ra|Rb|Re|Rf|Rg|Rh|Rn|Ru|Sb|Sc|Se|Sg|Si|Sm|Sn|Sr|Ta|Tb|Tc|Te|Th|Ti|Tl|Tm|Ts|Xe|Yb|Zn|Zr|B|C|F|H|I|K|N|O|P|S|U|V|W|Y)`;
const CHEMICAL_SUBSCRIPT = String.raw`(?:_\{?\d+\}?|[₀₁₂₃₄₅₆₇₈₉]+|\d+)`;
const CHEMICAL_UNIT = String.raw`(?:${CHEMICAL_ELEMENT}(?:${CHEMICAL_SUBSCRIPT})?|\((?:${CHEMICAL_ELEMENT}(?:${CHEMICAL_SUBSCRIPT})?)+\)(?:${CHEMICAL_SUBSCRIPT})?)`;
const CHEMICAL_BODY = String.raw`(?:${CHEMICAL_UNIT})+(?:[·⋅.]\d*(?:${CHEMICAL_UNIT})+)*`;
const CHEMICAL_CHARGE = String.raw`(?:\^\{?\d*[+-]\}?|[⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻])?`;
const CHEMICAL_STATE = String.raw`(?:\((?:aq|s|l|g)\))?`;
const CHEMICAL_FORMULA = String.raw`(?:\d+\s*)?${CHEMICAL_BODY}${CHEMICAL_CHARGE}${CHEMICAL_STATE}`;
const CHEMICAL_OPERATOR = String.raw`(?:\+|→|⇌|↔|⇄|⟶|⟷|->|=>|<=>|\\(?:to|rightarrow|longrightarrow|leftrightharpoons|rightleftharpoons))`;
const CHEMICAL_EQUATION_PATTERN = new RegExp(String.raw`(?<![A-Za-z0-9_])${CHEMICAL_FORMULA}(?:\s*${CHEMICAL_OPERATOR}\s*${CHEMICAL_FORMULA})+(?![A-Za-z0-9_])`,'gu');
const CHEMICAL_FORMULA_PATTERN = new RegExp(String.raw`(?<![A-Za-z0-9_])${CHEMICAL_FORMULA}(?![A-Za-z0-9_])`,'gu');
const REACTION_ARROW_PATTERN = /(?:→|⇌|↔|⇄|⟶|⟷|->|=>|<=>|\\(?:to|rightarrow|longrightarrow|leftrightharpoons|rightleftharpoons))/u;
const SUBSCRIPT_DIGITS = Object.freeze({ '₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9' });
const SUPERSCRIPT_CHARACTERS = Object.freeze({ '⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁺':'+','⁻':'-' });

const mapCharacters = (value,map) => [...value].map(character => map[character] ?? character).join('');

export function normalizeChemicalMath(value) {
  return collapseMathBackslashes(value ?? '')
    .replace(/<=>/g,'⇌')
    .replace(/(?:->|=>)/g,'→')
    .replace(/\\(?:leftrightharpoons|rightleftharpoons)\b/g,'⇌')
    .replace(/\\(?:to|rightarrow|longrightarrow)\b/g,'→')
    .replace(/([A-Za-z)\]])([₀₁₂₃₄₅₆₇₈₉]+)/gu,(_,base,digits)=>`${base}_{${mapCharacters(digits,SUBSCRIPT_DIGITS)}}`)
    .replace(/_\{?(\d+)\}?/g,'_{$1}')
    .replace(/([A-Z][a-z]?|\)|\])(\d+)/g,'$1_{$2}')
    .replace(/([⁰¹²³⁴⁵⁶⁷⁸⁹]*[⁺⁻])/gu,charge=>`^{${mapCharacters(charge,SUPERSCRIPT_CHARACTERS)}}`)
    .replace(/\^\{?(\d*[+-])\}?/g,'^{$1}')
    .replace(/\((aq|s|l|g)\)/gi,(_,state)=>String.raw`\text{(${state.toLowerCase()})}`)
    .replace(/\s+/g,' ')
    .trim();
}

export function isChemicalEquation(value) {
  const text=collapseMathBackslashes(value ?? '').trim();
  if(!REACTION_ARROW_PATTERN.test(text))return false;
  CHEMICAL_EQUATION_PATTERN.lastIndex=0;
  const match=CHEMICAL_EQUATION_PATTERN.exec(text);
  return Boolean(match&&match.index===0&&match[0].length===text.length);
}

export function cleanEducationalText(value) {
  return collapseMathBackslashes(value ?? '')
    .replace(/\\r\\n|\\n\\n|\\r\\r/g,match=>match==='\\n\\n'?'\n\n':'\n')
    .replace(/\\n(?=\s|$)|\\r(?=\s|$)/g,'\n')
    .replace(/\r\n?/g,'\n')
    .replace(/^\s{0,3}#{1,6}\s+/gm,'')
    .replace(/\*\*([\s\S]*?)\*\*/g,'$1')
    .replace(/__([\s\S]*?)__/g,'$1')
    .replace(/`([^`]+)`/g,'$1')
    .trim();
}

function looksLikeEquation(value) {
  const text=value.trim();
  if(!text || text.length>220)return false;
  const hasFraction=/\\frac\s*\{|(?<![\d/])\d{1,3}\s*\/\s*\d{1,3}(?![\d/])|[\u00bc-\u00be\u2150-\u215e]|[)\]]\s*\/\s*[(\[]/u.test(text);
  const hasLinearEquation=isLinearEquation(text);
  const hasStructure=/[=+−×÷<>]|≤|≥|\\(?:times|cdot|div|leq?|geq?|neq?|sqrt)\b/.test(text);
  const ordinaryWords=(text.replace(/\\[A-Za-z]+/g,' ').match(/\b[A-Za-z]{3,}\b/g)||[]).length;
  return (hasFraction||hasLinearEquation)&&hasStructure&&ordinaryWords<=1;
}

function pushPlainTextOrFractions(segments,text) {
  if(!text)return;
  const matrixEnvironment=findBareMatrixEnvironment(text);
  if(matrixEnvironment) {
    pushPlainTextOrFractions(segments,text.slice(0,matrixEnvironment.start));
    segments.push({type:'math',value:matrixEnvironment.expression,display:true});
    pushPlainTextOrFractions(segments,text.slice(matrixEnvironment.end));
    return;
  }
  const matrix=findPlainMatrix(text);
  if(matrix) {
    pushPlainTextOrFractions(segments,text.slice(0,matrix.start));
    segments.push({type:'math',value:matrix.expression,display:true});
    pushPlainTextOrFractions(segments,text.slice(matrix.end));
    return;
  }
  const system=findPlainSimultaneousSystem(text);
  if(system) {
    pushPlainTextOrFractions(segments,text.slice(0,system.start));
    segments.push({type:'math',value:casesExpression(system.equations),display:true});
    pushPlainTextOrFractions(segments,text.slice(system.end));
    return;
  }
  const instruction=text.match(/^((?:(?:Example|Question)\s*\d+\s*:\s*)?(?:Solve|Simplify|Evaluate|Calculate|Compute|Find|Express)\b\s*:?[ \t]*)([\s\S]+)$/i);
  if(instruction&&looksLikeEquation(instruction[2].replace(/[?.!]\s*$/,''))) {
    const punctuation=instruction[2].match(/[?.!]\s*$/)?.[0]||'';
    const expression=punctuation?instruction[2].slice(0,-punctuation.length):instruction[2];
    segments.push({type:'text',value:instruction[1],display:false});
    segments.push({type:'math',value:expression.trim(),display:false});
    if(punctuation)segments.push({type:'text',value:punctuation,display:false});
    return;
  }
  if(looksLikeEquation(text)) {
    segments.push({type:'math',value:text.trim(),display:false});
    return;
  }
  const fraction=/(?<![\d/])(\d{1,3})\s*\/\s*(\d{1,3})(?![\d/])/g;
  let cursor=0;
  for(const match of text.matchAll(fraction)) {
    const index=match.index||0;
    if(index>cursor)segments.push({type:'text',value:text.slice(cursor,index),display:false});
    segments.push({type:'math',value:`${match[1]}/${match[2]}`,display:false});
    cursor=index+match[0].length;
  }
  if(cursor<text.length)segments.push({type:'text',value:text.slice(cursor),display:false});
}

function shouldRenderStandaloneChemicalFormula(value) {
  const compact=value.replace(/\s+/g,'');
  if(/^(?:KS|JSS|SS)[1-9]$/i.test(compact))return false;
  return /_|[₀₁₂₃₄₅₆₇₈₉]|\d|\^|[⁺⁻]|\((?:aq|s|l|g)\)/iu.test(compact);
}

function pushStandaloneChemicalFormulas(segments,text) {
  if(!text)return;
  CHEMICAL_FORMULA_PATTERN.lastIndex=0;
  let cursor=0;
  let found=false;
  for(const match of text.matchAll(CHEMICAL_FORMULA_PATTERN)) {
    if(!shouldRenderStandaloneChemicalFormula(match[0]))continue;
    const index=match.index||0;
    pushPlainTextOrFractions(segments,text.slice(cursor,index));
    segments.push({type:'chemistry',value:normalizeChemicalMath(match[0]),display:false});
    cursor=index+match[0].length;
    found=true;
  }
  if(found)pushPlainTextOrFractions(segments,text.slice(cursor));
  else pushPlainTextOrFractions(segments,text);
}

function pushTextOrFractions(segments,text) {
  if(!text)return;
  CHEMICAL_EQUATION_PATTERN.lastIndex=0;
  let cursor=0;
  let found=false;
  for(const match of text.matchAll(CHEMICAL_EQUATION_PATTERN)) {
    if(!REACTION_ARROW_PATTERN.test(match[0]))continue;
    const index=match.index||0;
    pushStandaloneChemicalFormulas(segments,text.slice(cursor,index));
    segments.push({type:'chemistry',value:normalizeChemicalMath(match[0]),display:false});
    cursor=index+match[0].length;
    found=true;
  }
  if(found)pushStandaloneChemicalFormulas(segments,text.slice(cursor));
  else pushStandaloneChemicalFormulas(segments,text);
}

function combineDelimitedEquationPairs(segments) {
  const combined=[];
  for(let index=0;index<segments.length;index++) {
    const first=segments[index];
    const separator=segments[index+1];
    const second=segments[index+2];
    if(first?.type==='math'&&separator?.type==='text'&&second?.type==='math'
      &&/^\s*(?:,|;|\band\b|\btogether\s+with\b)\s*$/i.test(separator.value)
      &&isSimultaneousPair(first.value,second.value)) {
      combined.push({type:'math',value:casesExpression([first.value.trim(),second.value.trim()]),display:true});
      index+=2;
      continue;
    }
    combined.push(first);
  }
  return combined;
}

export function splitMathText(value) {
  const text=cleanEducationalText(value);
  const segments=[];
  const delimiters=/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]/g;
  let cursor=0;
  for(const match of text.matchAll(delimiters)) {
    const index=match.index||0;
    pushTextOrFractions(segments,text.slice(cursor,index));
    const expression=(match[1]??match[2]??'').trim();
    const chemistry=isChemicalEquation(expression);
    segments.push({type:chemistry?'chemistry':'math',value:chemistry?normalizeChemicalMath(expression):expression,display:match[2]!==undefined||Boolean(parseEquationEnvironment(expression))||containsMatrixEnvironment(expression)});
    cursor=index+match[0].length;
  }
  pushTextOrFractions(segments,text.slice(cursor));
  const combined=combineDelimitedEquationPairs(segments);
  return combined.length?combined:[{type:'text',value:text,display:false}];
}

class MathParser {
  constructor(input) { this.input=input;this.index=0; }
  peek() { return this.input[this.index]||''; }
  skipSpaces() { while(/\s/.test(this.peek()))this.index++; }
  parse(stop='') {
    const nodes=[];
    while(this.index<this.input.length) {
      this.skipSpaces();
      if(!this.peek()||this.peek()===stop)break;
      if(this.peek()==='/') {
        this.index++;
        const numerator=nodes.pop()||'<mrow></mrow>';
        const denominator=this.parseScriptedAtom();
        nodes.push(`<mfrac><mrow>${numerator}</mrow><mrow>${denominator}</mrow></mfrac>`);
        continue;
      }
      nodes.push(this.parseScriptedAtom());
    }
    if(stop&&this.peek()===stop)this.index++;
    return nodes.join('');
  }
  parseScriptedAtom() {
    let base=this.parseAtom();
    let sub='';let sup='';
    while(this.peek()==='_'||this.peek()==='^') {
      const marker=this.input[this.index++];
      const argument=this.parseArgument();
      if(marker==='_')sub=argument;else sup=argument;
    }
    if(sub&&sup)return `<msubsup>${base}<mrow>${sub}</mrow><mrow>${sup}</mrow></msubsup>`;
    if(sub)return `<msub>${base}<mrow>${sub}</mrow></msub>`;
    if(sup)return `<msup>${base}<mrow>${sup}</mrow></msup>`;
    return base;
  }
  parseArgument() {
    this.skipSpaces();
    if(this.peek()==='{') { this.index++;return this.parse('}'); }
    return this.parseAtom();
  }
  parseCommand() {
    this.index++;
    const start=this.index;
    while(/[A-Za-z]/.test(this.peek()))this.index++;
    const command=this.input.slice(start,this.index);
    if(!command) {
      const escaped=this.input[this.index++]||'';
      return `<mo stretchy="true" symmetric="true">${escapeXml(escaped)}</mo>`;
    }
    if(command==='frac') {
      const numerator=this.parseArgument();
      const denominator=this.parseArgument();
      return `<mfrac><mrow>${numerator}</mrow><mrow>${denominator}</mrow></mfrac>`;
    }
    if(command==='sqrt')return `<msqrt><mrow>${this.parseArgument()}</mrow></msqrt>`;
    if(command==='text') {
      this.skipSpaces();
      if(this.peek()!=='{')return '';
      this.index++;
      const startText=this.index;
      let depth=1;
      while(this.index<this.input.length&&depth) {
        if(this.input[this.index]==='{')depth++;
        if(this.input[this.index]==='}')depth--;
        this.index++;
      }
      return `<mtext>${escapeXml(this.input.slice(startText,Math.max(startText,this.index-1)))}</mtext>`;
    }
    if(command==='left'||command==='right') {
      this.skipSpaces();
      let delimiter=this.input[this.index++]||'';
      if(delimiter==='\\')delimiter=this.input[this.index++]||'';
      if(delimiter==='.')return '';
      return `<mo stretchy="true" symmetric="true">${escapeXml(delimiter)}</mo>`;
    }
    if(command===','||command===';'||command==='quad'||command==='qquad')return '<mspace width="0.35em"></mspace>';
    const symbol=COMMAND_SYMBOLS[command];
    if(symbol) {
      const tag=/^[α-ωΑ-Ω]$/u.test(symbol)?'mi':'mo';
      return `<${tag}>${escapeXml(symbol)}</${tag}>`;
    }
    return `<mi>${escapeXml(command)}</mi>`;
  }
  parseAtom() {
    this.skipSpaces();
    const character=this.peek();
    if(!character)return '';
    if(character==='\\')return this.parseCommand();
    if(character==='{') { this.index++;return `<mrow>${this.parse('}')}</mrow>`; }
    if(UNICODE_FRACTIONS[character]) {
      this.index++;
      const [numerator,denominator]=UNICODE_FRACTIONS[character];
      return `<mfrac><mn>${numerator}</mn><mn>${denominator}</mn></mfrac>`;
    }
    if(/[0-9.]/.test(character)) {
      const start=this.index++;
      while(/[0-9.,]/.test(this.peek()))this.index++;
      return `<mn>${escapeXml(this.input.slice(start,this.index))}</mn>`;
    }
    if(/[A-Za-z]/.test(character)) {
      const start=this.index++;
      while(/[A-Za-z]/.test(this.peek()))this.index++;
      const identifier=this.input.slice(start,this.index);
      return identifier.length===1?`<mi>${identifier}</mi>`:`<mi mathvariant="normal">${escapeXml(identifier)}</mi>`;
    }
    this.index++;
    if('()[]|'.includes(character))return `<mo stretchy="true" symmetric="true">${escapeXml(character)}</mo>`;
    if('+-=−×÷±≤≥≠<>'.includes(character))return `<mo>${escapeXml(character)}</mo>`;
    if(character===',')return '<mo separator="true">,</mo>';
    return `<mo>${escapeXml(character)}</mo>`;
  }
}

function accessibleMath(value) {
  return collapseMathBackslashes(value)
    .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g,'$1 over $2')
    .replace(/\\text\s*\{([^{}]*)\}/g,'$1')
    .replace(/\\(?:left|right)/g,'')
    .replace(/\\([A-Za-z]+)/g,(_,command)=>COMMAND_SYMBOLS[command]||command)
    .replace(/_\{?([^{}]+)\}?/g,' subscript $1 ')
    .replace(/\^\{?([^{}]+)\}?/g,' superscript $1 ')
    .replace(/[{}]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function renderEquationEnvironment(environment) {
  const table=`<mtable columnalign="left" rowspacing="0.45em">${environment.rows
    .map(row=>`<mtr><mtd><mrow>${new MathParser(row).parse()}</mrow></mtd></mtr>`)
    .join('')}</mtable>`;
  return {
    body:environment.brace
      ? `<mrow><mo stretchy="true" symmetric="true" fence="true">{</mo>${table}</mrow>`
      : table,
    label:environment.rows.map(accessibleMath).join('; '),
  };
}

function renderMatrixTable(environment,rows) {
  const table=`<mtable columnalign="center" rowspacing="0.4em" columnspacing="0.9em">${rows
    .map(row=>`<mtr>${row.map(cell=>`<mtd><mrow>${new MathParser(cell).parse()}</mrow></mtd>`).join('')}</mtr>`)
    .join('')}</mtable>`;
  const fences=MATRIX_FENCES[environment];
  return {
    body:fences
      ? `<mrow><mo stretchy="true" symmetric="true" fence="true">${escapeXml(fences[0])}</mo>${table}<mo stretchy="true" symmetric="true" fence="true">${escapeXml(fences[1])}</mo></mrow>`
      : table,
    label:`matrix ${rows.map(row=>row.map(accessibleMath).join(', ')).join('; ')}`,
  };
}

function renderMatrixExpressions(value) {
  const input=String(value);
  MATRIX_ENVIRONMENT_PATTERN.lastIndex=0;
  let body='';
  let cursor=0;
  let found=false;
  const labels=[];
  for(const match of input.matchAll(MATRIX_ENVIRONMENT_PATTERN)) {
    const rows=parseMatrixRows(match[2]);
    if(!rows)continue;
    const index=match.index||0;
    const prefix=input.slice(cursor,index);
    body+=new MathParser(prefix).parse();
    if(prefix.trim())labels.push(accessibleMath(prefix));
    const rendered=renderMatrixTable(match[1],rows);
    body+=rendered.body;
    labels.push(rendered.label);
    cursor=index+match[0].length;
    found=true;
  }
  if(!found)return null;
  const suffix=input.slice(cursor);
  body+=new MathParser(suffix).parse();
  if(suffix.trim())labels.push(accessibleMath(suffix));
  return {body,label:labels.filter(Boolean).join(' ')};
}

export function renderMathML(value,display=false) {
  const input=normalizeGroupedSlashFractions(collapseMathBackslashes(value)).trim();
  const environment=parseEquationEnvironment(input);
  const matrix=environment?null:renderMatrixExpressions(input);
  const rendered=environment
    ? renderEquationEnvironment(environment)
    : matrix||{body:new MathParser(input).parse(),label:accessibleMath(input)};
  const mode=display||environment||matrix?'block':'inline';
  return `<math xmlns="http://www.w3.org/1998/Math/MathML" display="${mode}" aria-label="${escapeXml(rendered.label)}"><mstyle displaystyle="true" scriptlevel="0"><mrow>${rendered.body}</mrow></mstyle></math>`;
}
