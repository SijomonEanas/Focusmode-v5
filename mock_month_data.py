import json
import random
from datetime import datetime, timedelta

data_path = r"C:\Users\Sijomon enas\AppData\Roaming\focus-mode\focus-data.json"
with open(data_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Clear existing history to replace it with 1 month mock data
data["history"] = []
for task in data.get("tasks", []):
    task["history"] = {}

start_date = datetime(2026, 6, 25)
end_date = datetime(2026, 7, 24)

curr_date = start_date
while curr_date <= end_date:
    date_str = curr_date.strftime("%a %b %d %Y")
    
    # Randomly decide if this day is a "full focus" day, "half" day, or "lazy" day
    day_type = random.choice(["full", "full", "half", "lazy"])
    
    daily_focus_seconds = 0
    daily_completed_tasks = 0
    daily_total_tasks = 4
    
    for task in data.get("tasks", []):
        t_name = task.get("name")
        if t_name not in ["English", "English Daily Task", "C S task", "excercise"]:
            continue
            
        t_hist = task.setdefault("history", {})
        
        if day_type == "lazy":
            # Didn't do anything for this task
            t_hist[date_str] = { "duration": 0, "qty": 0, "completed": False }
        else:
            is_completed = False
            qty = 0
            duration = 0
            
            if task.get("type") == "quantity":
                target = task.get("targetQty", 5)
                if day_type == "full":
                    qty = target
                    is_completed = True
                else:
                    qty = random.randint(1, target - 1)
            else:
                target = task.get("targetDuration", 3600)
                if day_type == "full":
                    duration = target
                    is_completed = True
                else:
                    duration = random.randint(600, target - 600)
                    
            t_hist[date_str] = { "duration": duration, "qty": qty, "completed": is_completed }
            
            daily_focus_seconds += duration
            if task.get("type") == "quantity":
                daily_focus_seconds += (qty * 600) 
                
            if is_completed:
                daily_completed_tasks += 1
                
    # Add to global history
    data["history"].append({
        "date": date_str,
        "focusSeconds": daily_focus_seconds,
        "distractions": random.randint(0, 5),
        "completedTasks": daily_completed_tasks,
        "totalTasks": daily_total_tasks
    })
    
    curr_date += timedelta(days=1)

with open(data_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print("Injected 30 days of mock data successfully!")
