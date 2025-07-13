declare module 'prismjs/components/prism-core' {
  export function highlight(text: string, grammar: any, language?: string): string;
  export const languages: {
    json: any;
    js: any;
    javascript: any;
    [key: string]: any;
  };
}

declare module 'prismjs/components/prism-clike';
declare module 'prismjs/components/prism-javascript';
declare module 'prismjs/components/prism-json';
declare module 'prismjs/themes/prism.css'; 