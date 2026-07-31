import sys
import re

js_path = r"E:\New project AI\FocusMode-v3\src\dashboard.js"
with open(js_path, "r", encoding="utf-8") as f:
    content = f.read()

# Remove pie chart rendering logic
target1 = """  // 3. Render Workspace Pie Chart
  const pieCtx = document.getElementById('workspacePieChart');
  if (pieCtx) {
    if (workspacePieChartInstance) workspacePieChartInstance.destroy();
    
    workspacePieChartInstance = new Chart(pieCtx.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(wsData).map(k => k.toUpperCase()),
        datasets: [{
          data: Object.values(wsData),
          backgroundColor: ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ef4444', '#6366f1'],
          borderWidth: 0,
          cutout: '60%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: '#9ca3af', font: { size: 11 } } }
        }
      }
    });
  }"""
content = content.replace(target1, "")

# Remove pie chart instance variable
target2 = "let workspacePieChartInstance = null;\n"
content = content.replace(target2, "")

with open(js_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Removed pie chart logic from dashboard.js")
