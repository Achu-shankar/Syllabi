import React from 'react';
import { Drawer, DrawerHeader, DrawerTitle, DrawerPortal, DrawerOverlay } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import { Separator } from '@/components/ui/separator';
import * as DrawerPrimitive from 'vaul';

interface ChatBubbleDrawerProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
  onCancel?: () => void;
}

const SideDrawerContent: React.FC<{children: React.ReactNode}> = ({ children }) => (
  <DrawerPortal>
    <DrawerOverlay className="bg-transparent" />
    <DrawerPrimitive.Content className="fixed left-0 bottom-0 z-50 flex flex-col h-[90vh] md:h-full md:w-[400px] rounded-t-lg md:rounded-none border bg-background">
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
);

export const ChatBubbleDrawer: React.FC<ChatBubbleDrawerProps> = ({ open, onOpenChange, onSave, saving, onCancel, children }) => {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <SideDrawerContent>
        <DrawerHeader>
          <DrawerTitle>Chat Bubble Customization</DrawerTitle>
        </DrawerHeader>
        <Separator />
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {children}
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => { onCancel ? onCancel() : onOpenChange(false); }}>Cancel</Button>
          <RainbowButton size="sm" onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</RainbowButton>
        </div>
      </SideDrawerContent>
    </Drawer>
  );
}; 