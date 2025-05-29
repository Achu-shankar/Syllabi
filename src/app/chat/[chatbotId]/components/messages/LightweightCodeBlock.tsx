'use client';
import React, { useEffect, useRef, memo } from 'react';
import hljs from 'highlight.js/lib/core';
// import 'highlight.js/styles/atom-one-dark.css'; // Change this import to use different themes

// Different themes
import 'highlight.js/styles/atom-one-dark.css'; // Import a dark theme that matches oneDark
// import 'highlight.js/styles/github.css'; 
// import 'highlight.js/styles/github-dark.css';
// import 'highlight.js/styles/monokai.css';
// import 'highlight.js/styles/dracula.css';
// import 'highlight.js/styles/nord.css';
// import 'highlight.js/styles/solarized-dark.css';
// import 'highlight.js/styles/solarized-light.css';
// import 'highlight.js/styles/vs2015.css';


// Import languages individually and register them
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import r from 'highlight.js/lib/languages/r';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import markdown from 'highlight.js/lib/languages/markdown';
import typescript from 'highlight.js/lib/languages/typescript';

// Register the languages
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('r', r);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('css', css);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('typescript', typescript);



interface LightweightCodeBlockProps {
  content: string;
  language?: string;
  showLineNumbers?: boolean;
  className?: string;
}

// Memoized component for better performance
const LightweightCodeBlock = memo(({
  content,
  language = 'text',
  showLineNumbers = false,
  className = '',
}: LightweightCodeBlockProps) => {
  const preRef = useRef<HTMLPreElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  
  // Normalize language name
  let lang = language.toLowerCase();
  if (lang === 'js') lang = 'javascript';
  if (lang === 'py') lang = 'python';
  if (lang === 'ts') lang = 'typescript';

  // Get highlighted HTML
  const getHighlightedCode = () => {
    try {
      // Try to highlight with the specified language
      const highlighted = hljs.highlight(content, {
        language: lang,
        ignoreIllegals: true
      });
      return highlighted.value;
    } catch (e) {
      // If the language isn't supported or fails, use auto-detection
      console.warn(`Failed to highlight with language ${lang}:`, e);
      return hljs.highlightAuto(content).value;
    }
  };
  
  const highlightedHtml = getHighlightedCode();
  
  // Add line numbers if needed
  useEffect(() => {
    if (showLineNumbers && preRef.current) {
      applyLineNumbers(preRef.current);
    }
  }, [showLineNumbers, content]);

  // Function to add line numbers to highlighted code
  const applyLineNumbers = (pre: HTMLPreElement) => {
    const lines = content.split('\n').length;
    
    // Get computed styles from the pre element to match theme
    const preStyles = window.getComputedStyle(pre);
    const backgroundColor = preStyles.backgroundColor;
    const color = preStyles.color;
    const isDarkTheme = isDark(backgroundColor);
    
    // Create a line number element to position absolutely
    const linesElem = document.createElement('div');
    linesElem.className = 'hljs-line-numbers';
    linesElem.style.position = 'absolute';
    linesElem.style.left = '0';
    linesElem.style.top = '0';
    linesElem.style.bottom = '0';
    linesElem.style.width = '40px';
    
    // Adapt border and background color based on theme
    if (isDarkTheme) {
      // Dark theme - lighter border and slightly lighter background
      linesElem.style.borderRight = '1px solid rgba(255,255,255,0.2)';
      linesElem.style.backgroundColor = lightenDarkenColor(backgroundColor, 15); // Slightly lighter
      linesElem.style.color = 'rgba(200,200,200,0.6)';
    } else {
      // Light theme - darker border and slightly darker background
      linesElem.style.borderRight = '1px solid rgba(0,0,0,0.1)';
      linesElem.style.backgroundColor = lightenDarkenColor(backgroundColor, -10); // Slightly darker
      linesElem.style.color = 'rgba(100,100,100,0.8)';
    }
    
    linesElem.style.textAlign = 'right';
    linesElem.style.paddingRight = '5px';
    linesElem.style.paddingTop = '10px';
    linesElem.style.fontSize = '12px';
    
    // Add each line number
    let lineNumbersHtml = '';
    for (let i = 1; i <= lines; i++) {
      lineNumbersHtml += `<div>${i}</div>`;
    }
    linesElem.innerHTML = lineNumbersHtml;
    
    // Position the pre element for line numbers
    pre.style.position = 'relative';
    pre.style.paddingLeft = '50px';
    
    // Add line numbers element
    pre.appendChild(linesElem);
  };
  
  // Helper function to determine if a background color is dark
  function isDark(color: string): boolean {
    // Convert color to RGB
    let r, g, b;
    
    if (color.startsWith('#')) {
      // Hex color
      const hex = color.slice(1);
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else if (color.startsWith('rgb')) {
      // RGB or RGBA color
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (match) {
        r = parseInt(match[1], 10);
        g = parseInt(match[2], 10);
        b = parseInt(match[3], 10);
      } else {
        // Default to assuming it's light if we can't parse
        return false;
      }
    } else {
      // Default to assuming it's light if we can't parse
      return false;
    }
    
    // Calculate perceived brightness (YIQ formula)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq < 128; // Below 128 is considered dark
  }
  
  // Helper function to lighten or darken a color
  function lightenDarkenColor(color: string, amount: number): string {
    let r, g, b;
    
    if (color.startsWith('#')) {
      // Hex color
      const hex = color.slice(1);
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    } else if (color.startsWith('rgb')) {
      // RGB or RGBA color
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (match) {
        r = parseInt(match[1], 10);
        g = parseInt(match[2], 10);
        b = parseInt(match[3], 10);
      } else {
        return color;
      }
    } else {
      return color;
    }
    
    // Apply amount
    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));
    
    // Convert back to rgba
    return `rgba(${r},${g},${b},1)`;
  }

  // Add hljs class to pre for proper theme styling
  return (
    <pre 
      ref={preRef} 
      className={`hljs hljs-pre ${className}`} 
      style={{ 
        margin: 0,
        borderRadius: '0 0 0.5rem 0.5rem',
        padding: '1rem',
        overflow: 'auto',
      }}
    >
      <code 
        ref={codeRef} 
        className={`language-${lang}`}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </pre>
  );
});

LightweightCodeBlock.displayName = 'LightweightCodeBlock';

export default LightweightCodeBlock; 