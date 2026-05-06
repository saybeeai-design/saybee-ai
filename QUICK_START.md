# 🚀 Quick Start Guide - Premium Chat Workspace

**For Developers**: Quick reference to understand and extend the premium chat system.

---

## 📁 Where Everything Lives

### Frontend
```
frontend/
├── src/
│   ├── app/dashboard/chat/
│   │   └── page.tsx (Route entry point)
│   │
│   ├── components/dashboard/
│   │   ├── PremiumChatWorkspace.tsx (Main component - 800+ lines)
│   │   └── ChatWorkspace.tsx (Legacy - can be deprecated)
│   │
│   └── lib/
│       └── voiceFileUtils.ts (Voice & file utilities - 140+ lines)
```

### Backend
```
backend/src/
├── routes/
│   └── aiRoutes.ts (Updated with /api/ai/upload route)
│
└── controllers/
    └── aiController.ts (Added uploadChatFile() function)
```

---

## 🎯 Component Architecture

### Main Component: PremiumChatWorkspace.tsx

```typescript
PremiumChatWorkspace
├── State Management
│   ├── Chat State: messages, input, currentMode
│   ├── UI State: sidebarOpen, showScrollButton
│   ├── Session State: sessions, currentSessionId
│   ├── Voice State: isRecording
│   └── File State: uploadedFiles, uploadProgress
│
├── Sub-Components
│   ├── ModeSelector (tabs for 4 modes)
│   ├── EmptyState (with suggested prompts)
│   ├── MessageBubble (individual messages)
│   ├── ThinkingIndicator (streaming animation)
│   └── RecentChatsSidebar (collapsible history)
│
├── Handlers
│   ├── handleSend()
│   ├── handleModeChange()
│   ├── handleStartVoiceRecord()
│   ├── handleStopVoiceRecord()
│   ├── handleFileSelect()
│   └── handleCopy()
│
└── Effects
    ├── Load sessions from localStorage
    ├── Save sessions on change
    ├── Handle cleanup on unmount
    └── Manage scroll behavior
```

---

## 💡 Key Concepts

### 1. AI Modes
```typescript
type AIMode = 'general' | 'interview' | 'resume' | 'career';

const AI_MODES = {
  general: { 
    label: 'General Chat',
    description: 'Talk about anything career-related',
    color: 'from-blue-500 to-cyan-500'
  },
  // ... more modes
}

// Each mode has:
// - Label & description
// - Color gradient
// - Icon
// - Suggested prompts array
```

### 2. Chat Sessions
```typescript
interface ChatSession {
  id: string;              // Unique identifier
  title: string;           // First message (max 50 chars)
  mode: AIMode;           // Which mode created this
  createdAt: number;      // Timestamp
  messages: Message[];    // Full conversation
}

// Stored in: localStorage['saybeeai-chat-sessions']
// Format: JSON stringified array
// Max sessions: 50
```

### 3. Streaming Messages
```typescript
// Token-based streaming with variable delay:
tokenizeForStreaming(text)     // Split into tokens
  → getBatchSize(count)         // Determine batch size
  → getStreamDelay(lastToken)   // Delay based on punctuation
  → setMessages() in loop       // Update message with tokens
```

### 4. Voice Recording
```typescript
// Flow:
handleStartVoiceRecord()
  → new VoiceRecorder()
  → startRecording()
  → microphone permission popup
  → await handleStopVoiceRecord()
  → transcribeAudio(blob)
  → setInput() with transcript
```

### 5. File Upload
```typescript
// Flow:
handleFileSelect(event)
  → validate file type/size
  → uploadFile(file, progressCallback)
  → xhr progress tracking
  → POST /api/ai/upload
  → add to uploadedFiles array
  → include in message context
```

---

## 🔌 API Endpoints

### Used Endpoints

#### 1. POST /api/chat
```bash
Request:
{
  "message": "You are SayBee AI...\n\nUser: How do I practice?\nAssistant:"
}

Response:
{
  "success": true,
  "data": { "message": "Here's how to practice..." },
  // OR
  "reply": "Here's how to practice..."
}

Usage:
- Send conversation with full context
- Mode-specific prompt in buildPrompt()
- Returns AI response text
```

