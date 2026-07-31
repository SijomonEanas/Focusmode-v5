const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync("src/index.html", "utf-8");
const dashboardJs = fs.readFileSync("src/dashboard.js", "utf-8");
const appJs = fs.readFileSync("src/app.js", "utf-8");

const dom = new JSDOM(html, { runScripts: "dangerously" });

// Mock Chart.js
dom.window.Chart = class {
  constructor(ctx, config) { this.ctx = ctx; this.config = config; }
  destroy() {}
};

try {
  dom.window.eval(dashboardJs);
  console.log("Dashboard JS loaded successfully.");
  
  dom.window.eval(appJs);
  console.log("App JS loaded successfully.");
  
  // Simulate clicking Dashboard button
  dom.window.document.getElementById('btn-view-dashboard').click();
  console.log("Clicked Dashboard button successfully.");
  
  // Check if charts were instantiated
  if (dom.window.mainTrendChartInstance && dom.window.workspacePieChartInstance) {
     console.log("Charts instantiated successfully.");
  } else {
     console.log("Failed to instantiate charts.");
  }
} catch (e) {
  console.error("ERROR: ", e);
}
