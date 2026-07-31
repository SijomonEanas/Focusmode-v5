import sys
import json

data_path = r"C:\Users\Sijomon enas\AppData\Roaming\focus-mode\focus-data.json"
with open(data_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Restore focusTimeToday
focus_time_to_restore = 0
for entry in data.get('history', []):
    if entry['date'] == 'Fri Jul 24 2026':
        focus_time_to_restore = entry['focusSeconds']
        entry['focusSeconds'] = 0 # Removing it from yesterday's history
        break

data['focusTimeToday'] = focus_time_to_restore

with open(data_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Successfully restored {focus_time_to_restore} seconds to today's focus time!")
