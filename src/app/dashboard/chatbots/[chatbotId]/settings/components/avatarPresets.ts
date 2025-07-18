export interface PresetAvatar {
  id: string;
  name: string;
  url: string;
}

export const aiMessageAvatarPresets: PresetAvatar[] = [
  {
    id: "ai-bot-1",
    name: "AI Bot Icon 1",
    url: "/presets/avatars/ai-bot-icon-1.svg", // Example path, replace with actual or placeholder
  },
  {
    id: "ai-bot-2",
    name: "AI Bot Icon 2",
    url: "/presets/avatars/ai-bot-icon-2.svg",
  },
  {
    id: "ai-bot-generic",
    name: "Generic AI",
    url: "/presets/avatars/ai-generic.png",
  },
  // Add more AI presets
];

export const userMessageAvatarPresets: PresetAvatar[] = [
  {
    id: "user-generic-1",
    name: "User Icon 1",
    url: "/presets/avatars/user-icon-1.svg", // Example path
  },
  {
    id: "user-generic-2",
    name: "User Icon 2",
    url: "/presets/avatars/user-icon-2.svg",
  },
  // Add more User presets
];

export const brandingLogoPresets: PresetAvatar[] = [
  {
    id: "brand-logo-placeholder-1",
    name: "Placeholder Logo 1",
    url: "/presets/logos/brand-placeholder-1.png",
  },
  {
    id: "brand-logo-placeholder-2",
    name: "Placeholder Logo 2",
    url: "/presets/logos/brand-placeholder-2.svg",
  },
  // Add more branding logo presets
]; 