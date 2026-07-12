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

---

## Branch Flow

main
 └── round-1-foundation     (Prompt 1-6: skeleton, models, auth, seed, UI shell)
 └── round-2-core-data      (CRUD: users, departments, categories, assets)
 └── round-3-transactions   (allocations, transfers, bookings, maintenance)
 └── round-4-ops-polish     (audit, reports, activity logs, notifications, polish)
