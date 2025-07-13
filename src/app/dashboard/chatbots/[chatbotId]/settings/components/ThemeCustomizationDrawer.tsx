import React from 'react';
import { Drawer, DrawerHeader, DrawerTitle, DrawerPortal, DrawerOverlay } from '@/components/ui/drawer';
import * as DrawerPrimitive from 'vaul';
import { Switch } from '@/components/ui/switch';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ThemeCustomizationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'light' | 'dark';
  setMode: (m: 'light' | 'dark') => void;
  hasUnsavedChanges: boolean;
  isCustomTheme: boolean;
  onSaveAsNew: () => void;
  onUpdateExisting?: () => void;
  isCreatingTheme: boolean;
  isUpdatingTheme: boolean;
  onCancel?: () => void;
  children?: React.ReactNode;
}

const SideDrawerContent: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <DrawerPortal>
    {/* Transparent, click-through overlay */}
    <DrawerOverlay className="bg-transparent" />
    <DrawerPrimitive.Content
      className={cn(
        "fixed left-0 bottom-0 z-50 flex h-auto flex-col rounded-t-[10px] border bg-background md:h-full md:w-[400px]",
        className
      )}
    >
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted md:hidden" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
);

export const ThemeCustomizationDrawer: React.FC<ThemeCustomizationDrawerProps> = ({
  open,
  onOpenChange,
  mode,
  setMode,
  hasUnsavedChanges,
  isCustomTheme,
  onSaveAsNew,
  onUpdateExisting,
  isCreatingTheme,
  isUpdatingTheme,
  onCancel,
  children
}) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <SideDrawerContent className="flex flex-col h-[90vh] md:h-full">
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-between">
            <span>Theme Customization</span>
            <div className="flex items-center gap-2 text-sm">
              <span className={mode==='light'? 'font-semibold':'text-muted-foreground'}>Light</span>
              <Switch checked={mode==='dark'} onCheckedChange={(c)=> setMode(c? 'dark':'light')} />
              <span className={mode==='dark'? 'font-semibold':'text-muted-foreground'}>Dark</span>
            </div>
          </DrawerTitle>
        </DrawerHeader>
        <Separator />
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {children /* future tabs & controls */}
        </div>
        {hasUnsavedChanges && (
          <div className="p-4 border-t flex justify-end gap-2">
            {isCustomTheme && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onUpdateExisting}
                disabled={isUpdatingTheme}
              >
                {isUpdatingTheme ? 'Updating…' : 'Update Theme'}
              </Button>
            )}
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
            <RainbowButton
              size="sm"
              onClick={onSaveAsNew}
              disabled={isCreatingTheme}
            >
              {isCreatingTheme ? 'Saving…' : 'Save as New'}
            </RainbowButton>
          </div>
        )}
      </SideDrawerContent>
    </Drawer>
  );
}; 