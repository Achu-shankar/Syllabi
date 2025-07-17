'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  ChevronDown, 
  ChevronRight, 
  Activity, 
  MoreVertical,
  Edit,
  Trash2,
  BarChart,
  Clock,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skill } from '@/app/dashboard/libs/skills_db_queries_v2';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SkillWithAssociation extends Skill {
  association: {
    id: string;
    is_active: boolean;
    custom_config?: Record<string, any>;
  };
}

interface CategorySkillsViewProps {
  skills: SkillWithAssociation[];
  isLoading: boolean;
  onEditSkill: (skill: SkillWithAssociation) => void;
  onDeleteSkill: (skill: SkillWithAssociation) => void;
  onToggleStatus: (skill: SkillWithAssociation) => void;
  onToggleCategory?: (category: string, enabled: boolean) => void;
}

interface GroupedSkills {
  [category: string]: SkillWithAssociation[];
}

export function CategorySkillsView({ 
  skills, 
  isLoading, 
  onEditSkill, 
  onDeleteSkill, 
  onToggleStatus,
  onToggleCategory 
}: CategorySkillsViewProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Group skills by category
  const groupedSkills: GroupedSkills = skills.reduce((acc, skill) => {
    const category = skill.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(skill);
    return acc;
  }, {} as GroupedSkills);

  // Sort categories alphabetically
  const sortedCategories = Object.keys(groupedSkills).sort((a, b) => {
    // Put 'Uncategorized' at the end
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleSkillSelection = (skillId: string) => {
    const newSelected = new Set(selectedSkills);
    if (newSelected.has(skillId)) {
      newSelected.delete(skillId);
    } else {
      newSelected.add(skillId);
    }
    setSelectedSkills(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const selectAllInCategory = (category: string) => {
    const categorySkillIds = groupedSkills[category].map(s => s.id);
    const allSelected = categorySkillIds.every(id => selectedSkills.has(id));
    
    const newSelected = new Set(selectedSkills);
    if (allSelected) {
      // Deselect all in category
      categorySkillIds.forEach(id => newSelected.delete(id));
    } else {
      // Select all in category
      categorySkillIds.forEach(id => newSelected.add(id));
    }
    setSelectedSkills(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const bulkToggleStatus = async (enable: boolean) => {
    const selectedSkillsList = skills.filter(s => selectedSkills.has(s.id));
    
    // Toggle all selected skills
    for (const skill of selectedSkillsList) {
      if (skill.association.is_active !== enable) {
        await onToggleStatus(skill);
      }
    }
    
    // Clear selection
    setSelectedSkills(new Set());
    setShowBulkActions(false);
  };

  const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'Slack': <img src="/slack.svg" alt="Slack" className="w-4 h-4" />,
      'Google Drive': <img src="/google-drive.svg" alt="Google Drive" className="w-4 h-4" />,
      'Discord': <img src="/discord.svg" alt="Discord" className="w-4 h-4" />,
      'API': <Zap className="w-4 h-4" />,
      'Database': <Activity className="w-4 h-4" />,
      'Analytics': <BarChart className="w-4 h-4" />,
      'Automation': <Clock className="w-4 h-4" />,
    };
    return iconMap[category] || <Activity className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                <div>
                  <div className="h-5 w-32 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="h-5 w-5 bg-muted rounded animate-pulse" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <Card className="p-3 bg-muted/50 border-primary/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedSkills.size} skill{selectedSkills.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bulkToggleStatus(true)}
                >
                  Enable Selected
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => bulkToggleStatus(false)}
                >
                  Disable Selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedSkills(new Set());
                    setShowBulkActions(false);
                  }}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </Card>
        )}

        {sortedCategories.map((category) => {
          const categorySkills = groupedSkills[category];
          const isExpanded = expandedCategories.has(category);
          const activeCount = categorySkills.filter(s => s.association.is_active).length;
          const totalCount = categorySkills.length;
          const categorySkillIds = categorySkills.map(s => s.id);
          const allSelected = categorySkillIds.length > 0 && categorySkillIds.every(id => selectedSkills.has(id));
          const someSelected = categorySkillIds.some(id => selectedSkills.has(id));

          return (
            <Card key={category} className="overflow-hidden">
              <div 
                className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleCategory(category)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCategory(category);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => selectAllInCategory(category)}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        someSelected && !allSelected && "data-[state=checked]:bg-primary/50"
                      )}
                    />
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category)}
                      <h3 className="font-semibold text-base">{category}</h3>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {activeCount}/{totalCount} active
                    </Badge>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t">
                  <div className="divide-y">
                    {categorySkills.map((skill) => (
                      <div 
                        key={skill.id}
                        className="p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <Checkbox
                              checked={selectedSkills.has(skill.id)}
                              onCheckedChange={() => toggleSkillSelection(skill.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">{skill.display_name}</h4>
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    "text-xs",
                                    skill.association.is_active ? "text-green-600 border-green-600/50" : "text-muted-foreground"
                                  )}
                                >
                                  {skill.association.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {skill.description}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <code className="bg-secondary/60 px-1.5 py-0.5 rounded">
                                    {skill.name}
                                  </code>
                                </span>
                                <span>Executed {skill.execution_count} times</span>
                                {skill.last_executed_at && (
                                  <span>
                                    Last used {new Date(skill.last_executed_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={skill.association.is_active}
                              onCheckedChange={() => onToggleStatus(skill)}
                              className="data-[state=checked]:bg-primary"
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEditSkill(skill)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => onDeleteSkill(skill)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
} 