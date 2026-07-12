# AssetFlow — Data Contract & API Reference

> **Rule:** Every round builds against this file. Do not change a schema shape without updating this doc and notifying downstream devs.

---

## Tech Stack

| Layer      | Choice                              |
|------------|-------------------------------------|
| Frontend   | React 18 + Vite + Tailwind CSS + shadcn/ui |
| Backend    | Node.js + Express                   |
| Database   | MongoDB + Mongoose                  |
| Auth       | JWT (jsonwebtoken) + bcrypt         |

---

## Data Models

### User
{
  name:          String,       // required
  email:         String,       // required, unique
  passwordHash:  String,       // required
  role:          Enum['Employee','DeptHead','AssetManager','Admin'],  // default 'Employee'
  department:    ObjectId → Department,
  status:        Enum['Active','Inactive'],   // default 'Active'
  createdAt:     Date,
  updatedAt:     Date
}

### Department
{
  name:               String,   // required, unique
  headUserId:         ObjectId → User,
  parentDepartmentId: ObjectId → Department,  // null for top-level
  status:             Enum['Active','Inactive'],
  createdAt:          Date,
  updatedAt:          Date
}

### AssetCategory
{
  name:         String,   // required, unique
  customFields: [{
    key:   String,
    label: String,
    type:  Enum['Text','Number','Date','Boolean','Select']
  }],
  createdAt: Date,
  updatedAt: Date
}

### Asset
{
  assetTag:        String,   // auto-generated AF-0001, unique
  name:            String,   // required
  categoryId:      ObjectId → AssetCategory,
  serialNumber:    String,
  acquisitionDate: Date,
  acquisitionCost: Number,
  condition:       Enum['New','Good','Fair','Poor','Damaged'],
  location:        String,
  photos:          [String], // URLs
  isBookable:      Boolean,  // default false
  status:          Enum['Available','Allocated','Reserved','UnderMaintenance','Lost','Retired','Disposed'],
  createdAt:       Date,
  updatedAt:       Date
}

### Allocation
{
  assetId:            ObjectId → Asset,     // required
  holderType:         Enum['User','Department'],
  holderId:           ObjectId,             // → User or Department
  allocatedAt:        Date,
  expectedReturnDate: Date,
  returnedAt:         Date,
  status:             Enum['Active','Returned'],
  createdAt:          Date,
  updatedAt:          Date
}

### TransferRequest
{
  assetId:     ObjectId → Asset,
  fromHolder:  { type: Enum['User','Department'], id: ObjectId },
  toHolder:    { type: Enum['User','Department'], id: ObjectId },
  requestedBy: ObjectId → User,
  status:      Enum['Requested','Approved','Rejected'],
  createdAt:   Date,
  updatedAt:   Date
}

### Booking
{
  assetId:   ObjectId → Asset,
  bookedBy:  ObjectId → User,
  startTime: Date,
  endTime:   Date,
  status:    Enum['Upcoming','Ongoing','Completed','Cancelled'],
  createdAt: Date,
  updatedAt: Date
}

### MaintenanceRequest
{
  assetId:  ObjectId → Asset,
  raisedBy: ObjectId → User,
  issue:    String,
  priority: Enum['Low','Medium','High','Critical'],
  photo:    String,   // URL
  status:   Enum['Pending','Approved','Rejected','TechAssigned','InProgress','Resolved'],
  createdAt: Date,
  updatedAt: Date
}

### AuditCycle
{
  scope: {
    department: ObjectId → Department,
    location:   String
  },
  dateRange: { start: Date, end: Date },
  auditors:  [ObjectId → User],
  status:    Enum['Planned','InProgress','Completed'],
  items: [{
    assetId: ObjectId → Asset,
    result:  Enum['Found','Missing','Damaged'],
    notes:   String
  }],
  createdAt: Date,
  updatedAt: Date
}

