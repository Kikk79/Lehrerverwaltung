# CLAUDE.md - Teacher Course Assignment Application 🧠

## Project Overview 📖
This is an **Electron-based desktop application** that uses **AI-powered algorithms** to assign teachers to courses based on exact skill matching and creates an **interactive calendar** for managing and visualizing assignments.

### Core Functionality
- **Teacher Management**: Add/edit teachers with skills and availability
- **Course Management**: Create courses with specific skill requirements
- **AI-Powered Assignment**: Use Anthropic Claude API for optimal teacher-course distribution
- **Interactive Calendar**: Outlook-like calendar with drag-drop, filtering, and multiple views
- **Data Import/Export**: CSV import with AI interpretation, iCal/CSV export
- **Local Storage**: All data stored locally in SQLite database

---

## Technology Stack 🛠️

### Core Technologies
- **Desktop Framework**: Electron (cross-platform desktop app)
- **Frontend**: React.js + TypeScript
- **Database**: SQLite with better-sqlite3
- **Calendar**: FullCalendar v6 (MIT core + commercial scheduler)
- **AI Integration**: Anthropic Claude API
- **Styling**: Tailwind CSS
- **Build Tool**: electron-builder
- **Testing**: Jest + Playwright

### Key Dependencies
```json
{
  "electron": "Latest stable",
  "react": "^18.x",
  "typescript": "^5.x",
  "better-sqlite3": "^9.x",
  "@fullcalendar/react": "^6.x",
  "@anthropic-ai/sdk": "Latest",
  "tailwindcss": "^3.x"
}
```

---

## Architecture Summary 🏗️

### Application Structure
```
src/
├── main/           # Electron main process
├── renderer/       # React UI components
├── shared/         # Common types and utilities
├── database/       # SQLite schemas and migrations
└── assets/         # Icons and resources
```

### Data Flow
1. **User Input** → React Components
2. **IPC Communication** → Electron Main Process
3. **Business Logic** → Service Classes (Assignment, AI, Database)
4. **Data Storage** → SQLite Database
5. **AI Enhancement** → Anthropic API calls
6. **UI Updates** → Calendar and Lists

### Core Services
- **DatabaseService**: SQLite operations and migrations
- **AssignmentService**: Teacher-course matching algorithms
- **AnthropicService**: AI API integration
- **CalendarService**: Event management and synchronization

---

## Key Requirements & Constraints 📋

### Critical Requirements
1. **Exact Skill Matching**: Teacher.skills must exactly match Course.topic (no speculation)
2. **Interactive Calendar**: Full Outlook-like functionality with drag-drop
3. **Local Installation**: Desktop app with installer, no web deployment
4. **AI Enhancement**: Use Anthropic API for workload balancing and conflict resolution
5. **CSV Processing**: AI-powered import with column mapping
6. **Cross-Platform**: Windows, macOS, Linux support

### Technical Constraints
- **No HTTPS/SSL**: Security features deferred to later phases
- **No Docker**: Local native installation only
- **Local Data Only**: All data stored locally in SQLite
- **Offline Capability**: App must work without internet (except AI features)

---

## Database Schema 🗃️

