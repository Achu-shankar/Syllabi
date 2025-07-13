import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// For now, let's create client-side versions that call our API endpoints
// This is a temporary solution for testing

export function useSkills(chatbotId: string) {
  const queryClient = useQueryClient();

  // Fetch skills for this chatbot using API
  const skillsQuery = useQuery({
    queryKey: ['skills', chatbotId],
    queryFn: async () => {
      const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/skills`);
      if (!response.ok) throw new Error('Failed to fetch skills');
      const data = await response.json();
      return data.skills;
    },
    enabled: !!chatbotId,
  });

  // Create skill mutation
  const createSkillMutation = useMutation({
    mutationFn: async (skillData: any) => {
      // First create the skill
      const response = await fetch('/api/dashboard/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skillData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create skill');
      }
      
      const { skill } = await response.json();
      
      // Then associate it with the chatbot
      const associationResponse = await fetch(`/api/dashboard/chatbots/${chatbotId}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_id: skill.id,
          is_active: true,
        }),
      });
      
      if (!associationResponse.ok) {
        const error = await associationResponse.json();
        throw new Error(error.error || 'Failed to associate skill');
      }
      
      return skill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', chatbotId] });
      toast.success('Action created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create action');
    },
  });

  // Add existing skill to chatbot
  const addExistingSkillMutation = useMutation({
    mutationFn: async (skillId: string) => {
      const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skill_id: skillId,
          is_active: true,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add skill to chatbot');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', chatbotId] });
      queryClient.invalidateQueries({ queryKey: ['available-skills'] });
      toast.success('Action added to chatbot successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add action to chatbot');
    },
  });

  // Update skill mutation (calls API endpoint)
  const updateSkillMutation = useMutation({
    mutationFn: async ({ skillId, updates }: { skillId: string; updates: any }) => {
      const response = await fetch(`/api/dashboard/skills/${skillId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update skill');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', chatbotId] });
      toast.success('Action updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update action');
    },
  });

  // Delete skill association
  const deleteSkillMutation = useMutation({
    mutationFn: async (skillId: string) => {
      const skill = skillsQuery.data?.find((s: any) => s.id === skillId);
      if (!skill) throw new Error('Skill not found');
      
      console.log('Deleting skill:', {
        skillId,
        skill,
        associationId: skill.association?.id,
        hasAssociation: !!skill.association
      });
      
      if (!skill.association?.id) {
        throw new Error('No association ID found for this skill');
      }
      
      const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/skills/${skill.association.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Delete API error:', error);
        throw new Error(error.error || 'Failed to remove skill');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills', chatbotId] });
      queryClient.invalidateQueries({ queryKey: ['available-skills'] });
      toast.success('Action removed from chatbot');
    },
    onError: (error: Error) => {
      console.error('Delete mutation error:', error);
      toast.error(error.message || 'Failed to remove action');
    },
  });

  // Toggle skill status
  const toggleSkillStatus = async (skillId: string) => {
    const skill = skillsQuery.data?.find((s: any) => s.id === skillId);
    if (!skill) return;

    try {
      const response = await fetch(`/api/dashboard/chatbots/${chatbotId}/skills/${skill.association.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !skill.association.is_active
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle status');
      }
      
      queryClient.invalidateQueries({ queryKey: ['skills', chatbotId] });
      toast.success(`Action ${skill.association.is_active ? 'disabled' : 'enabled'}`);
    } catch (error) {
      toast.error('Failed to toggle action status');
    }
  };

  return {
    data: skillsQuery.data || [],
    isLoading: skillsQuery.isLoading,
    error: skillsQuery.error,
    refetch: skillsQuery.refetch,
    createSkill: createSkillMutation.mutate,
    addExistingSkill: addExistingSkillMutation.mutate,
    updateSkill: updateSkillMutation.mutate,
    deleteSkill: deleteSkillMutation.mutate,
    toggleSkillStatus,
    isCreating: createSkillMutation.isPending,
    isAddingExisting: addExistingSkillMutation.isPending,
    isUpdating: updateSkillMutation.isPending,
    isDeleting: deleteSkillMutation.isPending,
  };
}

/**
 * Hook to fetch available skills that can be added to the chatbot
 */
export function useAvailableSkills(chatbotId: string) {
  const queryClient = useQueryClient();

  const availableSkillsQuery = useQuery({
    queryKey: ['available-skills', chatbotId],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/skills');
      if (!response.ok) throw new Error('Failed to fetch available skills');
      const data = await response.json();
      
      // Also fetch current chatbot skills to mark which ones are already added
      const chatbotResponse = await fetch(`/api/dashboard/chatbots/${chatbotId}/skills`);
      if (!chatbotResponse.ok) throw new Error('Failed to fetch chatbot skills');
      const chatbotData = await chatbotResponse.json();
      
      const currentSkillIds = new Set(chatbotData.skills.map((skill: any) => skill.id));
      
      // Add isAlreadyAdded flag to each skill instead of filtering them out
      const skillsWithStatus = data.skills.map((skill: any) => ({
        ...skill,
        isAlreadyAdded: currentSkillIds.has(skill.id)
      }));
      
      return skillsWithStatus;
    },
    enabled: !!chatbotId,
  });

  return {
    data: availableSkillsQuery.data || [],
    isLoading: availableSkillsQuery.isLoading,
    error: availableSkillsQuery.error,
    refetch: availableSkillsQuery.refetch,
  };
} 