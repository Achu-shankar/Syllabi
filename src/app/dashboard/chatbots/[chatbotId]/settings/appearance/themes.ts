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

export const predefinedThemes: PredefinedTheme[] = [
  {
    id: "default_syllabi_theme",
    name: "Syllabi Default",
    config: {
      fontFamily: "var(--font-sans)",
      aiMessageAvatarUrl: "/placeholder-ai-avatar.png",
      userMessageAvatarUrl: "/placeholder-user-avatar.png",
      light: defaultLightColors,
      dark: defaultDarkColors,
    },
  },
  {
    id: "professional_blue_theme",
    name: "Professional Blue",
    config: {
      fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      aiMessageAvatarUrl: "/placeholder-ai-avatar-prof.png",
      userMessageAvatarUrl: "/placeholder-user-avatar-prof.png",
      light: professionalBlueLightColors,
      dark: professionalBlueDarkColors,
    },
  },
  // Add more themes as needed, each with light and dark color configs
]; 