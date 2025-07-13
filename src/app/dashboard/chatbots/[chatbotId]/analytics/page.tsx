"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  BarChart3, 
  LineChart, 
  MessageSquare, 
  Users, 
  Clock, 
  FileText,
  TrendingUp,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { useFetchChatbotDetails } from '../hooks/useChatbotSettings';
import { useChatbotAnalytics, TimeRange } from '../hooks/useChatbotAnalytics';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import { cn } from '@/lib/utils';
import { GlowEffect } from '@/components/ui/glow-effect';

export default function ChatbotAnalyticsPage() {
  const params = useParams();
  const chatbotId = params.chatbotId as string;
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('30d');

  const { data: chatbot } = useFetchChatbotDetails(chatbotId);
  const { data: analyticsData, isLoading, error } = useChatbotAnalytics(chatbotId, selectedTimeRange);

  const timeRangeOptions = [
    { value: '24h' as TimeRange, label: '24h' },
    { value: '7d' as TimeRange, label: '7d' },
    { value: '30d' as TimeRange, label: '30d' },
    { value: 'all' as TimeRange, label: 'All' }
  ];

  const getTimeRangeLabel = (range: TimeRange) => {
    const labels = { '24h': 'Last 24 Hours', '7d': 'Last 7 Days', '30d': 'Last 30 Days', 'all': 'All Time' };
    return labels[range] || 'Last 30 Days';
  };

  // Chart configuration
  const chartConfig = {
    conversations: {
      label: "Conversations",
      color: "hsl(var(--chart-1))",
    },
    messages: {
      label: "Messages",
      color: "hsl(var(--chart-2))",
    },
  } satisfies ChartConfig;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2 bg-muted/60" />
              <Skeleton className="h-4 w-64 bg-muted/60" />
            </div>
            <Skeleton className="h-8 w-32 bg-muted/60" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6 bg-card">
                <Skeleton className="h-4 w-20 mb-3 bg-muted/60" />
                <Skeleton className="h-8 w-16 mb-2 bg-muted/60" />
                <Skeleton className="h-3 w-24 bg-muted/60" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive" className="p-8">
            <AlertCircle className="h-10 w-10" />
            <AlertTitle className="text-xl font-semibold mt-4 mb-2">Failed to load analytics</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
      <div>
              <h1 className="text-2xl font-bold text-foreground mb-1 relative">
                Analytics Dashboard
              </h1>
              <p className="text-muted-foreground">
                Performance insights for {chatbot?.name || 'your chatbot'}
        </p>
      </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-2 p-1 bg-muted rounded-full">
                {timeRangeOptions.map((option) => (
                <RainbowButton
                    key={option.value}
                    onClick={() => setSelectedTimeRange(option.value)}
                  className={cn(
                    "h-8 px-4 text-sm font-medium rounded-full transition-all",
                    selectedTimeRange !== option.value && "bg-transparent text-muted-foreground hover:bg-muted/80"
                  )}
                  >
                    {option.label}
                </RainbowButton>
                ))}
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-4 sm:p-6 bg-card border-border hover:shadow-lg transition-shadow rounded-xl hover:-translate-y-0.5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2 sm:mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conversations</span>
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  {analyticsData?.totalConversations.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {analyticsData?.averageMessagesPerConversation.toFixed(1)} avg messages
                </p>
              </div>
            </Card>

            <Card className="p-4 sm:p-6 bg-card border-border hover:shadow-lg transition-shadow rounded-xl hover:-translate-y-0.5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2 sm:mb-4">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Messages</span>
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  {analyticsData?.totalMessages.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {analyticsData?.conversationCompletionRate.toFixed(1)}% completion
                </p>
              </div>
        </Card>

            <Card className="p-4 sm:p-6 bg-card border-border hover:shadow-lg transition-shadow rounded-xl hover:-translate-y-0.5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2 sm:mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Users</span>
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  {analyticsData?.activeUsers.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Registered users</p>
              </div>
        </Card>

            <Card className="p-4 sm:p-6 bg-card border-border hover:shadow-lg transition-shadow rounded-xl hover:-translate-y-0.5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2 sm:mb-4">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Anonymous</span>
              </div>
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-2xl sm:text-3xl font-bold text-foreground">
                  {analyticsData?.anonymousSessions.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Sessions</p>
              </div>
        </Card>
      </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Activity Chart - Takes most space */}
            <div className="lg:col-span-8 relative group">
              {/* <GlowEffect
                className="opacity-0 group-hover:opacity-20 transition-opacity duration-300"
                colors={['#0894FF', '#C959DD', '#FF2E54', '#FF9004']}
                mode='pulse'
                blur='strongest'
                duration={10}
              /> */}
              <Card className="w-full h-full p-6 bg-card/80 border-border backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Activity Overview</h3>
                    <p className="text-sm text-muted-foreground">Daily conversations and messages</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <Badge variant="outline" className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chartConfig.conversations.color }} />
                      Conversations
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chartConfig.messages.color }} />
                      Messages
                    </Badge>
                  </div>
                </div>
                <ChartContainer config={chartConfig} className="h-64 md:h-80 w-full">
                <AreaChart
                  accessibilityLayer
                  data={analyticsData?.dailyStats || []}
                  margin={{ left: 0, right: 0, top: 20, bottom: 20 }}
                >
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                      className="text-xs text-muted-foreground"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                  <YAxis
                      domain={[0, 'dataMax']}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                      className="text-xs text-muted-foreground"
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="conversations"
                      type="monotone"
                    fill="var(--color-conversations)"
                    fillOpacity={0.3}
                    stroke="var(--color-conversations)"
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="messages"
                      type="monotone"
                    fill="var(--color-messages)"
                    fillOpacity={0.3}
                    stroke="var(--color-messages)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </Card>
            </div>

            {/* Side Stats */}
            <div className="lg:col-span-4 space-y-6">
              {/* User Distribution */}
              <Card className="p-6 bg-card border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">User Distribution</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-500/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-foreground">Registered</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-foreground">{analyticsData?.userTypes.registered}</div>
                      <div className="text-xs text-muted-foreground">
                        {((analyticsData?.userTypes.registered || 0) / ((analyticsData?.userTypes.registered || 0) + (analyticsData?.userTypes.anonymous || 0)) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-orange-500/10 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="font-medium text-foreground">Anonymous</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-foreground">{analyticsData?.userTypes.anonymous}</div>
                      <div className="text-xs text-muted-foreground">
                        {((analyticsData?.userTypes.anonymous || 0) / ((analyticsData?.userTypes.registered || 0) + (analyticsData?.userTypes.anonymous || 0)) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Response Time */}
              <Card className="p-6 bg-card border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">Performance</h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-foreground mb-2">
                    {analyticsData?.technicalMetrics?.averageResponseTime && analyticsData.technicalMetrics.averageResponseTime > 0 
                      ? `${analyticsData.technicalMetrics.averageResponseTime}s`
                      : 'N/A'
                    }
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Average Response Time</p>
                  {analyticsData?.technicalMetrics?.totalResponses && analyticsData.technicalMetrics.totalResponses > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {analyticsData.technicalMetrics.totalResponses} responses analyzed
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>

          {/* Bottom Grid - Content & Technical */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Content Performance */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold text-foreground mb-6">Content Performance</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-500/10 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{analyticsData?.contentSources.processed}</div>
                  <div className="text-xs text-muted-foreground">Processed</div>
                </div>
                <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{analyticsData?.contentSources.processing}</div>
                  <div className="text-xs text-muted-foreground">Processing</div>
                </div>
                <div className="text-center p-4 bg-red-500/10 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">{analyticsData?.contentSources.failed}</div>
                  <div className="text-xs text-muted-foreground">Failed</div>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-muted-foreground">Content Utilization</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {analyticsData?.contentUtilization.utilizationRate.toFixed(1)}%
                  </span>
                </div>
                <Progress value={analyticsData?.contentUtilization.utilizationRate || 0} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {analyticsData?.contentUtilization.utilizedChunks} of {analyticsData?.contentUtilization.totalChunks} content chunks utilized
                </p>
              </div>
            </Card>

            {/* Top Sources */}
            <Card className="p-6 bg-card border-border">
              <h3 className="text-lg font-semibold text-foreground mb-6">Top Content Sources</h3>
              {analyticsData?.contentUtilization.topSources && analyticsData.contentUtilization.topSources.length > 0 ? (
                <div className="space-y-4">
                  {analyticsData.contentUtilization.topSources.slice(0, 5).map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full text-sm font-medium text-muted-foreground">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-foreground truncate max-w-48">{source.title}</div>
                          <div className="text-xs text-muted-foreground">{source.usage_count} references</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-foreground">
                        {source.usage_count}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p>No content usage data available</p>
                </div>
              )}
      </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
