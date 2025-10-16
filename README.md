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
  ## important
pull the mobsf ui and access REST API from DOCKER for Easy Setup

docker pull opensecurity/mobile-security-framework-mobsf:latest
docker run -it --rm -p 8000:8000 opensecurity/mobile-security-framework-mobsf:latest

# Default username and password: mobsf/mobsf

MobSF running locally or accessible (default: http://localhost:8000)

(Optional) Git & GitHub for version control

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



Useful extra commands
# verify backend -> MobSF connectivity (should not be 401)
curl "http://localhost:4000/api/scans?page=1&page_size=1"

# list cached reports
curl "http://localhost:4000/api/reports"

# fetch & save JSON report (replace <hash>)
curl "http://localhost:4000/api/report_json/save?hash=<hash>"

Recommended package.json scripts (add to backend/package.json)
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "lint": "eslint .",
  "prepare-reports": "mkdir -p reports/json reports/pdf || (mkdir reports & mkdir reports\\json & mkdir reports\\pdf)"
}


Hint: Install nodemon as a dev dependency (npm i -D nodemon) so npm run dev reloads on changes.

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




Recommended package.json scripts (frontend/package.json)
"scripts": {
  "start": "react-scripts start",
  "build": "react-scripts build",
  "test": "react-scripts test --env=jsdom",
  "eject": "react-scripts eject",
  "lint": "eslint 'src/**/*.{js,jsx}'"
}

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