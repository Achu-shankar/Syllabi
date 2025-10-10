Design System Codex: Monochrome & Iris
Version: 1.2
Objective: This document serves as the strict and complete design specification for the Syllabi application UI. It is intended to be used as a reference guide by an LLM developer to ensure all generated components and layouts are visually consistent and adhere to the established "Monochrome & Iris" design philosophy.

---

### **1. Core Philosophy: "Deliberate Contrast"**
The UI is built on a professional, minimalist, and predominantly monochrome (grayscale) foundation. This creates a focused and uncluttered workspace. Color is reserved as a high-impact tool, applied exclusively to interactive states and key accents to represent the energy and intelligence of the AI. The primary accent is a vibrant, multi-color "Iris" gradient.

---

### **2. Color System**
All colors are defined as HSL CSS variables in globals.css.

#### **2.1. Monochrome Foundation Palette**
| Variable | Light Mode (HSL) | Dark Mode (HSL) | Tailwind Utility | Description |
| :--- | :--- | :--- | :--- | :--- |
| `--background` | `0 0% 97%` | `0 0% 7%` | `bg-background` | Main page background. |
| `--foreground` | `0 0% 7%` | `0 0% 92%` | `text-foreground` | Default text color. |
| `--card` | `0 0% 100%` | `0 0% 11%` | `bg-card` | Background for cards, modals, inputs. |
| `--card-foreground` | `0 0% 7%` | `0 0% 92%` | `text-card-foreground`| Text inside cards. |
| `--primary` | `0 0% 13%` | `0 0% 98%` | `bg-primary` | Primary button background. |
| `--primary-foreground`| `0 0% 98%` | `0 0% 7%` | `text-primary-foreground`| Text on primary buttons. |
| `--secondary` | `0 0% 92%` | `0 0% 18%` | `bg-secondary` | Secondary button/hover backgrounds. |
| `--secondary-foreground`| `0 0% 20%` | `0 0% 92%` | `text-secondary-foreground`| Text on secondary elements. |
| `--muted-foreground`| `0 0% 40%` | `0 0% 53%` | `text-muted-foreground`| Muted text (metadata, captions). |
| `--border` | `0 0% 87%` | `0 0% 18%` | `border-border` | Standard borders. |
| `--destructive` | `0 84% 60%` | `0 63% 31%` | `bg-destructive` | Background for destructive actions. |
| `--success` | `145 60% 45%` | `145 60% 35%` | `bg-success` | Success feedback (green). |
| `--info` | `208 90% 48%` | `208 90% 60%` | `bg-info` | Informational feedback (blue). |

#### **2.2. The "Iris" Gradient Accent**
The Iris gradient is the sole multi-color element. It must not be used for static backgrounds or text.
*   **Definition:** `linear-gradient(to right, #C026D3, #7C3AED, #0891B2)`
*   **Usage:** Applied via custom components or utilities. See Section 7.

---

### **3. Typography System**
*   **Font Family:** `Inter`, referenced as `var(--font-inter)`.
*   **Scale:**
| Element/Use Case | Font Size | Font Weight | Tailwind Classes |
| :--- | :--- | :--- | :--- |
| Page Title (`h1`) | 32px | 700 (Bold) | `text-3xl font-bold` |
| Section Title (`h2`)| 24px | 600 (Semibold)| `text-2xl font-semibold` |
| Card Title (`h3`) | 20px | 500 (Medium) | `text-xl font-medium` |
| Body Text (`p`) | 16px | 400 (Regular) | `text-base font-normal` |
| Subtle Text | 14px | 400 (Regular) | `text-sm font-normal` |
| Button Text | 14px | 500 (Medium) | `text-sm font-medium` |

---

### **4. Spacing, Shape & Shadow**
*   **Base Unit:** 8px (`p-2`, `m-4`, `gap-8`).
*   **Radius:** `--radius` is `0.75rem` (12px).
    *   Large containers (Cards, Modals): `rounded-lg` (12px).
    *   Buttons, Inputs, Badges: `rounded-md` (8px).
*   **Shadows:** Cards use a subtle `box-shadow: 0 2px 8px hsl(0 0% 0% / 0.07);`.

---

### **5. Iconography System**
*   **Library:** Lucide React (`lucide-react`).
*   **Default Size:** 20px for primary icons, 16px for secondary/inline icons.
*   **Usage:** Icons should be paired with text with a `gap-2` (`8px`).

---

### **6. Accent Effects & Interaction (NEW)**
This section defines the approved techniques for applying "Iris" effects.

*   **Principle:** Accents are reserved for interactive states or key status indicators.
*   **Technique 1: `RainbowButton` + `GlowEffect` (Primary Actions)**
    *   **Use Case:** The single most important CTA on a page.
    *   **Implementation:** A `<RainbowButton>` wrapped in a hover-activated `<GlowEffect>`.
*   **Technique 2: `FieldsetBlock` Accent Rail (NEW)**
    *   **Use Case:** To group related form controls without nested cards.
    *   **Implementation:** A 2px vertical Iris gradient bar on the left of each `<FieldsetBlock>`.
*   **Technique 3: Gradient Underline (Active Tabs)**
    *   **Use Case:** To indicate the active tab in a navigation bar.
    *   **Implementation:** A 2px Iris gradient underline animates in under the active tab's text.
*   **Technique 4: Gradient Border (Input Focus)**
    *   **Use Case:** To indicate an active `Input` or `Textarea`.
    *   **Implementation:** On focus, the border transitions to the Iris Gradient.

---

### **7. Component Rules (UPDATED)**

*   **Primary Button:**
    *   **Style:** Replaced with the `<RainbowButton>` component.
    *   **Interaction:** On hover, must be accompanied by the `<GlowEffect>`.
*   **`FieldsetBlock` (NEW):**
    *   A container for a group of related form elements, with a title, optional icon, and the Iris accent rail. Replaces the "card-inside-a-card" pattern.
*   **Helper Text & Tooltips (NEW):**
    *   Static helper text below form fields is discouraged. Use a `<Tooltip>` triggered by a `<HelpCircle>` icon next to the `Label` to provide help on demand.

---

### **8. The Golden Rules of "Iris"**
The Iris Gradient is the most powerful visual element and must be used with discipline.

**DO use the Iris Gradient for:**
*   Hover/focus states of primary interactive elements.
*   The active state of a key component (e.g., active tab underline, `FieldsetBlock` rail).
*   Loading indicators.

**DO NOT use the Iris Gradient for:**
*   Static text or logo colors.
*   Default backgrounds.
*   Borders of non-interactive elements.
*   Secondary or Ghost button hover effects.

This codex is the definitive guide. All generated UI must strictly adhere to these specifications.