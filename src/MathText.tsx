import { renderMathML, splitMathText } from './math-format.mjs';

type Props={text:string;className?:string};

export default function MathText({text,className=''}:Props) {
  const segments=splitMathText(text);
  return <span className={`math-text ${className}`.trim()}>{segments.map((segment,index)=>segment.type==='text'
    ? <span key={index}>{segment.value}</span>
    : <span
        key={index}
        className={`${segment.display?'math-display':'math-inline'}${segment.type==='chemistry'?' chemical-equation':''}`}
        dangerouslySetInnerHTML={{__html:renderMathML(segment.value,segment.display)}}
      />)}</span>;
}
