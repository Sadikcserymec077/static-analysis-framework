# 📱 MobSF Static Analysis UI

A lightweight **React + Node.js proxy UI** for [MobSF (Mobile Security Framework)](https://github.com/MobSF/Mobile-Security-Framework-MobSF).  
The backend securely proxies all API calls to MobSF — your **MobSF API key never touches the frontend**.  
It also **caches JSON/PDF reports** locally for faster access and offline review.

---

## 🚀 Features
- Secure proxy for MobSF API (hides API key)
- Upload & scan APK/IPA files from a simple UI
- View scan progress and logs
- Download or view cached JSON/PDF reports
- Automatically saves reports to `/reports` folder

---

## 📁 Project Structure

mobsf-project/
├─ mobsf-ui-backend/
│ ├─ server.js
│ ├─ package.json
│ ├─ .env.example
│ ├─ reports/ (created automatically)
│ └─ ...
├─ mobsf-frontend/
│ ├─ src/
│ │ ├─ api.js
│ │ ├─ components/
│ │ │ ├─ UploadForm.js
│ │ │ ├─ ScansList.js
│ │ │ ├─ ReportView.js
│ │ └─ App.js
│ ├─ package.json
│ ├─ .env.local.example
│ └─ ...
└─ README.md


---

## 🧩 Prerequisites
Before you start:
- **Node.js 18+** and npm
- **MobSF** running locally or accessible (default: `http://localhost:8000`)
- (Optional) Git & GitHub for version control

---

## 🖥️ Backend Setup (mobsf-ui-backend)
```bash
# 1. Go to backend folder
cd mobsf-project/mobsf-ui-backend

# 2. Copy environment file
cp .env.example .env

# 3. Open .env and set your MobSF details
# MOBSF_URL=http://localhost:8000
# MOBSF_API_KEY=<your_mobsf_api_key>
# PORT=4000

# 4. Install dependencies
npm install

# 5. Create reports folders
mkdir -p reports/json reports/pdf

# 6. Start backend (development mode)
npm run dev

# OR start backend (production mode)
node server.js

# 7. Verify backend -> MobSF connectivity
curl "http://localhost:4000/api/scans?page=1&page_size=1"

💻 Frontend Setup (mobsf-frontend)
# 1. Go to frontend folder
cd mobsf-project/mobsf-frontend

# 2. Copy environment file
cp .env.local.example .env.local

# 3. Open .env.local and set backend API base
# REACT_APP_API_BASE=http://localhost:4000

# 4. Install dependencies
npm install

# 5. Start frontend (development mode)
npm start

# OR build frontend for production
npm run build

# 6. Open the app in browser
# URL: http://localhost:3000

⚡ Optional: Windows PowerShell Commands

Backend:
cd mobsf-project\mobsf-ui-backend
copy .env.example .env
# edit .env file with MobSF details
npm install
mkdir reports; mkdir reports\json; mkdir reports\pdf
npm run dev
# or
node server.js

Frontend:
cd mobsf-project\mobsf-frontend
copy .env.local.example .env.local
# edit .env.local file
npm install
npm start
# or build
npm run build

🔄 How It Works
| Step | Description                                                                  |
| ---- | ---------------------------------------------------------------------------- |
| 1️⃣  | User uploads APK/IPA → `POST /api/upload`                                    |
| 2️⃣  | Backend forwards to MobSF, returns `hash`                                    |
| 3️⃣  | Backend triggers scan → `POST /api/scan`                                     |
| 4️⃣  | Frontend polls `POST /api/scan_logs` for progress                            |
| 5️⃣  | When complete, backend fetches reports (JSON/PDF) and saves under `/reports` |

mobsf-ui-backend/reports/
├─ json/<hash>.json
└─ pdf/<hash>.pdf

🔗 Key Endpoints
| Method   | Endpoint                             | Description                       |
| -------- | ------------------------------------ | --------------------------------- |
| **POST** | `/api/upload`                        | Upload file (multipart/form-data) |
| **POST** | `/api/scan`                          | Start scan `{ hash }`             |
| **POST** | `/api/scan_logs`                     | Get scan progress logs            |
| **GET**  | `/api/report_json/save?hash=<hash>`  | Fetch & cache JSON report         |
| **GET**  | `/reports/json/<hash>`               | Access cached JSON report         |
| **GET**  | `/api/download_pdf/save?hash=<hash>` | Fetch & cache PDF                 |
| **GET**  | `/reports/pdf/<hash>`                | Access cached PDF report          |
| **GET**  | `/api/reports`                       | List cached reports               |

🧰 Troubleshooting

| Problem                | Solution                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `401 Unauthorized`     | Check `MOBSF_API_KEY` and restart backend                                          |
| `404 Report not Found` | Wait for MobSF to finish analysis — keep polling `/api/scan_logs`                  |
| Report too large       | Use `/api/report_json/save?hash=<hash>` to save locally and open the JSON manually |

🧾 Example Workflow

# Upload APK and start scan
curl -F "file=@/path/to/app.apk" http://localhost:4000/api/upload

# Poll logs until "Generating Report" or "Completed"
curl -X POST http://localhost:4000/api/scan_logs -d "hash=<hash>"

# Save JSON report
curl "http://localhost:4000/api/report_json/save?hash=<hash>"

# Download PDF report
curl "http://localhost:4000/api/download_pdf/save?hash=<hash>"

🧠 Next Steps

✅ Test full flow (upload → scan → report)

🔒 Add authentication before deploying publicly

🧹 Create scripts/setup-local.sh for one-click environment setup

🚀 Optionally deploy on internal network for team use

🏷️ License

This project is for educational and research purposes.
Always comply with MobSF’s license and your organization’s security policies.

---

✅ **How to use:**  
Just copy this entire block → paste into your `mobsf-project/README.md` → commit and push.  
GitHub will render it beautifully with one-click copy buttons on each code block.  

Would you like me to also create a matching **`CONTRIBUTING.md`** or a **`scripts/setup-local.sh`** helper for one-click environment setup?