#### 2. POST /api/ai/transcribe
```bash
Request:
FormData {
  "audio": Blob (webm format)
}

Response:
{
  "transcript": "what you said",
  // OR
  "text": "what you said"
}

Usage:
- Send recorded audio blob
- Returns transcribed text
- Used by voice feature
```

#### 3. POST /api/ai/upload (NEW)
```bash
Request:
FormData {
  "file": File (PDF/DOC/DOCX/TXT)
}

Response:
{
  "success": true,
  "fileUrl": "https://...",
  "fileId": "filename.pdf",
  "fileName": "filename.pdf",
  "fileSize": 1024000
}

Usage:
- Send file for upload
- Returns cloud storage URL
- Used by file upload feature
```

---

## 📊 State Flow Diagram

```
User Input
    ↓
┌─────────────────┐
│  Text/Voice/File│
└────────┬────────┘
         ↓
   ┌──────────┐
   │ Validate │
   └────┬─────┘
        ↓
   ┌─────────────────┐
   │ Create Message  │
   │ Update Sessions │
   │ Update UI State │
   └────────┬────────┘
            ↓
    ┌───────────────┐
    │ requestState  │
    │   = thinking  │
    └───────┬───────┘
            ↓
    ┌─────────────────┐
    │ POST /api/chat  │
    │ with context    │
    └────────┬────────┘
             ↓
    ┌──────────────────┐
    │ requestState     │
    │  = streaming     │
    │ streamMessages() │
    └────────┬─────────┘
             ↓
    ┌───────────────┐
    │ Add to session│
    │ requestState =│
    │      idle     │
    └───────────────┘
```

---

## 🎨 Styling Reference

### Color Palette
```typescript
// Backgrounds
const BG_DARK = '#0a0a0f';      // Main background
const BG_ELEVATED = '#111827';  // Elevated surfaces
const BG_HOVER = '#1a1f2e';     // Hover states

// Borders & Accents
const BORDER = '#1F2937';       // Primary border
const BORDER_FOCUS = '#374151'; // Focused border

// Text
const TEXT_PRIMARY = '#E5E7EB';    // Main text
const TEXT_SECONDARY = '#9CA3AF';  // Secondary text
const TEXT_TERTIARY = '#6B7280';   // Tertiary text

// Gradients
const GRADIENT_PRIMARY = 'from-blue-600 to-blue-500';
const GRADIENT_INTERVIEW = 'from-purple-500 to-pink-500';
const GRADIENT_RESUME = 'from-emerald-500 to-teal-500';
const GRADIENT_CAREER = 'from-amber-500 to-orange-500';
```

### Typography
```
Headings: text-lg font-semibold
Labels: text-sm font-medium
Body: text-[15px] leading-7
Small: text-xs / text-[10px]
```

### Spacing
- Padding: px-6, py-4, p-3, p-2
- Gap: gap-3, gap-2, gap-1
- Border radius: rounded-2xl, rounded-lg, rounded-xl
- Shadows: shadow-[0_20px_50px_-36px_rgba(0,0,0,0.82)]

---

## 🧪 Testing Common Scenarios

### Test Mode Switching
```typescript
// Click mode tab → new session created
// Previous session saved in sidebar
// Suggested prompts change for new mode
// Message history cleared
```

### Test Voice Input
```typescript
// Click mic → browser asks permission
// Speak into microphone
// Click mic again → transcription happens
// Text appears in input
// Can edit before sending
```

### Test File Upload
```typescript
// Click file icon → file picker opens
// Select PDF/DOC/DOCX/TXT
// Progress bar shows upload
// File tag shows above input
// Can remove before sending
// Can attach to message
```

### Test Session Recovery
```typescript
// Create chat with messages
// Close browser / refresh page
// Sidebar shows previous chat
// Click to restore
// All messages back
```

### Test Streaming
```typescript
// Send message
// Watch response stream in word-by-word
// Variable delays based on punctuation
// Auto-scroll follows along
// Smooth animation throughout
```

