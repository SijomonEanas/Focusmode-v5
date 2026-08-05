# Changelog - Focus Mode v5.0

All notable changes and feature additions to Focus Mode v5.0 are documented below.

## [v5.0.1] - 2026-08-05

### 🚀 New Features & Enhancements
- **Scheduled Tasks View (`📅 Scheduled (All Days)`)**: Added a dedicated workspace filter pill to view all scheduled tasks across any day of the week (e.g., Sunday tasks) without needing to wait for that day.
- **Calendar Day Inspector Editing (`✏️ Edit Task`)**: Added direct edit buttons to task items inside the calendar day inspector window to quickly modify scheduled task details.
- **Task Accomplishment Reflection Modal (`#completion-modal`)**: Added a post-task completion prompt asking *"What did you learn / accomplish?"* with textarea input for reflections.
- **Screenshot & Image Proof Attachment**:
  - Attached image files via file chooser dialog (`📷 Upload Image / Screenshot`).
  - **Clipboard Paste Support**: Direct `Ctrl + V` pasting of screenshots directly into the reflection modal.
- **Fullscreen Image Viewer Lightbox (`#image-viewer-modal`)**: Added interactive thumbnail previews on completed tasks with click-to-enlarge full-screen lightbox viewing.

### 🐛 Bug Fixes
- **Syntax Error Fix**: Resolved stray block in `completeTask` function in `src/app.js` that was freezing UI event listeners.
- **Build Cleanup**: Consolidated build output folders into a single clean `dist` folder (`dist/FocusMode-v5-win32-x64/FocusMode-v5.exe`).