### Core Tables
```sql
-- Teachers with skills and availability
CREATE TABLE teachers (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    skills TEXT NOT NULL,        -- JSON array of skill strings
    working_times TEXT,          -- JSON object for availability
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Courses requiring specific skills
CREATE TABLE courses (
    id INTEGER PRIMARY KEY,
    topic TEXT NOT NULL,         -- Must match teacher skills exactly
    lessons_count INTEGER NOT NULL,
    lesson_duration INTEGER NOT NULL,  -- Minutes per lesson
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assignment relationships
CREATE TABLE assignments (
    id INTEGER PRIMARY KEY,
    teacher_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    scheduled_slots TEXT,        -- JSON array of time slots
    status TEXT DEFAULT 'active',
    ai_rationale TEXT,          -- AI explanation for assignment
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id),
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

-- Application settings
CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

---

## AI Integration Details 🤖

### Anthropic API Usage
The app integrates with Anthropic Claude API for:

1. **Workload Balancing**: Optimize teacher assignments for fair distribution
2. **Conflict Resolution**: Suggest alternatives when scheduling conflicts occur
3. **CSV Interpretation**: AI-powered column mapping for data imports
4. **Assignment Rationale**: Generate explanations for assignment decisions

### System Prompt Templates
```javascript
const ASSIGNMENT_PROMPT = `
You are an assignment optimization system for teachers and courses.
Given the following data:
- Teachers with exact skills: {teachers}
- Courses requiring skills: {courses}
- Current assignments: {assignments}

Optimize the assignment distribution considering:
1. Exact skill matching (required)
2. Fair workload distribution
3. Teacher availability
4. Course scheduling constraints

Respond with optimized assignments and rationale.
`;
```

### API Configuration
- **Model Selection**: Dropdown for Claude models (Haiku 3.5, Sonnet 4, Opus 4.1)
- **API Key Storage**: Encrypted local storage
- **System Prompt**: User-customizable prompts
- **Response Caching**: Local caching for performance

---

## Development Guidelines 📏

### Mandatory Practices
1. **🔄 Commit After Every Implementation**: Make a GitHub commit after completing any TODO item
2. **📝 Keep Documentation Updated**: Always update CHANGELOG.md and TODO.md after changes
3. **🧹 Refactor Documentation**: Clean up .md files when they become messy or outdated
4. **🚀 Use Agents for Parallel Work**: Leverage multiple agents for concurrent development

### Code Standards
- **TypeScript**: Strict mode enabled, full type coverage
- **React**: Functional components with hooks
- **Error Handling**: Comprehensive try-catch blocks and user feedback
- **Testing**: Unit tests for all algorithms and services
- **Documentation**: JSDoc comments for all public methods

### File Organization
```
TODO.md        # → Task tracking and progress
CHANGELOG.md   # → All code changes with references
CLAUDE.md      # → This file (project documentation)
README.md      # → User-facing documentation
```

---

## Assignment Algorithm Logic 🧮

### Core Algorithm Flow
1. **Skill Matching**: Find teachers with exact skill match for each course
2. **Availability Check**: Validate teacher working times against course schedule
3. **Conflict Detection**: Identify scheduling overlaps
4. **Hungarian Algorithm**: Optimal assignment considering all constraints
5. **AI Optimization**: Use Claude API to balance workloads and resolve conflicts
6. **Validation**: Final check for consistency and feasibility

### Key Rules
- **One Teacher Per Course**: Each course assigned to exactly one teacher
- **Multiple Courses Per Teacher**: Teachers can handle multiple courses
- **Exact Skill Match**: No partial or approximate matching allowed
- **Availability Respect**: Never assign outside teacher's working hours
- **Fairness Priority**: Distribute workload as evenly as possible

---

## Calendar Implementation 📅

### FullCalendar Configuration
- **Views**: Month, Week, Day, Agenda (list view)
- **Drag & Drop**: Real-time assignment rescheduling
- **Filtering**: By teacher, course, date range
- **Styling**: Outlook-like appearance with custom CSS
- **Events**: Dynamic loading from assignment data

### Calendar Features
- **Event Details**: Click to show course/teacher information
- **Color Coding**: Different colors for different teachers/subjects
- **Time Conflicts**: Visual indication of scheduling issues
- **Export Options**: iCal, CSV, PDF formats

---

## File Import/Export 📁

### CSV Import Process
1. **File Selection**: Native file picker dialog
2. **AI Analysis**: Claude API interprets CSV structure
3. **Column Mapping**: Automatic/manual mapping to data fields
4. **Validation**: Data type and constraint checking
5. **Preview**: Show import results before committing
6. **Batch Import**: Process with progress indication

### Export Capabilities
- **Calendar Export**: iCal format for external calendar apps
- **Assignment Export**: CSV with all assignment details
- **Teacher/Course Export**: Backup data in CSV format
- **PDF Reports**: Printable calendar views

---

## Testing Strategy 🧪

### Test Categories
1. **Unit Tests**: Algorithm logic, data models, utilities
2. **Integration Tests**: Database operations, IPC communication
3. **E2E Tests**: Complete user workflows
4. **AI Tests**: Mock API responses for consistent testing
5. **Cross-Platform Tests**: Windows, macOS, Linux compatibility

### Test Files Location
```
tests/
├── unit/           # Jest unit tests
├── integration/    # Database and IPC tests
├── e2e/           # Playwright end-to-end tests
└── mocks/         # Mock data and API responses
```

---

## Build & Distribution 📦

### Build Process
1. **Development**: npm run dev (hot reloading)
2. **Production Build**: npm run build
3. **Electron Packaging**: electron-builder
4. **Code Signing**: Windows/macOS certificates
5. **Installer Creation**: Platform-specific installers

### Distribution Targets
- **Windows**: .exe installer with auto-updater
- **macOS**: .dmg installer with notarization
- **Linux**: .AppImage and .deb packages

---

## File References 📚

### Essential Files
- **[TODO.md](./TODO.md)**: Complete task breakdown with parallel work opportunities
- **[CHANGELOG.md](./CHANGELOG.md)**: Detailed change history with git references
- **package.json**: Dependencies and scripts
- **electron-builder.json**: Build configuration

### Development Files
- **src/**: All source code
- **database/**: SQLite schemas and migrations
- **tests/**: All test files
- **docs/**: Additional documentation

---

## Quick Start for New Claude Instances 🚀

### Immediate Actions
1. **Read TODO.md**: Understand current progress and next tasks
2. **Check CHANGELOG.md**: See what's been implemented recently
3. **Review Database Schema**: Understand data relationships
4. **Identify Parallel Tasks**: Look for tasks that can be worked on simultaneously
5. **Use Agents Proactively**: Assign different agents to different modules

### Key Commands
```bash
npm install          # Install dependencies
npm run dev          # Start development mode
npm run build        # Build for production
npm run test         # Run all tests
npm run dist         # Create installers
```

### Agent Assignments (Recommended)
- **Agent 1**: Database layer and models
- **Agent 2**: Assignment algorithms
- **Agent 3**: React UI components
- **Agent 4**: AI integration and services
- **Agent 5**: Calendar implementation
- **Agent 6**: File import/export
- **Agent 7**: Testing and validation
- **Agent 8**: Build and distribution

---

## Important Notes ⚠️

### Critical Reminders
- **No Emojis in Code**: Only use emojis in markdown files, never in source code
- **Exact Skill Matching**: No AI speculation on skill compatibility
- **Local App Only**: No web deployment or Docker containers
- **Commit Everything**: Every completed TODO item gets a git commit
- **Update Documentation**: Keep TODO.md and CHANGELOG.md current

### Success Criteria
- ✅ Desktop app installs and runs on all platforms
- ✅ Teachers and courses can be managed via UI
- ✅ AI successfully assigns teachers to courses
- ✅ Calendar displays assignments with full interactivity
- ✅ CSV import/export works with AI assistance
- ✅ All data persists locally in SQLite

---

*Last Updated: 2025-08-30*
*Next Review: When major milestones are completed*