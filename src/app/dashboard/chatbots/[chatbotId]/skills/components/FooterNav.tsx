import React from 'react';
import { Button } from '@/components/ui/button';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import { ArrowLeft, ArrowRight, Save, Loader2 } from 'lucide-react';

interface FooterNavProps {
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
  canGoNext: boolean;
  canGoBack: boolean;
  isLastStep: boolean;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export function FooterNav({ onNext, onBack, onCancel, canGoNext, canGoBack, isLastStep, isLoading, mode }: FooterNavProps) {
  return (
    <div className="flex items-center justify-between">
      {/* Back Button */}
      <Button
        variant="outline"
        onClick={onBack}
        disabled={!canGoBack}
        className="min-w-[100px]"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      {/* Cancel and Next/Save Group */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="min-w-[80px]"
        >
          Cancel
        </Button>
        {isLastStep ? (
          <RainbowButton
            onClick={onNext}
            disabled={!canGoNext || isLoading}
            className="min-w-[140px]"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {mode === 'create' ? 'Create Action' : 'Update Action'}
          </RainbowButton>
        ) : (
          <RainbowButton
            onClick={onNext}
            disabled={!canGoNext}
            className="min-w-[100px]"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </RainbowButton>
        )}
      </div>
    </div>
  );
} 