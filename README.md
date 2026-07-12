# AssetFlow 📦

**Team Penguin's Submission for the Odoo Hackathon 2026**

AssetFlow is a comprehensive, full-stack **Asset Management and Resource Booking System** built with the MERN stack (MongoDB, Express, React, Node.js) and styled with Tailwind CSS. It empowers organizations to track hardware, software, and bookable spaces throughout their entire lifecycle.

---

## 🚀 Key Features

### 🏢 1. Organization & Hierarchy Management
- **Departments**: Create hierarchical departments, assign department heads, and track which assets belong where.
- **Custom Categories**: Create dynamic asset categories (e.g., Laptops, Furniture) and define custom metadata fields specific to that category (e.g., CPU, RAM for laptops).
- **Role-Based Access Control (RBAC)**: Support for multiple roles including `Admin`, `AssetManager`, `DeptHead`, `Employee`, `Technician`, and `Auditor`. The UI dynamically adapts to the user's role.

### 💻 2. Asset Registry & Lifecycle Tracking
- **Inventory Management**: Register assets with photos, conditions, physical locations, and custom metadata. Automatically generates sequential Asset Tags (e.g., AF-0001).
- **Lifecycle History**: View the complete, unified history of an asset (allocations, returns, maintenance, and audits) in a single drawer view.

### 🔄 3. Allocations & Transfers
- **Smart Allocations**: Allocate assets to individual users or entire departments with expected return dates.
- **Transfer Requests & Conflict Handling**: If an asset is already in use, users can seamlessly submit a "Transfer Request" to the current holder. When approved by a manager, the system automatically closes the old allocation and creates a new one.
- **Overdue Tracking**: Automatically flags and highlights overdue allocations.

### 📅 4. Resource Booking (Meeting Rooms / Equipment)
- **Bookable Assets**: Mark specific assets (like Projectors or Conference Rooms) as "Bookable".
- **Scheduling & Conflicts**: Users can select date/time slots. The system features built-in conflict detection to prevent overlapping reservations.

### 🛠️ 5. Maintenance & Servicing Workflow
- **Multi-step Resolution**: Users can raise maintenance tickets (with priority levels and photos).
- **Workflow**: `Pending` → `Approved` (changes asset status to UnderMaintenance) → `TechAssigned` → `InProgress` → `Resolved` (changes asset status back to Available).

### 🔍 6. Physical Asset Audits
- **Audit Cycles**: Asset Managers can create targeted audit cycles bounded by date ranges, departments, or locations.
- **Verification**: Assigned Auditors use the system to physically verify assets, marking them as *Verified*, *Missing*, or *Damaged*.
- **Discrepancy Reporting**: Closing an audit cycle generates a discrepancy report and automatically updates the status of missing items to `Lost`.

### 📊 7. Dashboard, Analytics & Reporting
- **Real-time Dashboard**: KPI cards displaying available assets, active maintenance, and pending transfers. Includes visual indicators for Overdue items and Upcoming returns.
- **Reports**: Downloadable CSV reports for Asset Utilization, Maintenance Frequency, Department Summaries, and more.

### 🔔 8. Notifications & Activity Logging
- **In-App Notifications**: Real-time bell alerts for things like approved transfers, assigned maintenance, and new audit cycles.
- **Global Activity Logs**: A system-wide, immutable audit trail of every significant action, searchable by entity type.

### 🤖 9. Ask AssetFlow (AI Assistant)
- **Natural Language Search**: A powerful smart-search command bar on the dashboard powered by Groq and Llama 3. Users can type queries like *"show overdue laptops in engineering"* and the AI automatically parses it into exact category, status, and search filters for the Asset Registry.
- **Secure & Fast**: Powered by ultra-fast Llama-3 endpoints, passing filters directly to existing secure endpoints without exposing API keys to the frontend.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), React Router, Tailwind CSS, Lucide React (Icons), `date-fns` for date formatting, Axios for API calls. UI built using custom Tailwind components inspired by shadcn/ui.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB & Mongoose.
- **Storage**: Local filesystem storage utilizing **Multer** for processing `multipart/form-data` and managing photo uploads.
- **Authentication**: JWT (JSON Web Tokens) + bcrypt for password hashing. Incorporates **Resend API** for 2FA / OTP email verification during user sign-up.

---

## ⚙️ Running Locally

We have created automated setup scripts to install all dependencies for both the frontend, backend, and the Python live data simulator.

1. **Clone the repository**
2. **Run the setup script** for your operating system:
   - **Windows:** double-click `setup\setup.bat` or run it in the terminal
   - **Mac/Linux:** run `sh setup/setup.sh` in the terminal
3. **Set up Environment Variables:**
   - Create a `.env` file in the `/server` directory:
   ```env
   PORT=5000
   MONGO_URI=mongodb://127.0.0.1:27017/assetflow
   JWT_SECRET=your_super_secret_key_123
   GROQ_API_KEY=your_groq_key_here
   RESEND_API_KEY=your_resend_api_key_here
   ```
4. **Start the applications:**
   Open two terminals:
   - Terminal 1: `cd server && npm run dev`
   - Terminal 2: `cd client && npm run dev`
   - Terminal 3 (optional, for live demo data): `cd server/scripts && python live_data.py`

4. **Seed Database (Optional)**
   To generate the default `admin@assetflow.com` user and initial test data:
   ```bash
   cd server
   node scripts/seed.js
   ```

## 📜 License
Developed for the Odoo Hackathon 2026.
