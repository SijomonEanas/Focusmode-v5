import sys
import re

js_path = r"E:\New project AI\FocusMode-v3\src\app.js"
with open(js_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """    if (appState.settings.lastActiveDate !== focusDateStr) {
      const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const lastDateObj = new Date(appState.settings.lastActiveDate || new Date().toDateString());
      const lastWeekday = weekdays[lastDateObj.getDay()];
      
      const activeTasksYesterday = appState.tasks.filter(t => {
        return (t.plannerDay === lastWeekday) && isTaskActiveOnDate(t, lastDateObj);
      });

      const totalTasksToday = activeTasksYesterday.length;
      const completedTasksToday = activeTasksYesterday.filter(t => t.completed).length;
      
      appState.history.push({
        date: appState.settings.lastActiveDate || new Date().toDateString(),
        focusSeconds: appState.focusTimeToday,
        distractions: appState.distractionsCount,
        completedTasks: completedTasksToday,
        totalTasks: totalTasksToday
      });
      
        // Update streaks and reset habits
        appState.habits.forEach(h => {
          if (h.completed) h.streak++;
          else h.streak = 0;
          h.completed = false;
        });
        
        // Restart tasks by day base
        appState.tasks.forEach(t => {
          t.completed = false;
          t.currentQty = 0;
          t.currentDuration = 0;
          if (t.subtasks) {
            t.subtasks.forEach(st => st.completed = false);
          }
        });
        
        appState.focusTimeToday = 0;
      appState.distractionsCount = 0;
      appState.settings.lastActiveDate = focusDateStr;
      
      saveAppState();
    }"""

replacement = """    if (appState.settings.lastActiveDate !== focusDateStr) {
      performDayRollover(appState.settings.lastActiveDate, focusDateStr);
    }
    
    // Setup interval to check for day rollover while the app is running
    setInterval(() => {
      const currentFocusDateStr = getFocusDateString(appState.settings.dayResetHour);
      if (appState.settings.lastActiveDate && appState.settings.lastActiveDate !== currentFocusDateStr) {
        performDayRollover(appState.settings.lastActiveDate, currentFocusDateStr);
        renderTasks();
        renderStats();
        renderSelectedDayTasks();
      }
    }, 60000);"""

content = content.replace(target, replacement)

new_func = """
function performDayRollover(oldDateStr, newDateStr) {
  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const lastDateObj = new Date(oldDateStr || new Date().toDateString());
  const lastWeekday = weekdays[lastDateObj.getDay()];
  
  const activeTasksYesterday = appState.tasks.filter(t => {
    return (t.plannerDay === lastWeekday) && isTaskActiveOnDate(t, lastDateObj);
  });

  const totalTasksToday = activeTasksYesterday.length;
  const completedTasksToday = activeTasksYesterday.filter(t => t.completed).length;
  
  appState.history.push({
    date: oldDateStr || new Date().toDateString(),
    focusSeconds: appState.focusTimeToday,
    distractions: appState.distractionsCount,
    completedTasks: completedTasksToday,
    totalTasks: totalTasksToday
  });
  
  // Update streaks and reset habits
  appState.habits.forEach(h => {
    if (h.completed) h.streak++;
    else h.streak = 0;
    h.completed = false;
  });
  
  // Restart tasks by day base
  appState.tasks.forEach(t => {
    t.completed = false;
    t.currentQty = 0;
    t.currentDuration = 0;
    if (t.subtasks) {
      t.subtasks.forEach(st => st.completed = false);
    }
  });
  
  appState.focusTimeToday = 0;
  appState.distractionsCount = 0;
  appState.settings.lastActiveDate = newDateStr;
  
  saveAppState();
  logActivity('system', `Day rolled over from ${oldDateStr} to ${newDateStr}`);
}
"""
content = content.replace("// --- Theming Engine ---", new_func + "\n// --- Theming Engine ---")

with open(js_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Refactored day rollover into background interval!")
