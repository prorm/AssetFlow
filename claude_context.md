# AssetFlow Project Context

This document contains the core context for the AssetFlow project, a full-stack Asset Management system. It includes the README, Data Contract (Schemas and API Routes), and environment configuration.

---

## 1. README.md

```markdown
# AssetFlow 📦

**Team Penguin's Submission for the Odoo Hackathon 2026**

AssetFlow is a comprehensive, full-stack **Asset Management and Resource Booking System** built with the MERN stack (MongoDB, Express, React, Node.js) and styled with Tailwind CSS. It empowers organizations to track hardware, software, and bookable spaces throughout their entire lifecycle.

### 🚀 Key Features

1. **Organization & Hierarchy Management**: Departments, Custom Categories, Role-Based Access Control.
2. **Asset Registry & Lifecycle Tracking**: Inventory Management, Lifecycle History.
3. **Allocations & Transfers**: Smart Allocations, Transfer Requests & Conflict Handling, Overdue Tracking.
4. **Resource Booking**: Bookable Assets, Scheduling & Conflicts.
5. **Maintenance & Servicing Workflow**: Multi-step Resolution, Workflow transitions.
6. **Physical Asset Audits**: Audit Cycles, Verification, Discrepancy Reporting.
7. **Dashboard, Analytics & Reporting**: Real-time Dashboard, Reports.
8. **Notifications & Activity Logging**: In-App Notifications, Global Activity Logs.
9. **Ask AssetFlow (AI Assistant)**: Natural Language Search powered by Groq and Llama 3.

### 🛠️ Tech Stack

- **Frontend**: React (Vite), React Router, Tailwind CSS, Lucide React (Icons), `date-fns`, Axios, shadcn/ui.
- **Backend**: Node.js, Express.js.
- **Database**: MongoDB & Mongoose.
- **Storage**: Multer for local photo uploads.
- **Authentication**: JWT (JSON Web Tokens) + bcrypt.
```

---

## 2. Server Configuration

**`server/.env`**:
```env
PORT=5000
MONGODB_URI=mongodb://AcessDatabase:HelloHello123@ac-bxffhfl-shard-00-00.jq57mdl.mongodb.net:27017,ac-bxffhfl-shard-00-01.jq57mdl.mongodb.net:27017,ac-bxffhfl-shard-00-02.jq57mdl.mongodb.net:27017/?ssl=true&replicaSet=atlas-13ti31-shard-0&authSource=admin&appName=Cluster0&compressors=zlib
JWT_SECRET=assetflow-dev-secret-change-in-production
JWT_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=jbgvspdk
CLOUDINARY_API_KEY=817626984348789
CLOUDINARY_API_SECRET=94lTUKZnPjkpxeXyyr2qWTae0_k
CLOUDINARY_URL=cloudinary://817626984348789:94lTUKZnPjkpxeXyyr2qWTae0_k@jbgvspdk
GROQ_API_KEY=your_actual_api_key_here
```

**`server/index.js` (Entry point & routes setup)**:
```javascript
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/departments', require('./routes/departments'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/users', require('./routes/users'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/allocations', require('./routes/allocations'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/audits', require('./routes/audits'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activity-logs', require('./routes/activityLogs'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/ai', require('./routes/ai'));

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/assetflow';

mongoose.connect(MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => { console.log(`🚀  Server running on http://localhost:${PORT}`); });
  });
module.exports = app;
```

---

## 3. Data Contract & Schema (`CONTRACT.md`)

This represents the exact MongoDB structure (Mongoose models) and API routes required for the project.

### Data Models

- **User**: `{ name, email, passwordHash, role: Enum['Employee','DeptHead','AssetManager','Admin'], department, status }`
- **Department**: `{ name, headUserId, parentDepartmentId, status }`
- **AssetCategory**: `{ name, customFields: [{ key, label, type }] }`
- **Asset**: `{ assetTag, name, categoryId, serialNumber, acquisitionDate, condition, location, photos, isBookable, status: Enum['Available','Allocated','Reserved','UnderMaintenance','Lost','Retired','Disposed'] }`
- **Allocation**: `{ assetId, holderType, holderId, allocatedAt, expectedReturnDate, returnedAt, status }`
- **TransferRequest**: `{ assetId, fromHolder, toHolder, requestedBy, status }`
- **Booking**: `{ assetId, bookedBy, startTime, endTime, status }`
- **MaintenanceRequest**: `{ assetId, raisedBy, issue, priority, photo, status }`
- **AuditCycle**: `{ scope: { department, location }, dateRange, auditors, status, items: [{ assetId, result, notes }] }`
- **Notification**: `{ userId, type, message, relatedEntity, read }`
- **ActivityLog**: `{ userId, action, entityType, entityId, timestamp, ipAddress }`

### API Routes

- **Auth**: `/api/auth/signup`, `/api/auth/login`, `/api/auth/me`
- **Master Data**: `/api/users`, `/api/departments`, `/api/categories`
- **Assets**: `/api/assets`, `/api/assets/:id/history`
- **Allocations**: `/api/allocations`, `/api/allocations/:id/return` (Returns 409 if asset held by someone else)
- **Transfers**: `/api/transfers`, `/api/transfers/:id/approve`
- **Bookings**: `/api/bookings`, `/api/bookings/:id/cancel`
- **Maintenance**: `/api/maintenance`, `/api/maintenance/:id/approve`
- **Audits**: `/api/audits`, `/api/audits/:id/close`
- **Dashboard & Reports**: `/api/dashboard/stats`, `/api/reports/utilization`
