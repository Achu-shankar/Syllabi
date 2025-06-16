"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
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
      <div className="min-h-screen bg-gray-50/50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-24" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to load analytics</h3>
            <p className="text-gray-600">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="p-6 space-y-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
      <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Analytics Dashboard</h1>
              <p className="text-gray-600">
                Performance insights for {chatbot?.name || 'your chatbot'}
        </p>
      </div>

            {/* Time Range Selector */}
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-gray-500" />
              <div className="flex items-center bg-white rounded-lg p-1 shadow-sm border">
                {timeRangeOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={selectedTimeRange === option.value ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedTimeRange(option.value)}
                    className={`h-8 px-4 text-sm font-medium transition-all ${
                      selectedTimeRange === option.value 
                        ? 'bg-gray-900 text-white shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 bg-white shadow-sm border-0 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Conversations</span>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-gray-900">
                  {analyticsData?.totalConversations.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">
                  {analyticsData?.averageMessagesPerConversation.toFixed(1)} avg messages
                </p>
              </div>
            </Card>

            <Card className="p-6 bg-white shadow-sm border-0 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Messages</span>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-gray-900">
                  {analyticsData?.totalMessages.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">
                  {analyticsData?.conversationCompletionRate.toFixed(1)}% completion
                </p>
              </div>
        </Card>

            <Card className="p-6 bg-white shadow-sm border-0 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Users</span>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-gray-900">
                  {analyticsData?.activeUsers.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">Registered users</p>
              </div>
        </Card>

            <Card className="p-6 bg-white shadow-sm border-0 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Activity className="h-5 w-5 text-orange-600" />
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Anonymous</span>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-gray-900">
                  {analyticsData?.anonymousSessions.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">Sessions</p>
              </div>
        </Card>
      </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            {/* Activity Chart - Takes most space */}
            <Card className="lg:col-span-8 p-6 bg-white shadow-sm border-0">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Activity Overview</h3>
                  <p className="text-sm text-gray-600">Daily conversations and messages</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-600">Conversations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">Messages</span>
                  </div>
                </div>
              </div>
              <ChartContainer config={chartConfig} className="h-80 w-full">
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
                    className="text-xs text-gray-500"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    className="text-xs text-gray-500"
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Area
                    dataKey="conversations"
                    type="natural"
                    fill="var(--color-conversations)"
                    fillOpacity={0.3}
                    stroke="var(--color-conversations)"
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="messages"
                    type="natural"
                    fill="var(--color-messages)"
                    fillOpacity={0.3}
                    stroke="var(--color-messages)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </Card>

            {/* Side Stats */}
            <div className="lg:col-span-4 space-y-6">
              {/* User Distribution */}
              <Card className="p-6 bg-white shadow-sm border-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">User Distribution</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">Registered</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">{analyticsData?.userTypes.registered}</div>
                      <div className="text-xs text-gray-600">
                        {((analyticsData?.userTypes.registered || 0) / ((analyticsData?.userTypes.registered || 0) + (analyticsData?.userTypes.anonymous || 0)) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span className="font-medium text-gray-900">Anonymous</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-gray-900">{analyticsData?.userTypes.anonymous}</div>
                      <div className="text-xs text-gray-600">
                        {((analyticsData?.userTypes.anonymous || 0) / ((analyticsData?.userTypes.registered || 0) + (analyticsData?.userTypes.anonymous || 0)) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Response Time */}
              <Card className="p-6 bg-white shadow-sm border-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {analyticsData?.technicalMetrics?.averageResponseTime && analyticsData.technicalMetrics.averageResponseTime > 0 
                      ? `${analyticsData.technicalMetrics.averageResponseTime}s`
                      : 'N/A'
                    }
                  </div>
                  <p className="text-sm text-gray-600 mb-1">Average Response Time</p>
                  {analyticsData?.technicalMetrics?.totalResponses && analyticsData.technicalMetrics.totalResponses > 0 && (
                    <p className="text-xs text-gray-500">
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
            <Card className="p-6 bg-white shadow-sm border-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Content Performance</h3>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{analyticsData?.contentSources.processed}</div>
                  <div className="text-xs text-gray-600">Processed</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{analyticsData?.contentSources.processing}</div>
                  <div className="text-xs text-gray-600">Processing</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <XCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-900">{analyticsData?.contentSources.failed}</div>
                  <div className="text-xs text-gray-600">Failed</div>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-600">Content Utilization</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {analyticsData?.contentUtilization.utilizationRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${analyticsData?.contentUtilization.utilizationRate || 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {analyticsData?.contentUtilization.utilizedChunks} of {analyticsData?.contentUtilization.totalChunks} content chunks utilized
                </p>
              </div>
            </Card>

            {/* Top Sources */}
            <Card className="p-6 bg-white shadow-sm border-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Top Content Sources</h3>
              
              {analyticsData?.contentUtilization.topSources && analyticsData.contentUtilization.topSources.length > 0 ? (
                <div className="space-y-4">
                  {analyticsData.contentUtilization.topSources.slice(0, 5).map((source, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full text-sm font-medium text-gray-600">
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 truncate max-w-48">{source.title}</div>
                          <div className="text-xs text-gray-600">{source.usage_count} references</div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {source.usage_count}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
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
