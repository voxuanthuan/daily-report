# Jira Ticket Status Management UX Design

## 🎯 Core User Experience Flows

### **Flow 1: Start Working on a Ticket**
```
1. User: Ctrl+Shift+P → "Jira: Start Working"
2. System: Shows tickets with status "Selected for Development"
3. User: Selects ticket (e.g., B2B-1079)
4. System: 
   - Changes status to "In Progress"
   - Starts time tracking (optional)
   - Shows in status bar: [🔵 B2B-1079: In Progress]
   - Offers to log initial time entry
```

### **Flow 2: Submit for Review**
```
1. User: Ctrl+Shift+P → "Jira: Submit for Review"
2. System: Shows "In Progress" tickets
3. User: Selects ticket
4. System: 
   - Prompts for time to log (if any)
   - Changes status to "Under Review"
   - Logs final time entry
   - Updates status bar
```

### **Flow 3: Integrated Quick Actions**
```
1. User: Ctrl+Shift+P → "Jira: Quick Actions"
2. System: Shows personalized dashboard:

   ┌─────────────────────────────────────────┐
   │  🎯 Jira Quick Actions                  │
   ├─────────────────────────────────────────┤
   │  📋 Your Active Tickets:                │
   │                                         │
   │  🔵 B2B-1079: Fix login bug             │
   │     Status: Selected for Development    │
   │     ⚡ Start Working                    │
   │     ⏱️ Log Time Only                   │
   │                                         │
   │  🟡 PROJ-123: Add new feature           │
   │     Status: In Progress (⏱️ 2h today)   │
   │     📤 Submit for Review                │
   │     ⏱️ Log More Time                   │
   │     ⏸️ Pause Work                      │
   │                                         │
   │  🟠 TASK-456: Documentation             │
   │     Status: Under Review                │
   │     ✅ Mark Complete                    │
   │                                         │
   │  ➕ Browse More Tickets                 │
   │  📊 View Time Summary                   │
   └─────────────────────────────────────────┘
```

## 🎨 Visual Design Elements

### **Status Icons & Colors**
- 🔵 **Selected for Development** - Blue circle
- 🟡 **In Progress** - Yellow circle  
- 🟠 **Under Review** - Orange circle
- 🟢 **Done** - Green circle
- ⏱️ **Time tracking active** - Clock icon
- ⚡ **Quick action** - Lightning bolt

### **Status Bar Integration**
```
┌─────────────────────────────────────────────────────────────┐
│ [🔵 B2B-1079: In Progress] [⏱️ 2h 30m today] [Actions ▼]   │
└─────────────────────────────────────────────────────────────┘
```

**Status Bar Menu:**
- ⏱️ Log Time
- 📤 Submit for Review  
- ⏸️ Pause Work
- 🔄 Change Status
- 📋 View Details

## 🚀 Command Structure

### **Main Commands**
1. **`Jira: Quick Actions`** - Main dashboard
2. **`Jira: Start Working`** - Begin work on ticket
3. **`Jira: Submit for Review`** - Move to review
4. **`Jira: Log Time`** - Time entry only
5. **`Jira: Change Status`** - Manual status change

### **Smart Context Commands**
- If no active ticket: Show "Start Working" options
- If ticket in progress: Show "Submit for Review" + "Log Time"
- If ticket under review: Show "Mark Complete"

## 💫 Advanced UX Features

### **1. Smart Suggestions**
```
System learns your patterns:
- "You usually work on B2B tickets on Mondays"
- "Ready to submit PROJ-123? You've logged 6h today"
- "Don't forget to log time for yesterday's work"
```

### **2. Time Tracking Integration**
```
When starting work:
┌─────────────────────────────────┐
│ Started working on B2B-1079     │
│                                 │
│ □ Start time tracking          │
│ □ Log initial time entry       │
│                                 │
│ [Continue] [Configure]          │
└─────────────────────────────────┘
```

### **3. Batch Operations**
```
End of day workflow:
┌─────────────────────────────────┐
│ 🕐 End of Day Summary           │
│                                 │
│ ✅ B2B-1079: 3h 30m logged     │
│ ⚠️ PROJ-123: No time logged    │
│                                 │
│ [Log Missing Time] [Submit All] │
└─────────────────────────────────┘
```

## 🎛️ Configuration Options

### **Settings**
```json
{
  "jiraDailyReport.autoStartTimeTracking": true,
  "jiraDailyReport.showStatusInStatusBar": true,
  "jiraDailyReport.defaultStatusTransitions": {
    "Selected for Development": "In Progress",
    "In Progress": "Under Review",
    "Under Review": "Done"
  },
  "jiraDailyReport.promptForTimeOnStatusChange": true,
  "jiraDailyReport.autoSubmitAfterHours": 8
}
```

## 🔄 Workflow Examples

### **Developer's Daily Workflow**
```
Morning:
1. Open VS Code
2. Ctrl+Shift+P → "Jira: Quick Actions"
3. Click "⚡ Start Working" on B2B-1079
4. Status changes to "In Progress"
5. Time tracking starts

During work:
- Status bar shows: [🔵 B2B-1079: In Progress] [⏱️ 2h 30m]
- Periodic prompts: "Log progress? (1h 30m since last log)"

End of task:
1. Ctrl+Shift+P → "Jira: Submit for Review"
2. System prompts: "Log final time entry?"
3. Enter time, add comment
4. Status changes to "Under Review"
```

### **QA/Review Workflow**
```
1. "Jira: Quick Actions" shows tickets "Under Review"
2. Select ticket for testing
3. After testing: Quick action "✅ Mark Complete" or "❌ Reject"
4. Automatic status transition + time logging
```

## 📱 Mobile-First Thinking for VS Code

Since VS Code is often used in split-screen or small windows:

### **Compact Views**
```
Minimal mode:
┌─────────────────────┐
│ 🔵 B2B-1079 [▼]     │
│ ⚡ Start  ⏱️ Log   │
└─────────────────────┘

Expanded mode:
┌─────────────────────────────────┐
│ 🔵 B2B-1079: Fix login bug      │
│ Status: Selected for Development │
│ ⚡ Start Working  ⏱️ Log Time   │
└─────────────────────────────────┘
```

## 🎯 Success Metrics

**Good UX achieves:**
- ⚡ 2-click status changes
- 🎯 Zero context switching to Jira web
- ⏱️ Automatic time tracking suggestions
- 📋 Clear visual feedback
- 🔄 Seamless workflow integration

This design prioritizes:
1. **Speed** - Minimal clicks to common actions
2. **Context** - Shows relevant information at the right time
3. **Integration** - Works with existing time logging
4. **Discoverability** - Clear visual cues and smart suggestions
5. **Flexibility** - Works for different workflow styles