# Finishing Planner - Operation Balance Tracker Mobile App

Ye application `FINISHING_PLANNER.xlsx` me `ALL_DEPART` sheet ke data par bani hai taake mobile phone se kisi bhi **MAIN_JOB#** ke against selected **OPERATION** ka **BAL** (Balance) asani se check kiya ja sake.

---

## 🚀 GitHub Pages Par Live Chalane Ka Tareeqa (Free & 100% Online)

1. [GitHub.com](https://github.com) par ek naya repository banayein (e.g. `finishing-planner-app`).
2. `mobile_app` folder ki files (`index.html`, `app.js`, `data.json`, `manifest.json`) ko us repository me upload karein:
   - Ya Git command se push karein:
     ```bash
     cd mobile_app
     git init
     git add .
     git commit -m "Initial commit for mobile app"
     git branch -M main
     git remote add origin https://github.com/<your-username>/<repo-name>.git
     git push -u origin main
     ```
3. Repository ki **Settings** > **Pages** me jayein:
   - **Source:** Deploy from a branch (`main` / root)
   - **Save** par click karein.
4. Kuch seconds baad aapko live link mil jayega:
   `https://<your-username>.github.io/<repo-name>/`
5. Ab is link ko apne mobile browser me khol kar **"Add to Home Screen"** kar lein — ye mobile par bilkul native app (APK) ki tarah icon ban kar khulegi!

---

## 🔄 Jab Bhi Excel Me Data Update Ho:
Folder me mojud `export_data.py` run karein:
```bash
python export_data.py
```
Ye script `FINISHING_PLANNER.xlsx` se naya data parh kar `mobile_app/data.json` ko update kar dega. Phir bas `data.json` ko GitHub par push kar dena hai.
