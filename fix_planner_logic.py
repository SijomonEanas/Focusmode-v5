import sys

js_path = r"E:\New project AI\FocusMode-v3\src\app.js"
with open(js_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """    if (scheduledTasks.length > 0) {
      const pendingTasks = [];
      const completedTasks = [];
      
      scheduledTasks.forEach(task => {
        const isCompleted = isFutureCell ? false : task.completed;
        if (isCompleted) {
          completedTasks.push(task);
        } else {
          pendingTasks.push(task);
        }
      });"""

replacement = """    if (scheduledTasks.length > 0) {
      const pendingTasks = [];
      const completedTasks = [];
      
      // Pre-compute completions for past dates using activityLog
      const isPastCell = new Date(cellDateStr) < new Date(todayFocusStr);
      let pastCompletions = {};
      
      if (isPastCell && appState.activityLog) {
        // Reconstruct the final completion state of each task at the end of the past day
        const dayLogs = appState.activityLog.filter(log => log.date === cellDateStr && log.type === 'task');
        dayLogs.forEach(log => {
          if (log.message.startsWith('Completed task: ')) {
            const tName = log.message.replace('Completed task: ', '').trim();
            pastCompletions[tName] = true;
          } else if (log.message.startsWith('Un-completed task: ')) {
            const tName = log.message.replace('Un-completed task: ', '').trim();
            pastCompletions[tName] = false;
          }
        });
      }
      
      scheduledTasks.forEach(task => {
        let isCompleted = false;
        
        if (isFutureCell) {
          isCompleted = false;
        } else if (isPastCell) {
          isCompleted = !!pastCompletions[task.name];
        } else {
          // Today
          isCompleted = task.completed;
        }
        
        if (isCompleted) {
          completedTasks.push(task);
        } else {
          pendingTasks.push(task);
        }
      });"""

content = content.replace(target, replacement)

with open(js_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully fixed Planner calendar completion logic!")
