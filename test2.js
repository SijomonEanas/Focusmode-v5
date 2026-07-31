const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync("src/index.html", "utf-8");
const dashboardJs = fs.readFileSync("src/dashboard.js", "utf-8");
const appJs = fs.readFileSync("src/app.js", "utf-8");

const dom = new JSDOM(html, { runScripts: "dangerously" });

// Mock APIs
dom.window.Chart = class {
  constructor(ctx, config) { this.ctx = ctx; this.config = config; }
  destroy() {}
};
dom.window.electronAPI = {
  saveData: async () => {},
  onTasksUpdated: () => {},
  loadData: async () => ({ tasks: [], history: [], habits: [] }),
  updateSettings: async () => {}
};

try {
  dom.window.eval(appJs);
  dom.window.eval(dashboardJs);
  
  dom.window.document.getElementById('btn-view-dashboard').click();
  
  if (dom.window.mainTrendChartInstance) {
     console.log("SUCCESS: Dashboard rendered perfectly.");
  } else {
     console.log("FAILED to instantiate charts.");
  }
} catch (e) {
  console.error("ERROR: ", e);
}
