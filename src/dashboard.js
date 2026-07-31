// Executive Analytics Dashboard Controller
let mainTrendChartInstance = null;

function renderDashboard() {
  const allHistory = appState.history || [];
  
  // Filter history to last 30 days for monthly analysis
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  
  const history = allHistory.filter(h => {
    const entryDate = new Date(h.date);
    return entryDate >= thirtyDaysAgo;
  });
  
  const tasks = appState.tasks || [];
  
  // 1. Calculate KPIs
  let totalFocusSeconds = 0;
  let totalDistractions = 0;
  let totalCompletedTasks = 0;
  let totalDaysWithTasks = 0;
  
  history.forEach(h => {
    totalFocusSeconds += h.focusSeconds || 0;
    totalDistractions += h.distractions || 0;
    if ((h.totalTasks || 0) > 0) {
      totalCompletedTasks += h.completedTasks || 0;
      totalDaysWithTasks++;
    }
  });
  
  // Calculate Avg Task Completion Rate
  let avgRate = 0;
  if (totalDaysWithTasks > 0) {
    const totalHistoricalTasks = history.reduce((sum, h) => sum + (h.totalTasks || 0), 0);
    if (totalHistoricalTasks > 0) {
      avgRate = (totalCompletedTasks / totalHistoricalTasks) * 100;
    }
  }

  // Calculate Avg Daily Tasks
  let avgTasks = totalDaysWithTasks > 0 ? totalCompletedTasks / totalDaysWithTasks : 0;
  
  // Update KPI UI
  document.getElementById('kpi-focus-time').textContent = Math.round(totalFocusSeconds / 3600) + 'h';
  document.getElementById('kpi-avg-tasks').textContent = avgTasks.toFixed(1);
  document.getElementById('kpi-completion-rate').textContent = Math.round(avgRate) + '%';
  document.getElementById('kpi-distractions').textContent = totalDistractions;

  // 2. Main Trend Chart (Last 30 Days)
  const last30Days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - (i * 24 * 3600 * 1000));
    last30Days.push(d.toDateString());
  }
  
  const labels = [];
  const focusTimeData = [];
  const completionRateData = [];
  
  last30Days.forEach(dateStr => {
    labels.push(dateStr.substring(0, 10)); // e.g. "Thu Jul 23"
    const entry = history.find(h => h.date === dateStr);
    if (entry) {
      focusTimeData.push(Math.round((entry.focusSeconds || 0) / 60)); // in minutes
      const rate = (entry.totalTasks || 0) > 0 ? ((entry.completedTasks || 0) / entry.totalTasks) * 100 : 0;
      completionRateData.push(rate);
    } else {
      focusTimeData.push(0);
      completionRateData.push(0);
    }
  });

  const mainCtx = document.getElementById('mainTrendChart').getContext('2d');
  if (mainTrendChartInstance) mainTrendChartInstance.destroy();
  
  mainTrendChartInstance = new Chart(mainCtx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Focus Time (mins)',
          data: focusTimeData,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderRadius: 4,
          order: 2,
          yAxisID: 'y'
        },
        {
          label: 'Completion Rate (%)',
          data: completionRateData,
          type: 'line',
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderWidth: 3,
          tension: 0.4,
          order: 1,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Minutes' } },
        y1: { beginAtZero: true, max: 100, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Rate (%)' } },
        x: { grid: { display: false } }
      },
      plugins: {
        legend: { labels: { color: '#9ca3af' } }
      }
    }
  });

  // 3. Workspace Pie Chart
  // Pie chart removed as per user request
  // 4. Habit Funnel / Streaks
  const elHabitList = document.getElementById('habit-funnel-list');
  elHabitList.innerHTML = '';
  
  const sortedHabits = [...(appState.habits || [])].sort((a,b) => (b.streak || 0) - (a.streak || 0)).slice(0, 5);
  if (sortedHabits.length === 0) {
    elHabitList.innerHTML = '<div style="color:var(--text-muted);font-size:0.9rem;text-align:center;margin-top:20px;">No habits tracked yet.</div>';
  } else {
    sortedHabits.forEach(h => {
      elHabitList.innerHTML += `
        <div class="funnel-item">
          <span class="funnel-name">${h.name}</span>
          <span class="funnel-streak">🔥 ${h.streak || 0}</span>
        </div>
      `;
    });
  }
}

document.getElementById('btn-refresh-dash').addEventListener('click', () => {
  if (typeof playChime === 'function') playChime('click');
  renderDashboard();
});
