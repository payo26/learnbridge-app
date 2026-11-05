import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { AuthProvider } from './AuthContext';
import MathPreview from './MathPreview';
import DiagramPreview from './DiagramPreview';
import CoverageDiagramPreview from './CoverageDiagramPreview';
import LegalPage, { type LegalDocument } from './LegalPages';
import './index.css';

const mathPreview=new URLSearchParams(window.location.search).get('math-preview')==='1';
const diagramPreview=new URLSearchParams(window.location.search).get('diagram-preview')==='1';
const coveragePreview=new URLSearchParams(window.location.search).get('coverage-preview')==='1';
const path=window.location.pathname.toLowerCase().replace(/\/+$/,'')||'/';
const legalDocument=({
  '/terms':'terms',
  '/privacy':'privacy',
  '/refunds':'refunds',
} as Record<string,LegalDocument>)[path];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {legalDocument?<LegalPage document={legalDocument}/>:coveragePreview?<CoverageDiagramPreview/>:diagramPreview?<DiagramPreview/>:mathPreview?<MathPreview/>:<AuthProvider><App /></AuthProvider>}
  </StrictMode>
);

