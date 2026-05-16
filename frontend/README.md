# AgentOS — AI Chat Interface

A premium, production-grade AI chat interface built with **React** and **Vite**. AgentOS features a cinematic "Cold & Precise" aesthetic, designed for maximum focus and visual excellence.

## ✨ Features

### 🌌 Main Chat Area
- **Empty State**: Centered welcome screen with animated branding and suggested prompt cards.
- **Message Thread**: Fluid scrollable conversation view with distinct user/assistant styles.
- **Rich Rendering**: Full Markdown support including syntax-highlighted code blocks, lists, and bold text.
- **Streaming Interaction**: Character-by-character response streaming with a blinking cursor.
- **Message Actions**: Hover-revealed actions for "Copy", "Regenerate", and "Feedback" (Thumbs up/down).

### 🛠️ Sidebar (Collapsible)
- **Fluid Navigation**: Collapsible sidebar that shrinks to a slim icon-only toolbar.
- **History Management**: Grouped conversation history (Today, Yesterday, Last 7 Days, Older).
- **Contextual Actions**: Inline renaming, archiving, and deletion with smooth animations.
- **Feature Hub**: Slide-in "More" panel for Artifacts, Workflows, MCP Servers, and Plugins.

### ⌨️ Advanced Input Bar
- **Dynamic Textarea**: Auto-expanding multi-line input bar.
- **Toolbox**: Popover for selectable tools (Web Search, Image Gen, Code Interpreter).
- **Voice & Media**: Integrated file attachment system and pulsing voice recording state.
- **Smart UI**: Context-aware Send/Stop button (switches during streaming).

## 🎨 Design System
- **Aesthetic**: Dark Cinematic · Cold & Precise.
- **Typography**: Space Grotesk (Display) & JetBrains Mono (Code).
- **Styling**: Vanilla CSS Modules for encapsulated, high-performance styling.
- **Tokens**: Fully variable-driven theming (colors, spacing, radius, shadows).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm / yarn

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## 🏗️ Architecture
The project follows a modular, component-based structure:
- `Sidebar`: Navigation and history.
- `ChatWindow`: Main thread and welcome logic.
- `MessageBubble`: Content rendering and actions.
- `InputBar`: Core interaction surface.
- `ContextMenu`: Popover logic for list items.
- `ToolsPicker`: Feature toggles.

## 🛠️ Tech Stack
- **Framework**: React 19
- **Bundler**: Vite 8
- **Icons**: Lucide React
- **Fonts**: @fontsource (Space Grotesk, JetBrains Mono)
- **Styling**: CSS Modules
