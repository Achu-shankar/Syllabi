'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Plus, 
  Filter, 
  X, 
  Library, 
  Zap,
  Globe,
  User,
  AlertTriangle 
} from 'lucide-react';
import { useAvailableSkills, useSkills } from '../hooks/useSkills';
import { cn } from '@/lib/utils';

interface SkillWithStatus {
  id: string;
  display_name: string;
  description: string;
  category: string;
  type: 'custom' | 'builtin';
  execution_count: number;
  isAlreadyAdded: boolean;
}

interface BrowseSkillsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatbotId: string;
}

export function BrowseSkillsModal({ open, onOpenChange, chatbotId }: BrowseSkillsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'custom' | 'builtin'>('all');

  const { data: availableSkills, isLoading, error } = useAvailableSkills(chatbotId);
  const { addExistingSkill, isAddingExisting } = useSkills(chatbotId);

  const handleAddSkill = (skillId: string) => {
    addExistingSkill(skillId);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setTypeFilter('all');
  };

  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(
    (availableSkills as SkillWithStatus[]).map(skill => skill.category)
  )).sort();

  // Filter skills based on search and filters
  const filteredSkills = (availableSkills as SkillWithStatus[]).filter((skill: SkillWithStatus) => {
    const searchMatch = searchQuery.trim() === '' || 
      skill.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const categoryMatch = categoryFilter === 'all' || skill.category === categoryFilter;
    const typeMatch = typeFilter === 'all' || skill.type === typeFilter;

    return searchMatch && categoryMatch && typeMatch;
  });

  const hasActiveFilters = searchQuery.trim() !== '' || categoryFilter !== 'all' || typeFilter !== 'all';

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Library className="h-5 w-5" />
              Browse Skills Library
            </DialogTitle>
          </DialogHeader>
          <div className="border border-destructive/20 bg-destructive/5 rounded-lg p-8 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-destructive mb-2">Failed to load skills</h3>
            <p className="text-destructive/80 text-sm">
              {(error as any)?.message || 'An unexpected error occurred. Please try again.'}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Browse Skills Library
          </DialogTitle>
          <DialogDescription>
            Add existing skills to your chatbot from your library and built-in skills.
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 p-1 flex-shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={(value: 'all' | 'custom' | 'builtin') => setTypeFilter(value)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
              <SelectItem value="builtin">Built-in</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Skills List */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="pr-4">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4 mb-4" />
                      <Skeleton className="h-8 w-20" />
                    </Card>
                  ))}
                </div>
              ) : filteredSkills.length === 0 ? (
                <div className="text-center py-12">
                  <Library className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {hasActiveFilters ? 'No skills match your filters' : 'No skills found'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {hasActiveFilters 
                      ? 'Try adjusting your search or filters to find more skills.'
                      : 'Create your first skill to get started.'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredSkills.map((skill: SkillWithStatus) => (
                    <Card key={skill.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate mb-1">
                            {skill.display_name}
                          </h3>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs",
                                skill.type === 'builtin' ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                              )}
                            >
                              {skill.type === 'builtin' ? (
                                <><Globe className="h-3 w-3 mr-1" />Built-in</>
                              ) : (
                                <><User className="h-3 w-3 mr-1" />Custom</>
                              )}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {skill.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-muted-foreground text-sm line-clamp-2 mb-4" title={skill.description}>
                        {skill.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          Used {skill.execution_count || 0} times
                        </div>
                        {skill.isAlreadyAdded ? (
                          <Badge variant="secondary" className="text-xs">
                            Already Added
                          </Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => handleAddSkill(skill.id)}
                            disabled={isAddingExisting}
                            className="flex items-center gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            {filteredSkills.length} skill{filteredSkills.length !== 1 ? 's' : ''} found
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 