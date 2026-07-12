# AssetFlow — Demo Script (Judges' Walkthrough)

> **Time estimate**: ~12-15 minutes. Run through this at least twice before the demo.
> **Starting state**: Fresh database with seed admin user. Have 2 browser tabs ready.

---

## Pre-Demo Setup

```bash
# Terminal 1 — Start server
cd server
npm run dev

# Terminal 2 — Start client
cd client
npm run dev

# Terminal 3 (optional) — Start live data simulator
cd server/scripts
pip install pymongo python-dotenv
python live_data.py
```

Default admin credentials: `admin@assetflow.com` / `Admin123!`

---

## Step-by-Step Walkthrough

### 1. Login as Admin
1. Open `http://localhost:5173`
2. Login with `admin@assetflow.com` / `Admin123!`
3. ✅ Verify **Dashboard** loads with KPI cards (all zeros is fine for now)
4. ✅ Verify sidebar shows all 9 menu items (Admin sees everything)

### 2. Organization Setup (Admin)
1. Navigate to **Organization** (sidebar)
2. Create a Department: `"Engineering"` → click Create
3. Create a Category: `"Laptops"` → click Create
4. ✅ Verify both appear in their respective tables

### 3. Create Test Users
1. Open a new incognito/private window
2. **Sign Up** with: `"Jane Smith"` / `jane@assetflow.com` / `Test123!`
3. **Sign Up** with: `"Bob Wilson"` / `bob@assetflow.com` / `Test123!`
4. Back in the Admin window → **Organization** → Users tab
5. **Promote** Jane to `AssetManager`
6. ✅ Verify role badge updates immediately

### 4. Register Assets (Admin or AssetManager)
1. Navigate to **Asset Registry**
2. Register Asset 1: `"MacBook Pro 16"`, Category: Laptops, Condition: New, Location: "Building A"
3. Register Asset 2: `"Conference Room Projector"`, Category: (any), **Mark as Bookable** ✓, Location: "Building A"
4. Register Asset 3: `"Dell Monitor"`, Category: Laptops, Condition: Good
5. ✅ Verify auto-generated tags: AF-0001, AF-0002, AF-0003

### 5. Allocate an Asset → Trigger 409 Conflict ⭐
1. Navigate to **Allocation & Transfer** → **New Allocation** tab
2. Select `AF-0001 - MacBook Pro 16` → Holder Type: User → Select: `Jane Smith` → Expected Return: tomorrow → **Allocate**
3. ✅ Verify allocation appears in the Allocations tab, status = Active
4. **Now try to allocate AF-0001 again** (go to New Allocation) to Bob Wilson
5. ⭐ **409 Conflict**: You should see the orange warning: _"Currently held by Jane Smith (User)"_
6. ✅ Verify the **"Request Transfer"** button appears in the conflict UI

### 6. Request & Approve Transfer ⭐
1. Still on the conflict screen → Click **Request Transfer** (to Bob Wilson)
2. Go to **Transfers** tab → Verify transfer request appears with status "Requested"
3. Click **Approve** on the transfer
4. ✅ Verify transfer status → "Approved"
5. Go to **Allocations** tab → Verify Jane's allocation is "Returned" and Bob's is "Active"

### 7. Book a Resource → Trigger 409 Overlap ⭐
1. Navigate to **Resource Booking**
2. Select `AF-0002 - Conference Room Projector`
3. Book it: Start = today 2pm, End = today 4pm → **Book**
4. ✅ Verify booking appears with status "Upcoming"
5. **Try booking the same asset** with overlapping time (today 3pm–5pm)
6. ⭐ **409 Conflict**: You should see _"Booking conflicts with existing reservation"_ with the conflicting slot details

### 8. Maintenance Workflow
1. Navigate to **Maintenance**
2. Click **New Request** → Select `AF-0003 - Dell Monitor` → Issue: "Screen flickering" → Priority: High → Submit
3. ✅ Verify request appears with status "Pending"
4. Click **Approve** on the request
5. ⭐ Go to **Asset Registry** → Verify AF-0003 status changed to **"UnderMaintenance"**
6. Back to Maintenance → Resolve the request
7. ✅ Verify AF-0003 status flips back to **"Available"**

