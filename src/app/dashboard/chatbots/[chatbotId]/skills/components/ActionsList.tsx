'use client';

import { useState } from 'react';
import { 
  MoreHorizontal, 
  Play, 
  Edit, 
  Trash2, 
  Power, 
  PowerOff,
  Activity,
  Edit3,
  Search,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { type Skill } from '@/app/dashboard/libs/skills_db_queries_v2';
import { useSkills } from '../hooks/useSkills';
import { TestActionModal } from './TestActionModal';
import { ActionModalV2 } from './ActionModalV2';
import { cn } from '@/lib/utils';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import { GlowEffect } from '@/components/ui/glow-effect';

interface SkillWithAssociation extends Skill {
  association: {
    id: string;
    is_active: boolean;
    custom_config?: Record<string, any>;
  };
}

interface ActionsListProps {
  chatbotId: string;
  searchQuery: string;
  statusFilter: 'all' | 'active' | 'inactive';
  onOpenCreateModal: () => void;
}

export function ActionsList({ chatbotId, searchQuery, statusFilter, onOpenCreateModal }: ActionsListProps) {
  const { data: skills = [], isLoading, error, deleteSkill, toggleSkillStatus, refetch } = useSkills(chatbotId);
  const [testingAction, setTestingAction] = useState<SkillWithAssociation | null>(null);
  const [editingAction, setEditingAction] = useState<SkillWithAssociation | null>(null);
  const [deletingAction, setDeletingAction] = useState<SkillWithAssociation | null>(null);

  const handleDeleteAction = (action: SkillWithAssociation) => {
    setDeletingAction(action);
  };

  const confirmDeleteAction = () => {
    if (!deletingAction) return;
    
    deleteSkill(deletingAction.id);
    setDeletingAction(null);
  };

  const handleToggleStatus = (action: SkillWithAssociation) => {
    toggleSkillStatus(action.id);
  };

  const filteredSkills = (skills || []).filter((skill: SkillWithAssociation) => {
    const searchMatch = searchQuery.trim() === '' || 
      skill.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'active' && skill.association?.is_active) ||
      (statusFilter === 'inactive' && !skill.association?.is_active);

    return searchMatch && statusMatch;
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-1/4" />
              </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex items-center justify-end mt-4">
              <Skeleton className="h-8 w-20" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <Card className="p-12 border-dashed">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No actions yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first custom action to extend your chatbot's capabilities.
          </p>
          <div className="relative group inline-block">
            <GlowEffect
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              colors={['#9c40ff', '#ffaa40', '#3357FF']}
              mode='rotate'
              blur='strong'
              duration={5}
              scale={1.1}
            />
            <RainbowButton onClick={onOpenCreateModal} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Action
            </RainbowButton>
          </div>
        </div>
      </Card>
    );
  }

  if (filteredSkills.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No actions found</h3>
          <p className="text-muted-foreground">
            Your search and filters did not match any actions.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSkills.map((action: SkillWithAssociation) => (
          <Card 
            key={action.id} 
            className="p-5 border shadow-sm hover:shadow-md rounded-xl transition-all group flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            tabIndex={0}
          >
            <div className="flex-grow">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="font-semibold text-lg truncate">{action.display_name}</h3>
                  <Badge 
                  variant="secondary"
                  className={cn(
                    "flex items-center gap-1.5 ring-1 ring-border flex-shrink-0",
                    action.association?.is_active ? "text-green-600" : "text-muted-foreground"
                  )}
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    action.association?.is_active ? "bg-green-500 animate-pulse [animation-duration:3s]" : "bg-muted-foreground/50"
                  )} />
                    {action.association?.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              <p className="text-muted-foreground text-sm line-clamp-2" title={action.description}>
                {action.description}
              </p>
            </div>
            
            <div className="mt-auto pt-3 flex items-center justify-between text-xs text-muted-foreground/80">
              <div className="flex items-center gap-x-2">
                <span className="flex items-center gap-1">
                  Func: <code className="bg-secondary/60 text-muted-foreground text-[11px] tracking-tight px-1.5 py-0.5 rounded">{action.name}</code>
                      </span>
                <span className="text-muted-foreground/40">•</span>
                <span>Exec: {action.execution_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTestingAction(action)}
                  className="gap-2 h-8"
                >
                  <Play className="h-4 w-4" />
                  Test
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setTestingAction(action)}>
                      <Play className="mr-2 h-4 w-4" />
                      Test Action
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setEditingAction(action)}>
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleToggleStatus(action)}>
                      {action.association?.is_active ? (
                        <PowerOff className="mr-2 h-4 w-4" />
                      ) : (
                        <Power className="mr-2 h-4 w-4" />
                      )}
                      {action.association?.is_active ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteAction(action)}
                      className="text-destructive focus:text-destructive-foreground focus:bg-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove from Chatbot
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingAction} onOpenChange={(open: boolean) => !open && setDeletingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Action from Chatbot</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deletingAction?.display_name}" from this chatbot? 
              The action will still be available in your skills library and can be re-added later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Action Modal */}
      {editingAction && (
        <ActionModalV2
          mode="edit"
          action={editingAction}
          open={!!editingAction}
          onOpenChange={(open: boolean) => !open && setEditingAction(null)}
          chatbotId={chatbotId}
        />
      )}

      {/* Test Action Modal */}
      {testingAction && (
        <TestActionModal
          open={!!testingAction}
          onOpenChange={(open: boolean) => !open && setTestingAction(null)}
          action={testingAction}
          chatbotId={chatbotId}
          onLiveExecutionComplete={() => refetch()}
        />
      )}
    </>
  );
} 