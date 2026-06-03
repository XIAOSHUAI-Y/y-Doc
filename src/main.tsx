// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.tsx'

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )

import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { MiniQuill } from './core/mini-quill/mini-quill';
import { QuillShim } from './core/mini-quill/QuillShim';
import { QuillBinding } from 'y-quill';
import * as Y from 'yjs';

const savedTheme = localStorage.getItem('y-doc-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// 开发环境暴露到全局，方便控制台调试
if (typeof window !== 'undefined') {
  (window as any).MiniQuill = MiniQuill;
  (window as any).QuillShim = QuillShim;
  (window as any).QuillBinding = QuillBinding;
  (window as any).Y = Y;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
	// <React.StrictMode>
	<App />
	// </React.StrictMode>,
);