---

## 🔍 Debugging Tips

### Common Issues & Solutions

#### Voice not working
```
Check:
- Microphone permission granted
- Browser supports MediaRecorder
- Audio API endpoints responding
- Console for error messages
```

#### File upload fails
```
Check:
- File size < 10MB
- File type supported (PDF/DOC/TXT)
- Network connection active
- /api/ai/upload endpoint working
- Cloud storage credentials valid
```

#### Messages not streaming
```
Check:
- requestState transitions correctly
- Token streaming loop running
- setTimeout not blocked
- Component not unmounted early
```

#### Sidebar not appearing
```
Check:
- sidebarOpen state toggling
- Sidebar z-index (z-40)
- Overlay z-index (z-30)
- Animation playing
```

---

## 🚀 Extending the System

### Add a New AI Mode

```typescript
// 1. Update type
type AIMode = 'general' | 'interview' | 'resume' | 'career' | 'yourmode';

// 2. Add to AI_MODES
const AI_MODES = {
  yourmode: {
    label: 'Your Mode',
    icon: IconComponent,
    description: 'Your description',
    color: 'from-color-500 to-color-500'
  }
}

// 3. Add prompts
const SUGGESTED_PROMPTS: Record<AIMode, string[]> = {
  yourmode: [
    'Prompt 1',
    'Prompt 2',
    'Prompt 3'
  ]
}

// 4. Update buildPrompt()
const modeContext: Record<AIMode, string> = {
  yourmode: 'Your system prompt...'
}
```

### Add New Input Method

```typescript
// 1. Add UI button
<button onClick={handleYourInput}>
  <YourIcon />
</button>

// 2. Create handler
const handleYourInput = async () => {
  try {
    const content = await getContentSomehow();
    setInput(prev => prev + content);
  } catch (error) {
    toast.error('Error');
  }
}

// 3. Test & integrate
```

### Add New Message Action

```typescript
// On MessageBubble component:
<button
  onClick={() => handleYourAction(message)}
  className="... group-hover:opacity-100"
>
  <YourIcon />
</button>

// Add handler to PremiumChatWorkspace
const handleYourAction = (message: Message) => {
  // Implementation
}
```

---

## 📚 File Reading Guide

### If you need to understand...

**How messages stream naturally?**
→ `streamAssistantMessage()` function in PremiumChatWorkspace.tsx

**How voice recording works?**
→ `VoiceRecorder` class in voiceFileUtils.ts

**How files are uploaded?**
→ `handleFileSelect()` and `uploadFile()` in PremiumChatWorkspace.tsx & voiceFileUtils.ts

**How sessions are managed?**
→ localStorage effects and `handleSelectSession()` in PremiumChatWorkspace.tsx

**How modes work?**
→ `AI_MODES` constant and `buildPrompt()` function

**How UI animates?**
→ Framer Motion `motion.*` components and `animate` props throughout

---

## 🎯 Quick Command Reference

### Development
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Type check
npm run type-check

# Lint code
npm run lint
```

### Testing
```bash
# Manual testing checklist in IMPLEMENTATION_CHECKLIST.md
# Run through each feature

# Test voice
1. Click mic
2. Grant permission
3. Speak
4. Click mic again
5. Verify transcript appears

# Test files
1. Click file icon
2. Upload PDF/DOC
3. Watch progress
4. Send message
```

---

## 📞 Quick Reference Links

**Documentation**
- [User Guide](./PREMIUM_CHAT_GUIDE.md)
- [Implementation Checklist](./IMPLEMENTATION_CHECKLIST.md)
- [Executive Summary](./EXECUTIVE_SUMMARY.md)

**Files**
- [Main Component](./frontend/src/components/dashboard/PremiumChatWorkspace.tsx)
- [Utilities](./frontend/src/lib/voiceFileUtils.ts)
- [Backend Route](./backend/src/routes/aiRoutes.ts)
- [Backend Controller](./backend/src/controllers/aiController.ts)

---

**Last Updated**: May 2024
**Version**: 1.0
**Status**: Production Ready ✅
