"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';

// This page will eventually show a preview of the chatbot and some light stats
export default function ChatbotOverviewPage({ params }: { params: { chatbotId: string } }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Chatbot Overview</h1>
        <p className="text-muted-foreground">
          Preview and key statistics for chatbot (ID: {params.chatbotId}).
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Chatbot Preview</CardTitle>
            <CardDescription>Interactive preview of your chatbot.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-64 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Chatbot Preview Area (Coming Soon)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
            <CardDescription>Recent activity highlights.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>Total Conversations: <span className="font-semibold">--</span></p>
            <p>Messages Last 24h: <span className="font-semibold">--</span></p>
            <p>Satisfaction Score: <span className="font-semibold">--%</span></p>
            <Button variant="link" className="p-0 h-auto">View Full Analytics</Button> {/* Links to analytics page */} 
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-wrap gap-2'>
            <Button variant="outline">View Library</Button>
            <Button variant="outline">Customize Appearance</Button>
            <Button variant="outline">Test Behavior</Button>
            <Button variant="outline">Get Sharing Code</Button>
        </CardContent>
      </Card>

    </div>
  );
}