### Notification
{
  userId:        ObjectId → User,
  type:          String,
  message:       String,
  relatedEntity: { entityType: String, entityId: ObjectId },
  read:          Boolean,   // default false
  createdAt:     Date
}

### ActivityLog
{
  userId:     ObjectId → User,
  action:     String,
  entityType: String,
  entityId:   ObjectId,
  timestamp:  Date,    // default Date.now
  ipAddress:  String
}

---

## API Routes

> Updated after each round.

### Auth (Round 1)
| Method | Path                      | Body                          | Response                    | Auth |
|--------|---------------------------|-------------------------------|-----------------------------|------|
| POST   | `/api/auth/signup`        | `{name, email, password}`     | `{token, user}`             | No   |
| POST   | `/api/auth/login`         | `{email, password}`           | `{token, user}`             | No   |
| POST   | `/api/auth/forgot-password` | `{email}`                   | `{message}`                 | No   |
| GET    | `/api/auth/me`            | —                             | `{user}`                    | Yes  |
| GET    | `/api/health`             | —                             | `{status:'ok',timestamp}`   | No   |

### Master Data & Users (Round 2)
| Method | Path                      | Body                          | Response                    | Auth |
|--------|---------------------------|-------------------------------|-----------------------------|------|
| GET    | `/api/users`              | Query: `department,role,status` | `{success, data: [User]}`   | Admin |
| PATCH  | `/api/users/:id/role`     | `{role}`                      | `{success, data: User}`     | Admin |
| GET    | `/api/departments`        | —                             | `{success, data: [Dept]}`   | Admin |
| POST   | `/api/departments`        | `{name, headUserId, ...}`     | `{success, data: Dept}`     | Admin |
| PUT    | `/api/departments/:id`    | `{name, status, ...}`         | `{success, data: Dept}`     | Admin |
| GET    | `/api/categories`         | —                             | `{success, data: [Cat]}`    | Admin |
| POST   | `/api/categories`         | `{name, customFields}`        | `{success, data: Cat}`      | Admin |
| PUT    | `/api/categories/:id`     | `{name, customFields}`        | `{success, data: Cat}`      | Admin |

### Assets (Round 2)
| Method | Path                      | Body                          | Response                    | Auth |
|--------|---------------------------|-------------------------------|-----------------------------|------|
| GET    | `/api/assets`             | Query filters                 | `{success, data: [Asset]}`  | AssetManager+ |
| GET    | `/api/assets/:id`         | —                             | `{success, data: Asset}`    | AssetManager+ |
| POST   | `/api/assets`             | FormData (with photo)         | `{success, data: Asset}`    | AssetManager+ |
| PUT    | `/api/assets/:id`         | FormData (with photo)         | `{success, data: Asset}`    | AssetManager+ |
| GET    | `/api/assets/:id/history` | —                             | `{success, data: [...]}`    | AssetManager+ |

### Allocations (Round 3)
| Method | Path                             | Body                                        | Response                             | Auth           |
|--------|----------------------------------|---------------------------------------------|--------------------------------------|----------------|
| POST   | `/api/allocations`               | `{assetId, holderType, holderId, expectedReturnDate}` | `201: {success, data: Allocation}` | AssetManager+  |
|        |                                  |                                             | `409: {error, currentHolder: {name, id, type}}` |        |
| GET    | `/api/allocations`               | Query: `assetId, holderId, status`          | `{success, data: [Allocation]}`     | Authenticated  |
| GET    | `/api/allocations/:id`           | —                                           | `{success, data: Allocation}`       | Authenticated  |
| PATCH  | `/api/allocations/:id/return`    | `{condition, notes}`                        | `{success, data: Allocation}`       | AssetManager+  |

> **Computed field**: Every Allocation returned by GET includes `isOverdue: Boolean` — true when `status === 'Active' && expectedReturnDate < now && !returnedAt`.

