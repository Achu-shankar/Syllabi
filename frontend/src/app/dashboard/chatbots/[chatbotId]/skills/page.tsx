'use client';

import { useState } from 'react';
import { Plus, Search, Filter, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import { useSkills } from './hooks/useSkills';
import { ActionModalV2 } from './components/ActionModalV2';
import { ActionsList } from './components/ActionsList';
import { CategorySkillsView } from './components/CategorySkillsView';
import { BrowseSkillsModal } from './components/BrowseSkillsModal';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import { GlowEffect } from '@/components/ui/glow-effect';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skill } from '@/app/dashboard/libs/skills_db_queries_v2';

export default function SkillsPage() {
  const params = useParams();
  const chatbotId = params.chatbotId as string;
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<Skill | null>(null);
  const [browseSkillsOpen, setBrowseSkillsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'category'>('category');

  const { data: skills = [], isLoading, error, deleteSkill, toggleSkillStatus } = useSkills(chatbotId);
  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-10 px-6 lg:px-0">
        <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-8 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-4" />
          <h3 className="text-xl font-semibold text-destructive mb-2">Failed to load actions</h3>
          <p className="text-destructive/80 text-sm">
            {(error as any)?.message || 'An unexpected error occurred. Please try refreshing the page.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-10 px-6 lg:px-0">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Actions</h1>
          <p className="text-base text-muted-foreground">
            Create and manage custom actions for your chatbot
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => setBrowseSkillsOpen(true)}
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            Browse Skills
          </Button>
          <div className="relative group">
            <GlowEffect
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              colors={['#9c40ff', '#ffaa40', '#3357FF']}
              mode='rotate'
              blur='strong'
              duration={5}
              scale={1.1}
            />
            <RainbowButton onClick={() => setCreateModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Action
            </RainbowButton>
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 bg-secondary rounded-lg flex items-center justify-center text-sm" aria-hidden="true">
              ⚡
            </div>
            <h2 className="text-xl font-medium text-foreground">Your Actions</h2>
            <span className="bg-secondary text-secondary-foreground text-xs font-medium px-2 py-1 rounded-full">
              {skills.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 h-9"
              />
            </div>

            {/* Filter Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2 h-9">
                  <Filter className="h-4 w-4" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-blue-500"></span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">Filters</h3>
                    {hasActiveFilters && (
                      <Button
                        onClick={clearAllFilters}
                        variant="ghost"
                        size="sm"
                        className="text-xs h-auto py-1 px-2"
                      >
                        Clear All
                      </Button>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-2 block text-muted-foreground">Status</label>
                    <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* View Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'category' ? 'list' : 'category')}
              className="h-9"
            >
              {viewMode === 'category' ? 'View all' : 'View by category'}
            </Button>
          </div>
        </div>
        
        {/* Conditional rendering based on view mode */}
        {viewMode === 'list' ? (
          <ActionsList 
            chatbotId={chatbotId} 
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            onOpenCreateModal={() => setCreateModalOpen(true)}
          />
        ) : (
          <CategorySkillsView
            skills={skills.filter((skill: any) => {
              const searchMatch = searchQuery.trim() === '' || 
                skill.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                skill.category.toLowerCase().includes(searchQuery.toLowerCase());
              
              const statusMatch = statusFilter === 'all' || 
                (statusFilter === 'active' && skill.association?.is_active) ||
                (statusFilter === 'inactive' && !skill.association?.is_active);

              return searchMatch && statusMatch;
            })}
            isLoading={isLoading}
            onEditSkill={(skill) => setEditingAction(skill)}
            onDeleteSkill={(skill) => deleteSkill(skill.id)}
            onToggleStatus={(skill) => toggleSkillStatus(skill.id)}
          />
        )}
      </div>

      {/* Create Modal */}
      <ActionModalV2
        mode="create"
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        chatbotId={chatbotId}
      />

      {/* Edit Modal */}
      <ActionModalV2
        mode="edit"
        open={!!editingAction}
        onOpenChange={(open) => !open && setEditingAction(null)}
        chatbotId={chatbotId}
        action={editingAction}
      />

      {/* Browse Skills Modal */}
      <BrowseSkillsModal
        open={browseSkillsOpen}
        onOpenChange={setBrowseSkillsOpen}
        chatbotId={chatbotId}
      />
    </div>
  );
} 