### 9. Run an Audit Cycle
1. Navigate to **Asset Audit**
2. Click **New Cycle** → Scope: (leave blank for all) → Set dates → Assign yourself as auditor → **Create**
3. ✅ Verify cycle appears in the list with "Planned" status
4. Click **View** on the cycle
5. ✅ Verify all 3 assets appear in the checklist
6. Mark AF-0001 as **Verified** ✓
7. Mark AF-0002 as **Verified** ✓
8. Mark AF-0003 as **Missing** ✗ (add note: "Not found at expected location")
9. ✅ Verify progress bar updates (3/3 = 100%)
10. Click **Close Cycle**
11. ⭐ Verify the **Discrepancy Report** appears showing AF-0003 as Missing
12. Go to **Asset Registry** → Verify AF-0003 status changed to **"Lost"**

### 10. Check Dashboard & Notifications
1. Navigate to **Dashboard**
2. ✅ Verify KPI cards show updated numbers (Assets Available, Allocated, etc.)
3. If you set an overdue allocation (past expectedReturnDate), verify it shows in the **Overdue** section (red box), NOT in Upcoming
4. Click the **Bell icon** in the top header → Navigate to Activity & Notifications
5. ✅ Verify notifications exist for: allocation, transfer approval, booking, maintenance actions
6. Click **mark as read** on a notification
7. ✅ Verify bell icon badge count decreases

### 11. Activity Logs (Admin only)
1. Navigate to **Activity Logs** → **Activity Log** tab
2. ✅ Verify entries exist with correct user, action, entity type, and timestamp
3. Try filtering by entity type (e.g., "Allocation")
4. ✅ Verify the table updates

### 12. Reports
1. Navigate to **Reports**
2. Click through each report tab:
   - **Asset Utilization** → Should show AF-0001 with allocation count
   - **Maintenance Frequency** → Should show Laptops category with 1 request
   - **Department Summary** → Should show allocation data
   - **Booking Heatmap** → Should show booking data point
   - **Assets Due** → Should show AF-0003 if it's in poor condition
3. Click **Export CSV** → Verify a CSV file downloads

### 13. Full Role Sweep ⭐
Log in as each role and verify the sidebar matches this table:

| Page               | Employee | DeptHead | AssetManager | Admin |
|--------------------|:--------:|:--------:|:------------:|:-----:|
| Dashboard          | ✅       | ✅       | ✅           | ✅    |
| Organization       | ❌       | ❌       | ❌           | ✅    |
| Asset Registry     | ❌       | ❌       | ✅           | ✅    |
| Allocation & Transfer | ✅    | ✅       | ✅           | ✅    |
| Resource Booking   | ✅       | ✅       | ✅           | ✅    |
| Maintenance        | ✅       | ✅       | ✅           | ✅    |
| Asset Audit        | ❌       | ❌       | ✅           | ✅    |
| Reports            | ❌       | ✅       | ✅           | ✅    |
| Activity Logs      | ❌       | ❌       | ❌           | ✅    |

---

## Key Demo Points (Don't Miss These!)

1. **⭐ 409 Allocation Conflict** — The orange conflict box with holder details + transfer button
2. **⭐ 409 Booking Overlap** — The conflict response with existing slot details
3. **⭐ Maintenance Status Flip** — Asset goes to UnderMaintenance on approve, back to Available on resolve
4. **⭐ Audit → Lost Asset** — Close cycle with Missing item → asset.status = Lost
5. **⭐ Dashboard Overdue vs Upcoming** — Visually separated sections, red vs neutral

---

## Troubleshooting

- **No data in Dashboard?** → Create some allocations with expectedReturnDate first
- **Notifications not showing?** → They're created on actions (allocate, approve, etc.) — do some actions first
- **Reports empty?** → You need at least a few allocations/bookings for charts to populate
- **Audit checklist empty?** → Assets must exist that match the cycle's scope (department/location)
