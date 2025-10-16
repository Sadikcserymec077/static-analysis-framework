📱 MobSF Static Analysis UI

A lightweight React + Node.js proxy UI for MobSF (Mobile Security Framework)
.
The backend securely proxies all API calls to MobSF — your MobSF API key never touches the frontend.
It also caches JSON/PDF reports locally for faster access and offline review.

🚀 Features

Secure proxy for MobSF API (hides API key)

Upload & scan APK/IPA files from a simple UI

View scan progress and logs

Download or view cached JSON/PDF reports

Automatically saves reports to /reports folder

📁 Project Structure
mobsf-project/
├─ mobsf-ui-backend/
│  ├─ server.js
│  ├─ package.json
│  ├─ .env.example
│  ├─ reports/ (created automatically)
│  └─ ...
├─ mobsf-frontend/
│  ├─ src/
│  │  ├─ api.js
│  │  ├─ components/
│  │  │  ├─ UploadForm.js
│  │  │  ├─ ScansList.js
│  │  │  ├─ ReportView.js
│  │  └─ App.js
│  ├─ package.json
│  ├─ .env.local.example
│  └─ ...
└─ README.md

🧩 Prerequisites

Before you start:

Node.js 18+ and npm

MobSF running locally or accessible (default: http://localhost:8000)

(Optional) Git & GitHub for version control

⚙️ Backend Setup
cd mobsf-project/mobsf-ui-backend

# Copy and edit environment variables
cp .env.example .env
# Open .env and set:
# MOBSF_URL=http://localhost:8000
# MOBSF_API_KEY=<your_mobsf_api_key>
# PORT=4000

npm install
npm run dev     # or `node server.js`


✅ Verify connection to MobSF:

curl "http://localhost:4000/api/scans?page=1&page_size=1"


If you get 401 Unauthorized, double-check your MOBSF_API_KEY and MobSF URL.

💻 Frontend Setup
cd ../mobsf-frontend
cp .env.local.example .env.local
# Open .env.local and set:
# REACT_APP_API_BASE=http://localhost:4000

npm install
npm start


Then open 👉 http://localhost:3000
 in your browser.

🔄 How It Works
Step	Description
1️⃣	User uploads APK/IPA → POST /api/upload
2️⃣	Backend forwards to MobSF, returns hash
3️⃣	Backend triggers scan → POST /api/scan
4️⃣	Frontend polls POST /api/scan_logs for progress
5️⃣	When complete, backend fetches reports (JSON/PDF) and saves under /reports

Example cached files:

mobsf-ui-backend/reports/
├─ json/<hash>.json
└─ pdf/<hash>.pdf

🔗 Key Endpoints
Method	Endpoint	Description
POST	/api/upload	Upload file (multipart/form-data)
POST	/api/scan	Start scan { hash }
POST	/api/scan_logs	Get scan progress logs
GET	/api/report_json/save?hash=<hash>	Fetch & cache JSON report
GET	/reports/json/<hash>	Access cached JSON report
GET	/api/download_pdf/save?hash=<hash>	Fetch & cache PDF
GET	/reports/pdf/<hash>	Access cached PDF report
GET	/api/reports	List cached reports
🛡️ Safety & Best Practices

Keep mobsf-ui-backend/.env private — never commit real keys.

.env and .env.local are ignored by Git.

If deploying publicly:

Add authentication to backend routes.

Use HTTPS and secure your server.

Never expose MobSF directly.

🧰 Troubleshooting
Problem	Solution
401 Unauthorized	Check MOBSF_API_KEY and restart backend
404 Report not Found	Wait for MobSF to finish analysis — keep polling /api/scan_logs
Report too large	Use /api/report_json/save?hash=<hash> to save locally and open the JSON manually
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

✅ Test end-to-end flow (upload → scan → report)

🔒 Add user authentication before deployment

🚀 Optionally deploy on internal network for team use