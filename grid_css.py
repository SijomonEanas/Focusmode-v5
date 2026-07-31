import sys
import re

css_path = r"E:\New project AI\FocusMode-v3\src\styles.css"
with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the flex layout with CSS Grid
grid_css = """/* --- Executive Dashboard Styles --- */
.executive-dashboard-view {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto 1.5fr 1fr;
  gap: 15px;
  height: 100%;
  overflow: hidden;
  padding-right: 8px;
}
.dashboard-header-bar { grid-column: span 2; display: flex; justify-content: space-between; align-items: center; }
.kpi-grid { grid-column: span 2; display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
.main-chart { grid-column: span 2; }
.pie-chart-area { grid-column: span 1; }
.habit-funnel-area { grid-column: span 1; }

.chart-container {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 15px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
  min-height: 0;
}"""

content = re.sub(r'/\* --- Executive Dashboard Styles ---\*/.*?\.chart-container \{.*?\}', grid_css, content, flags=re.DOTALL)

with open(css_path, "w", encoding="utf-8") as f:
    f.write(content)

js_path = r"E:\New project AI\FocusMode-v3\src\app.js"
with open(js_path, "r", encoding="utf-8") as f:
    js_content = f.read()

# Make app.js hide the AI review card when viewing the dashboard
js_content = js_content.replace("elTasksViewContent.classList.add('hidden');", "elTasksViewContent.classList.add('hidden');\n  const elAiCard = document.getElementById('ai-review-card-container');\n  if(elAiCard) elAiCard.classList.add('hidden');")

js_content = js_content.replace("elTasksViewContent.classList.remove('hidden');", "elTasksViewContent.classList.remove('hidden');\n  const elAiCard = document.getElementById('ai-review-card-container');\n  if(elAiCard) elAiCard.classList.remove('hidden');")

with open(js_path, "w", encoding="utf-8") as f:
    f.write(js_content)

print("Updated CSS and JS.")
