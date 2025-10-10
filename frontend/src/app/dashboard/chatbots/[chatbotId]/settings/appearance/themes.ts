import { ThemeConfig, ThemeColors } from "@/app/dashboard/libs/queries";

export interface PredefinedTheme {
  id: string;
  name: string;
  config: ThemeConfig;
}

const defaultLightColors: ThemeColors = {
  primaryColor: "#007bff",
  headerTextColor: "#FFFFFF",
  bubbleBotBackgroundColor: "#F0F0F0",
  bubbleUserBackgroundColor: "#007bff",
  chatWindowBackgroundColor: "#FFFFFF",
  inputBackgroundColor: "#FFFFFF",
  inputTextColor: "#333333",
  sidebarBackgroundColor: "#F8F9FA",
  sidebarTextColor: "#212529",
  inputAreaBackgroundColor: "#F0F0F0",
  bubbleUserTextColor: "#FFFFFF",
  bubbleBotTextColor: "#000000",
  suggestedQuestionChipBackgroundColor: "#FFFFFF",
  suggestedQuestionChipTextColor: "#007bff",
  suggestedQuestionChipBorderColor: "#007bff",
};

const defaultDarkColors: ThemeColors = {
  primaryColor: "#5865F2",
  headerTextColor: "#FFFFFF",
  bubbleBotBackgroundColor: "#36393f",
  bubbleUserBackgroundColor: "#5865F2",
  chatWindowBackgroundColor: "#2f3136",
  inputBackgroundColor: "#40444b",
  inputTextColor: "#FFFFFF",
  sidebarBackgroundColor: "#26282C",
  sidebarTextColor: "#E0E0E0",
  inputAreaBackgroundColor: "#36393f",
  bubbleUserTextColor: "#FFFFFF",
  bubbleBotTextColor: "#E0E0E0",
  suggestedQuestionChipBackgroundColor: "#40444b",
  suggestedQuestionChipTextColor: "#5865F2",
  suggestedQuestionChipBorderColor: "#5865F2",
};

const professionalBlueLightColors: ThemeColors = {
  primaryColor: "#0A4A7B",
  headerTextColor: "#FFFFFF",
  bubbleBotBackgroundColor: "#E9F1F5",
  bubbleUserBackgroundColor: "#0A4A7B",
  chatWindowBackgroundColor: "#F8F9FA",
  inputBackgroundColor: "#FFFFFF",
  inputTextColor: "#212529",
  sidebarBackgroundColor: "#E9ECEF",
  sidebarTextColor: "#0A4A7B",
  inputAreaBackgroundColor: "#F1F3F5",
  bubbleUserTextColor: "#FFFFFF",
  bubbleBotTextColor: "#343A40",
  suggestedQuestionChipBackgroundColor: "#FFFFFF",
  suggestedQuestionChipTextColor: "#0A4A7B",
  suggestedQuestionChipBorderColor: "#0A4A7B",
};

const professionalBlueDarkColors: ThemeColors = {
  primaryColor: "#1E88E5",
  headerTextColor: "#E0E0E0",
  bubbleBotBackgroundColor: "#2C3E50",
  bubbleUserBackgroundColor: "#1E88E5",
  chatWindowBackgroundColor: "#1C2833",
  inputBackgroundColor: "#263238",
  inputTextColor: "#CFD8DC",
  sidebarBackgroundColor: "#212C3D",
  sidebarTextColor: "#E0E0E0",
  inputAreaBackgroundColor: "#2C3E50",
  bubbleUserTextColor: "#FFFFFF",
  bubbleBotTextColor: "#CFD8DC",
  suggestedQuestionChipBackgroundColor: "#263238",
  suggestedQuestionChipTextColor: "#1E88E5",
  suggestedQuestionChipBorderColor: "#1E88E5",
};

const modernDarkLightColors: ThemeColors = {
  primaryColor: "#6366F1",
  headerTextColor: "#FFFFFF",
  bubbleBotBackgroundColor: "#F1F5F9",
  bubbleUserBackgroundColor: "#6366F1",
  chatWindowBackgroundColor: "#FFFFFF",
  inputBackgroundColor: "#F8FAFC",
  inputTextColor: "#1E293B",
  sidebarBackgroundColor: "#F8FAFC",
  sidebarTextColor: "#334155",
  inputAreaBackgroundColor: "#F1F5F9",
  bubbleUserTextColor: "#FFFFFF",
  bubbleBotTextColor: "#475569",
  suggestedQuestionChipBackgroundColor: "#FFFFFF",
  suggestedQuestionChipTextColor: "#6366F1",
  suggestedQuestionChipBorderColor: "#6366F1",
};

