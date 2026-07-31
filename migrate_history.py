import sys
import json

data_path = r"C:\Users\Sijomon enas\AppData\Roaming\focus-mode\focus-data.json"
with open(data_path, "r", encoding="utf-8") as f:
    data = json.load(f)

for task in data.get("tasks", []):
    if task.get("name") == "English":
        task["history"] = {
            "Thu Jul 23 2026": { "duration": 1800, "qty": 0, "completed": False },
            "Fri Jul 24 2026": { "duration": 3600, "qty": 0, "completed": True }
        }
    if task.get("name") == "English Daily Task":
        task["history"] = {
            "Fri Jul 24 2026": { "duration": 0, "qty": 4, "completed": False }
        }

with open(data_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("Migration successful! Added dummy history data.")