#### 409 Response Shape (Allocation Conflict)
```json
{
  "error": "Currently held by John Doe",
  "currentHolder": {
    "name": "John Doe",
    "id": "664f...",
    "type": "User"
  }
}
```

---

### Transfers (Round 3)
| Method | Path                             | Body                                        | Response                             | Auth           |
|--------|----------------------------------|---------------------------------------------|--------------------------------------|----------------|
| POST   | `/api/transfers`                 | `{assetId, toHolder: {type, id}}`           | `201: {success, data: TransferRequest}` | Authenticated |
| GET    | `/api/transfers`                 | Query: `assetId, status`                    | `{success, data: [TransferRequest]}` | Authenticated |
| PATCH  | `/api/transfers/:id/approve`     | —                                           | `{success, data: TransferRequest}`  | AssetManager/Admin/DeptHead |
| PATCH  | `/api/transfers/:id/reject`      | `{reason}`                                  | `{success, data: TransferRequest}`  | AssetManager/Admin/DeptHead |

---

### Bookings (Round 3)
| Method | Path                             | Body                                        | Response                             | Auth           |
|--------|----------------------------------|---------------------------------------------|--------------------------------------|----------------|
| POST   | `/api/bookings`                  | `{assetId, startTime, endTime}`             | `201: {success, data: Booking}`     | Authenticated  |
|        |                                  |                                             | `409: {error, conflictingSlot: {...}}` |              |
| GET    | `/api/bookings`                  | Query: `assetId, bookedBy, status`          | `{success, data: [Booking]}`        | Authenticated  |
| PATCH  | `/api/bookings/:id/cancel`       | —                                           | `{success, data: Booking}`          | Booker/AssetManager+ |
| PATCH  | `/api/bookings/:id/reschedule`   | `{startTime, endTime}`                      | `{success, data: Booking}`          | Booker/AssetManager+ |

> **Status auto-derivation**: GET responses compute status on read from current time vs `startTime`/`endTime` — `Upcoming` (now < start), `Ongoing` (start ≤ now ≤ end), `Completed` (now > end). `Cancelled` is stored and preserved.

#### 409 Response Shape (Booking Conflict)
```json
{
  "error": "Booking conflicts with existing reservation",
  "conflictingSlot": {
    "startTime": "2026-07-12T09:00:00.000Z",
    "endTime": "2026-07-12T10:00:00.000Z",
    "bookedBy": { "name": "Jane Smith", "email": "jane@assetflow.com" }
  }
}
```

---

### Maintenance (Round 3)
| Method | Path                                    | Body                                   | Response                               | Auth           |
|--------|-----------------------------------------|----------------------------------------|----------------------------------------|----------------|
| POST   | `/api/maintenance`                      | FormData: `{assetId, issue, priority, photo}` | `201: {success, data: MaintenanceRequest}` | Authenticated |
| GET    | `/api/maintenance`                      | Query: `assetId, status, priority`     | `{success, data: [MaintenanceRequest]}` | Authenticated |
| PATCH  | `/api/maintenance/:id/approve`          | —                                      | `{success, data}`                      | AssetManager+  |
| PATCH  | `/api/maintenance/:id/reject`           | `{reason}`                             | `{success, data}`                      | AssetManager+  |
| PATCH  | `/api/maintenance/:id/assign-technician`| `{technicianId}`                       | `{success, data}`                      | AssetManager+  |
| PATCH  | `/api/maintenance/:id/start`            | —                                      | `{success, data}`                      | AssetManager+  |
| PATCH  | `/api/maintenance/:id/resolve`          | `{resolution}`                         | `{success, data}`                      | AssetManager+  |

> **Status transitions**: Pending → Approved (asset → UnderMaintenance) → TechAssigned → InProgress → Resolved (asset → Available). Pending → Rejected (no asset change).

---

