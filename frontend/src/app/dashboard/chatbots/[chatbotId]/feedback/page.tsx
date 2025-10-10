"use client";

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  MoreVertical,
  Trash2,
  AlertCircle,
  Star,
  User,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  useFeedback,
  useUpdateFeedback,
  useDeleteFeedback,
} from '../hooks/useFeedback';

interface Feedback {
  id: string;
  chatbot_id: string;
  user_id: string | null;
  session_id: string | null;
  feedback_type: 'bug' | 'feature' | 'improvement' | 'question' | 'other';
  rating: number | null;
  subject: string | null;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  creator_response: string | null;
  responded_at: string | null;
  metadata: any;
  created_at: string;
  updated_at: string;
}

const feedbackTypeColors = {
  bug: 'bg-red-500/10 text-red-700 border-red-200',
  feature: 'bg-blue-500/10 text-blue-700 border-blue-200',
  improvement: 'bg-purple-500/10 text-purple-700 border-purple-200',
  question: 'bg-yellow-500/10 text-yellow-700 border-yellow-200',
  other: 'bg-gray-500/10 text-gray-700 border-gray-200',
};

const statusColors = {
  new: 'bg-green-500/10 text-green-700 border-green-200',
  in_progress: 'bg-blue-500/10 text-blue-700 border-blue-200',
  resolved: 'bg-purple-500/10 text-purple-700 border-purple-200',
  closed: 'bg-gray-500/10 text-gray-700 border-gray-200',
};

export default function FeedbackPage() {
  const params = useParams();
  const chatbotId = params.chatbotId as string;

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // React Query hooks
  const { data, isLoading, error } = useFeedback(chatbotId, {
    status: statusFilter,
    type: typeFilter,
  });
  const updateMutation = useUpdateFeedback(chatbotId);
  const deleteMutation = useDeleteFeedback(chatbotId);

  const feedbackList = data?.feedback || [];
  const totalCount = data?.total || 0;

  // Dialog state
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isRespondDialogOpen, setIsRespondDialogOpen] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');

  // Handle respond dialog
  const openRespondDialog = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setResponseText(feedback.creator_response || '');
    setNewStatus(feedback.status);
    setIsRespondDialogOpen(true);
  };

  const handleSubmitResponse = () => {
    if (!selectedFeedback) return;

    updateMutation.mutate(
      {
        feedbackId: selectedFeedback.id,
        data: {
          status: newStatus,
          creator_response: responseText || null,
        },
      },
      {
        onSuccess: () => {
          setIsRespondDialogOpen(false);
        },
      }
    );
  };

  // Handle delete
  const handleDelete = (feedbackId: string) => {
    if (!confirm('Are you sure you want to delete this feedback?')) {
      return;
    }
    deleteMutation.mutate(feedbackId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48 bg-muted/60" />
          <Skeleton className="h-4 w-64 bg-muted/60" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full bg-muted/60" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const isSubmitting = updateMutation.isPending;

  const stats = {
    total: feedbackList.length,
    new: feedbackList.filter(f => f.status === 'new').length,
    inProgress: feedbackList.filter(f => f.status === 'in_progress').length,
    resolved: feedbackList.filter(f => f.status === 'resolved').length,
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              User Feedback
            </h1>
            <p className="text-muted-foreground">
              View and respond to user feedback
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">New</p>
            <p className="text-2xl font-bold text-green-600">{stats.new}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">Resolved</p>
            <p className="text-2xl font-bold text-purple-600">{stats.resolved}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-foreground mb-2 block">
                Type
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Feedback List */}
        {feedbackList.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No feedback yet
            </h3>
            <p className="text-muted-foreground">
              User feedback will appear here
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {feedbackList.map((feedback) => (
              <Card key={feedback.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {feedback.subject && (
                          <h3 className="text-lg font-semibold text-foreground">
                            {feedback.subject}
                          </h3>
                        )}
                        <Badge className={feedbackTypeColors[feedback.feedback_type]}>
                          {feedback.feedback_type}
                        </Badge>
                        <Badge className={statusColors[feedback.status]}>
                          {feedback.status.replace('_', ' ')}
                        </Badge>
                        {feedback.rating && (
                          <div className="flex items-center gap-1">
                            {Array.from({ length: feedback.rating }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-foreground mb-3 whitespace-pre-wrap">
                        {feedback.message}
                      </p>
                      {feedback.creator_response && (
                        <div className="mt-4 p-4 bg-muted/50 rounded-lg border-l-4 border-blue-500">
                          <p className="text-sm font-medium text-foreground mb-1">Your Response:</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {feedback.creator_response}
                          </p>
                          {feedback.responded_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Responded {formatDistanceToNow(new Date(feedback.responded_at), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {feedback.user_id ? 'Registered User' : 'Anonymous'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openRespondDialog(feedback)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Respond / Update Status
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(feedback.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Respond Dialog */}
        <Dialog open={isRespondDialogOpen} onOpenChange={setIsRespondDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Respond to Feedback</DialogTitle>
              <DialogDescription>
                Update the status and optionally add a response to the user.
              </DialogDescription>
            </DialogHeader>
            {selectedFeedback && (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-foreground mb-2">Original Message:</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedFeedback.message}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Status
                  </label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Your Response (Optional)
                  </label>
                  <Textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Add a response to the user..."
                    rows={6}
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {responseText.length}/1000 characters
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRespondDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitResponse} disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
