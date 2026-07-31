import sys
import re

css_path = r"E:\New project AI\FocusMode-v3\src\styles.css"
with open(css_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the Grid layout with a beautiful responsive scrolling Flex layout
new_css = """/* --- Executive Dashboard Styles --- */
.executive-dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100%;
  overflow-y: auto;
  padding-right: 12px;
  padding-bottom: 20px;
}
.executive-dashboard-view::-webkit-scrollbar { width: 6px; }
.executive-dashboard-view::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }

.dashboard-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 12px;
}
.dashboard-header-bar h2 {
  font-size: 1.4rem;
  font-weight: 600;
  color: var(--text-main);
  letter-spacing: 0.5px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 15px;
}
.kpi-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}
.kpi-title { font-size: 0.85rem; color: var(--text-muted); font-weight: 500; }
.kpi-value { font-size: 1.8rem; color: var(--text-main); font-weight: 700; font-family: var(--font-mono); }
.kpi-trend { font-size: 0.8rem; color: var(--color-green); font-weight: 500; }
.kpi-trend.negative { color: var(--color-red); }

.dashboard-main-charts {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
}
.dashboard-secondary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  width: 100%;
}
.main-chart {
  width: 100%;
  min-height: 320px;
}
.pie-chart-area {
  flex: 1 1 250px;
  min-height: 280px;
}
.habit-funnel-area {
  flex: 1 1 250px;
  min-height: 280px;
}

.chart-container {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
}
.chart-header { flex-shrink: 0; }
.chart-canvas-wrapper {
  flex: 1;
  position: relative;
  width: 100%;
  min-height: 200px;
}
.pie-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
}
.chart-header h3 { font-size: 1rem; color: var(--text-muted); font-weight: 500; margin-bottom: 15px; }

.habit-funnel-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  overflow-y: auto;
}"""

content = re.sub(r'/\* --- Executive Dashboard Styles ---\*/.*?\.habit-funnel-list \{.*?\n\}', new_css, content, flags=re.DOTALL)

with open(css_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Restored CSS to breathing scrolling layout.")