### Audits (Round 4)
| Method | Path                              | Body                                         | Response                              | Auth              |
|--------|-----------------------------------|----------------------------------------------|---------------------------------------|-------------------|
| POST   | `/api/audits`                     | `{scope: {department, location}, dateRange: {start, end}, auditors: [userIds]}` | `201: {success, data: AuditCycle}` | Admin/AssetManager |
| GET    | `/api/audits`                     | —                                            | `{success, data: [AuditCycle]}`      | Admin/AssetManager |
| GET    | `/api/audits/:id`                 | —                                            | `{success, data: AuditCycle}`        | Admin/AssetManager |
| PATCH  | `/api/audits/:id/items/:assetId`  | `{result, notes}`                            | `{success, data: AuditCycle}`        | Assigned auditor   |
| PATCH  | `/api/audits/:id/close`           | —                                            | `{success, data: AuditCycle}`        | Admin/AssetManager |

> **Close behavior**: Sets status to `Closed`, builds `discrepancyReport` from Missing/Damaged items, and sets `asset.status = 'Lost'` for every confirmed-Missing asset.

---

### Notifications (Round 4)
| Method | Path                            | Body | Response                              | Auth          |
|--------|---------------------------------|------|---------------------------------------|---------------|
| GET    | `/api/notifications`            | Query: `unread` | `{success, data: [Notification], unreadCount}` | Authenticated |
| PATCH  | `/api/notifications/:id/read`   | —    | `{success, data: Notification}`      | Owner only    |
| PATCH  | `/api/notifications/read-all`   | —    | `{success, message}`                 | Authenticated |

> **Trigger points**: Asset allocated (notify holder), transfer approved (notify both), booking confirmed/cancelled (notify booker), maintenance approved/rejected/resolved (notify requester), audit discrepancy flagged (notify Admin/AssetManager).

---

### Activity Logs (Round 4)
| Method | Path                 | Body                                      | Response                          | Auth  |
|--------|----------------------|-------------------------------------------|-----------------------------------|-------|
| GET    | `/api/activity-logs` | Query: `userId, entityType, startDate, endDate` | `{success, data: [ActivityLog]}` | Admin |

> **Write points**: Every create/update across allocations, transfers, bookings, maintenance, audits, departments, categories, users. Captures userId, action, entityType, entityId, timestamp, ipAddress.

---

### Reports (Round 4)
| Method | Path                              | Body | Response                          | Auth                    |
|--------|-----------------------------------|------|-----------------------------------|-------------------------|
| GET    | `/api/reports/utilization`        | —    | `{success, data: [...]}`         | DeptHead/AssetManager+  |
| GET    | `/api/reports/maintenance-frequency` | — | `{success, data: [...]}`         | DeptHead/AssetManager+  |
| GET    | `/api/reports/department-summary` | —    | `{success, data: [...]}`         | DeptHead/AssetManager+  |
| GET    | `/api/reports/booking-heatmap`    | —    | `{success, data: [...]}`         | DeptHead/AssetManager+  |
| GET    | `/api/reports/assets-due`         | —    | `{success, data: {poorCondition, underMaintenance}}` | DeptHead/AssetManager+ |

---

### Dashboard (Round 4)
| Method | Path                     | Body | Response                          | Auth          |
|--------|--------------------------|------|-----------------------------------|---------------|
| GET    | `/api/dashboard/stats`   | —    | `{success, data: {availableCount, allocatedCount, ...}}` | Authenticated |
| GET    | `/api/dashboard/overdue` | —    | `{success, data: {overdueAllocations}}` | Authenticated |
| GET    | `/api/dashboard/upcoming`| —    | `{success, data: {upcomingReturns}}`    | Authenticated |

---

## Branch Flow

main
 └── round-1-foundation     (Prompt 1-6: skeleton, models, auth, seed, UI shell)
 └── round-2-core-data      (CRUD: users, departments, categories, assets)
 └── round-3-transactions   (allocations, transfers, bookings, maintenance)
 └── round-4-ops-polish     (audit, reports, activity logs, notifications, polish)


