'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Download, Check } from 'lucide-react';
import { BubbleConfig } from '../types/chatBubble';
import { BUBBLE_TEMPLATES } from '../libs/chatBubbleTemplates';

interface ChatBubbleCodeDisplayProps {
  config: BubbleConfig;
  selectedTemplateId: string;
  chatbotSlug: string;
  embeddedUrl: string;
}

export function ChatBubbleCodeDisplay({ 
  config, 
  selectedTemplateId, 
  chatbotSlug, 
  embeddedUrl 
}: ChatBubbleCodeDisplayProps) {
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const template = BUBBLE_TEMPLATES.find(t => t.id === selectedTemplateId);
  const generatedCode = template?.generateCode(config, chatbotSlug, embeddedUrl) || '';

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const downloadAsFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate separate installation instructions
  const installationInstructions = `
<!-- Installation Instructions for Chat Bubble Widget -->

1. Copy the complete HTML code below and paste it into your website's HTML file
2. Place it just before the closing </body> tag for best performance
3. The widget will automatically appear on your website according to your configuration
4. Test the widget by clicking on it to ensure it opens the chat modal correctly

<!-- Optional: Customize further by modifying the inline styles -->
<!-- The widget is self-contained and doesn't require any external dependencies -->

Website Integration Examples:

For WordPress:
- Go to Appearance > Theme Editor > footer.php
- Paste the code before </body>

For Shopify:
- Go to Online Store > Themes > Actions > Edit Code
- Edit theme.liquid and paste before </body>

For HTML websites:
- Edit your HTML files and paste before </body>

For React/Next.js:
- Add the code to your _app.js or layout component
- You may need to use dangerouslySetInnerHTML or convert to JSX

Need help? Contact our support team!
  `.trim();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Generated Chat Bubble Code</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(generatedCode, 'main')}
              className="ml-auto"
            >
              {copiedStates.main ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiedStates.main ? 'Copied!' : 'Copy All'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="code" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="code">HTML Code</TabsTrigger>
              <TabsTrigger value="instructions">Instructions</TabsTrigger>
              <TabsTrigger value="preview">Test</TabsTrigger>
            </TabsList>

            <TabsContent value="code" className="space-y-4">
              <div className="relative">
                <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto text-sm border h-96">
                  <code>{generatedCode}</code>
                </pre>
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(generatedCode, 'code')}
                    className="bg-white/80 dark:bg-gray-800/80"
                  >
                    {copiedStates.code ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadAsFile(generatedCode, `chat-bubble-${chatbotSlug}.html`)}
                    className="bg-white/80 dark:bg-gray-800/80"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="default"
                  onClick={() => copyToClipboard(generatedCode, 'copy-main')}
                  className="flex-1"
                >
                  {copiedStates['copy-main'] ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied to Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadAsFile(generatedCode, `chat-bubble-${chatbotSlug}.html`)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download HTML
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="instructions" className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 h-96 overflow-y-auto">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 sticky top-0 bg-blue-50 dark:bg-blue-950/30 pb-2">
                  📋 Installation Instructions
                </h3>
                <pre className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                  {installationInstructions}
                </pre>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(installationInstructions, 'instructions')}
                  className="flex-1"
                >
                  {copiedStates.instructions ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Instructions Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Instructions
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadAsFile(installationInstructions, `installation-instructions.txt`)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Instructions
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 h-96 overflow-y-auto">
                <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2 sticky top-0 bg-yellow-50 dark:bg-yellow-950/30 pb-2">
                  🧪 Test Your Widget
                </h3>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                  Create a test HTML file to see how your chat bubble will look on a real website:
                </p>
                
                <div className="bg-white dark:bg-gray-900 p-3 rounded border text-sm">
                  <div className="font-mono text-xs text-gray-600 dark:text-gray-400 mb-2">test-page.html</div>
                  <pre className="whitespace-pre-wrap overflow-auto max-h-60">
{`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Widget Test</title>
</head>
<body>
    <h1>My Website</h1>
    <p>This is a test page to see how the chat widget looks.</p>
    
    <!-- Your chat widget code goes here -->
${generatedCode}
</body>
</html>`}
                  </pre>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const testPageCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Widget Test</title>
</head>
<body>
    <h1>My Website</h1>
    <p>This is a test page to see how the chat widget looks.</p>
    
    <!-- Your chat widget code -->
${generatedCode}
</body>
</html>`;
                    copyToClipboard(testPageCode, 'test-page');
                  }}
                  className="flex-1"
                >
                  {copiedStates['test-page'] ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Test Page Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Test Page
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const testPageCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Widget Test</title>
</head>
<body>
    <h1>My Website</h1>
    <p>This is a test page to see how the chat widget looks.</p>
    
    <!-- Your chat widget code -->
${generatedCode}
</body>
</html>`;
                    downloadAsFile(testPageCode, `test-page-${chatbotSlug}.html`);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Test Page
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      {/* <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(generatedCode.length / 1024)}KB
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Code Size</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {template?.name || 'Unknown'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Template</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                0
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Dependencies</div>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
} 