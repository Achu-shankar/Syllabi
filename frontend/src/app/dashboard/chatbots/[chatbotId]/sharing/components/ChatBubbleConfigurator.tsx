'use client';

import React from 'react';
import { BubbleConfig, BubblePosition, BubbleSize, BubbleStyle, ChatDisplayMode, ChatSessionMode } from '../types/chatBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ChatBubbleConfiguratorProps {
  config: BubbleConfig;
  onChange: (config: BubbleConfig) => void;
}

export function ChatBubbleConfigurator({ config, onChange }: ChatBubbleConfiguratorProps) {
  const updateConfig = (updates: Partial<BubbleConfig>) => {
    onChange({ ...config, ...updates });
  };

  const updateColors = (colorUpdates: Partial<BubbleConfig['colors']>) => {
    onChange({
      ...config,
      colors: { ...config.colors, ...colorUpdates }
    });
  };

  const commonIcons = ['💬', '🗨️', '💭', '🤖', '👋', '❓', '💡', '📞', '✉️', '🎯'];

  return (
    <div className="space-y-6">
      {/* Position & Style */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Position & Style</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select
                value={config.position}
                onValueChange={(value: BubblePosition) => updateConfig({ position: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="top-left">Top Left</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="size">Size</Label>
              <Select
                value={config.size}
                onValueChange={(value: BubbleSize) => updateConfig({ size: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (50px)</SelectItem>
                  <SelectItem value="medium">Medium (60px)</SelectItem>
                  <SelectItem value="large">Large (70px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">Style</Label>
            <Select
              value={config.style}
              onValueChange={(value: BubbleStyle) => updateConfig({ style: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="circular">Circular</SelectItem>
                <SelectItem value="rounded">Rounded</SelectItem>
                <SelectItem value="square">Square</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Icon & Tooltip */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Icon & Tooltip</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {commonIcons.map((icon) => (
                <Button
                  key={icon}
                  variant={config.icon === icon ? "default" : "outline"}
                  size="sm"
                  className="text-lg px-3 py-2"
                  onClick={() => updateConfig({ icon })}
                >
                  {icon}
                </Button>
              ))}
            </div>
            <Input
              value={config.icon}
              onChange={(e) => updateConfig({ icon: e.target.value })}
              placeholder="Or enter custom icon/emoji"
              className="text-center text-lg"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="showTooltip">Show Tooltip</Label>
            <Switch
              id="showTooltip"
              checked={config.showTooltip}
              onCheckedChange={(showTooltip) => updateConfig({ showTooltip })}
            />
          </div>

          {config.showTooltip && (
            <div className="space-y-2">
              <Label htmlFor="tooltip">Tooltip Text</Label>
              <Input
                value={config.tooltip}
                onChange={(e) => updateConfig({ tooltip: e.target.value })}
                placeholder="Chat with us!"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Colors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="backgroundColor">Background Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={config.colors.backgroundColor}
                  onChange={(e) => updateColors({ backgroundColor: e.target.value })}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  value={config.colors.backgroundColor}
                  onChange={(e) => updateColors({ backgroundColor: e.target.value })}
                  placeholder="#3b82f6"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hoverBackgroundColor">Hover Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={config.colors.hoverBackgroundColor}
                  onChange={(e) => updateColors({ hoverBackgroundColor: e.target.value })}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  value={config.colors.hoverBackgroundColor}
                  onChange={(e) => updateColors({ hoverBackgroundColor: e.target.value })}
                  placeholder="#2563eb"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="textColor">Text Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={config.colors.textColor}
                  onChange={(e) => updateColors({ textColor: e.target.value })}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  value={config.colors.textColor}
                  onChange={(e) => updateColors({ textColor: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="modalBackgroundColor">Modal Background</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={config.colors.modalBackgroundColor}
                  onChange={(e) => updateColors({ modalBackgroundColor: e.target.value })}
                  className="w-12 h-10 p-1 border rounded"
                />
                <Input
                  value={config.colors.modalBackgroundColor}
                  onChange={(e) => updateColors({ modalBackgroundColor: e.target.value })}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Display Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Display Style</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayMode">Chat Opening Style</Label>
            <Select
              value={config.displayMode}
              onValueChange={(value: ChatDisplayMode) => updateConfig({ displayMode: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modal">Full Modal - Covers entire screen</SelectItem>
                <SelectItem value="popover">Popover - Small chat window</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="modalWidth">{config.displayMode === 'modal' ? 'Modal' : 'Popover'} Width</Label>
              <Input
                value={config.modalWidth}
                onChange={(e) => updateConfig({ modalWidth: e.target.value })}
                placeholder={config.displayMode === 'modal' ? '400px' : '350px'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modalHeight">{config.displayMode === 'modal' ? 'Modal' : 'Popover'} Height</Label>
              <Input
                value={config.modalHeight}
                onChange={(e) => updateConfig({ modalHeight: e.target.value })}
                placeholder={config.displayMode === 'modal' ? '600px' : '500px'}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zIndex">Z-Index</Label>
            <Input
              type="number"
              value={config.zIndex}
              onChange={(e) => updateConfig({ zIndex: parseInt(e.target.value) || 1000 })}
              placeholder="1000"
            />
          </div>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chat Memory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sessionMode">Session Persistence</Label>
            <Select
              value={config.sessionMode}
              onValueChange={(value: ChatSessionMode) => updateConfig({ sessionMode: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="persistent">Persistent - Save chat history & allow multiple conversations</SelectItem>
                <SelectItem value="stateless">Stateless - Fresh conversation each time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {config.sessionMode === 'persistent' 
                ? '✅ Users can switch between multiple conversations and access chat history'
                : '⚠️ Each chat session starts fresh with no memory of previous conversations'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Presets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => updateConfig({
                colors: {
                  backgroundColor: '#3b82f6',
                  textColor: '#ffffff',
                  hoverBackgroundColor: '#2563eb',
                  modalBackgroundColor: '#ffffff',
                  modalOverlayColor: 'rgba(0, 0, 0, 0.5)',
                },
                icon: '💬'
              })}
            >
              🔵 Blue
            </Button>
            <Button
              variant="outline"
              onClick={() => updateConfig({
                colors: {
                  backgroundColor: '#10b981',
                  textColor: '#ffffff',
                  hoverBackgroundColor: '#059669',
                  modalBackgroundColor: '#ffffff',
                  modalOverlayColor: 'rgba(0, 0, 0, 0.5)',
                },
                icon: '🤖'
              })}
            >
              🟢 Green
            </Button>
            <Button
              variant="outline"
              onClick={() => updateConfig({
                colors: {
                  backgroundColor: '#f59e0b',
                  textColor: '#ffffff',
                  hoverBackgroundColor: '#d97706',
                  modalBackgroundColor: '#ffffff',
                  modalOverlayColor: 'rgba(0, 0, 0, 0.5)',
                },
                icon: '💡'
              })}
            >
              🟡 Orange
            </Button>
            <Button
              variant="outline"
              onClick={() => updateConfig({
                colors: {
                  backgroundColor: '#1f2937',
                  textColor: '#ffffff',
                  hoverBackgroundColor: '#374151',
                  modalBackgroundColor: '#ffffff',
                  modalOverlayColor: 'rgba(0, 0, 0, 0.5)',
                },
                icon: '👋'
              })}
            >
              ⚫ Dark
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 