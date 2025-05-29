"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Link as LinkIcon, Code } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ChatbotSharingPage({ params }: { params: { chatbotId: string } }) {
  const publicUrl = `https://app.syllabi.io/chat/${params.chatbotId}`; // Example URL
  const iframeCode = `<iframe src="${publicUrl}" width="100%" height="600px" frameborder="0"></iframe>`;
  const scriptCode = `<script src="https://app.syllabi.io/embed.js" data-chatbot-id="${params.chatbotId}"></script>`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Consider adding a toast notification here for user feedback
      alert("Copied to clipboard!");
    }).catch(err => {
      console.error("Failed to copy: ", err);
      alert("Failed to copy to clipboard.");
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sharing & Embedding</h1>
        <p className="text-muted-foreground">
          Share your chatbot or embed it on your website (ID: {params.chatbotId}).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public Link</CardTitle>
          <CardDescription>
            Share this link directly with your students or audience.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-muted-foreground" />
          <Input readOnly value={publicUrl} className="flex-1" />
          <Button variant="outline" size="icon" onClick={() => copyToClipboard(publicUrl)}>
            <Copy className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="iframe" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
            <TabsTrigger value="iframe">Embed with Iframe</TabsTrigger>
            <TabsTrigger value="script">Embed with Script</TabsTrigger>
        </TabsList>
        <TabsContent value="iframe">
            <Card>
                <CardHeader>
                    <CardTitle>Iframe Embed Code</CardTitle>
                    <CardDescription>Copy and paste this code into your website's HTML where you want the chatbot to appear.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto">
                        <code>{iframeCode}</code>
                    </pre>
                    <Button variant="outline" onClick={() => copyToClipboard(iframeCode)}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Iframe Code
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="script">
            <Card>
                <CardHeader>
                    <CardTitle>Script Embed Code</CardTitle>
                    <CardDescription>Place this script tag preferably before the closing `&lt;/body&gt;` tag on your website.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <pre className="p-4 bg-muted rounded-md text-sm overflow-x-auto">
                        <code>{scriptCode}</code>
                    </pre>
                     <Button variant="outline" onClick={() => copyToClipboard(scriptCode)}>
                        <Copy className="mr-2 h-4 w-4" /> Copy Script Code
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