const modernDarkDarkColors: ThemeColors = {
  primaryColor: "#8B5CF6",
  headerTextColor: "#F1F5F9",
  bubbleBotBackgroundColor: "#1E1B2E",
  bubbleUserBackgroundColor: "#8B5CF6",
  chatWindowBackgroundColor: "#0F0F0F",
  inputBackgroundColor: "#1A1A1A",
  inputTextColor: "#E2E8F0",
  sidebarBackgroundColor: "#161618",
  sidebarTextColor: "#CBD5E1",
  inputAreaBackgroundColor: "#1E1B2E",
  bubbleUserTextColor: "#FFFFFF",
  bubbleBotTextColor: "#CBD5E1",
  suggestedQuestionChipBackgroundColor: "#1A1A1A",
  suggestedQuestionChipTextColor: "#8B5CF6",
  suggestedQuestionChipBorderColor: "#8B5CF6",
};

const warmOrangeLightColors: ThemeColors = {
  primaryColor: "#EA580C",
  headerTextColor: "#FFFFFF",
  bubbleBotBackgroundColor: "#FEF3E2",
  bubbleUserBackgroundColor: "#EA580C",
  chatWindowBackgroundColor: "#FFFBF5",
  inputBackgroundColor: "#FFFFFF",
  inputTextColor: "#9A3412",
  sidebarBackgroundColor: "#FEF7ED",
  sidebarTextColor: "#9A3412",
  inputAreaBackgroundColor: "#FEF3E2",
  bubbleUserTextColor: "#FFFFFF",
  bubbleBotTextColor: "#9A3412",
  suggestedQuestionChipBackgroundColor: "#FFFFFF",
  suggestedQuestionChipTextColor: "#EA580C",
  suggestedQuestionChipBorderColor: "#EA580C",
};

const warmOrangeDarkColors: ThemeColors = {
  primaryColor: "#FB923C",
  headerTextColor: "#FEF7ED",
  bubbleBotBackgroundColor: "#431407",
  bubbleUserBackgroundColor: "#FB923C",
  chatWindowBackgroundColor: "#1C1917",
  inputBackgroundColor: "#292524",
  inputTextColor: "#FEF7ED",
  sidebarBackgroundColor: "#1C1917",
  sidebarTextColor: "#E7E5E4",
  inputAreaBackgroundColor: "#431407",
  bubbleUserTextColor: "#FFFFFF",
  bubbleBotTextColor: "#E7E5E4",
  suggestedQuestionChipBackgroundColor: "#292524",
  suggestedQuestionChipTextColor: "#FB923C",
  suggestedQuestionChipBorderColor: "#FB923C",
};

export const predefinedThemes: PredefinedTheme[] = [
  {
    id: "default_syllabi_theme",
    name: "Syllabi Default",
    config: {
      themeId: "default_syllabi_theme",
      fontFamily: "var(--font-sans)",
      aiMessageAvatarUrl: null,
      userMessageAvatarUrl: null,
      light: defaultLightColors,
      dark: defaultDarkColors,
    },
  },
  {
    id: "professional_blue_theme",
    name: "Professional Blue",
    config: {
      themeId: "professional_blue_theme",
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      aiMessageAvatarUrl: null,
      userMessageAvatarUrl: null,
      light: professionalBlueLightColors,
      dark: professionalBlueDarkColors,
    },
  },
  {
    id: "modern_dark_theme",
    name: "Modern Dark",
    config: {
      themeId: "modern_dark_theme",
      fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
      aiMessageAvatarUrl: null,
      userMessageAvatarUrl: null,
      light: modernDarkLightColors,
      dark: modernDarkDarkColors,
    },
  },
  {
    id: "warm_orange_theme",
    name: "Warm Orange",
    config: {
      themeId: "warm_orange_theme",
      fontFamily: "'Nunito', 'Open Sans', sans-serif",
      aiMessageAvatarUrl: null,
      userMessageAvatarUrl: null,
      light: warmOrangeLightColors,
      dark: warmOrangeDarkColors,
    },
  },
  // Add more themes as needed, each with light and dark color configs
]; 