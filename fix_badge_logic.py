import sys

js_path = r"E:\New project AI\FocusMode-v3\src\app.js"
with open(js_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """      let badgeText = 'Checklist';
      if (task.type === 'quantity') {
        const target = getEffectiveTaskTarget(task, cellDateStr);
        const current = isFutureCell ? 0 : task.currentQty;
        badgeText = `${current}/${target} Qty`;
      } else if (task.type === 'duration') {
        const target = getEffectiveTaskTarget(task, cellDateStr);
        const current = isFutureCell ? 0 : task.currentDuration;
        if (isCompleted) {
          badgeText = 'Done';
        } else {
          const leftMin = Math.ceil(Math.max(0, target - current) / 60);
          badgeText = `${leftMin}m left`;
        }
      }"""

replacement = """      let badgeText = 'Checklist';
      if (isCompleted) {
        badgeText = 'Done';
      } else if (isPastCell) {
        badgeText = 'Missed';
      } else if (task.type === 'quantity') {
        const target = getEffectiveTaskTarget(task, cellDateStr);
        const current = isFutureCell ? 0 : task.currentQty;
        badgeText = `${current}/${target} Qty`;
      } else if (task.type === 'duration') {
        const target = getEffectiveTaskTarget(task, cellDateStr);
        const current = isFutureCell ? 0 : task.currentDuration;
        const leftMin = Math.ceil(Math.max(0, target - current) / 60);
        badgeText = `${leftMin}m left`;
      }"""

content = content.replace(target, replacement)

with open(js_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully fixed Planner badge logic!")
