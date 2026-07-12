require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { 
  User, Department, AssetCategory, Asset, Allocation, 
  Booking, MaintenanceRequest, AuditCycle, Notification, ActivityLog 
} = require('./models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/assetflow';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Wipe existing data
    await Promise.all([
      User.deleteMany({}),
      Department.deleteMany({}),
      AssetCategory.deleteMany({}),
      Asset.deleteMany({}),
      Allocation.deleteMany({}),
      Booking.deleteMany({}),
      MaintenanceRequest.deleteMany({}),
      AuditCycle.deleteMany({}),
      Notification.deleteMany({}),
      ActivityLog.deleteMany({})
    ]);

    const passwordHash = await bcrypt.hash('Admin123!', 12);
    const empPasswordHash = await bcrypt.hash('Password123!', 12);

    // 1. Create Users
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@assetflow.com',
      passwordHash,
      role: 'Admin',
      status: 'Active'
    });

    const employees = await User.insertMany([
      { name: 'Alice Smith', email: 'alice@assetflow.com', passwordHash: empPasswordHash, role: 'DeptHead', status: 'Active' },
      { name: 'Bob Jones', email: 'bob@assetflow.com', passwordHash: empPasswordHash, role: 'DeptHead', status: 'Active' },
      { name: 'Carol Davis', email: 'carol@assetflow.com', passwordHash: empPasswordHash, role: 'DeptHead', status: 'Active' },
      { name: 'Dave Wilson', email: 'dave@assetflow.com', passwordHash: empPasswordHash, role: 'AssetManager', status: 'Active' },
      { name: 'Eve Brown', email: 'eve@assetflow.com', passwordHash: empPasswordHash, role: 'AssetManager', status: 'Active' },
      { name: 'Frank Miller', email: 'frank@assetflow.com', passwordHash: empPasswordHash, role: 'Employee', status: 'Active' },
      { name: 'Grace Lee', email: 'grace@assetflow.com', passwordHash: empPasswordHash, role: 'Employee', status: 'Active' },
      { name: 'Henry Ford', email: 'henry@assetflow.com', passwordHash: empPasswordHash, role: 'Employee', status: 'Active' }
    ]);

    // 2. Create Departments
    const depts = await Department.insertMany([
      { name: 'Engineering', code: 'ENG', headUserId: employees[0]._id }, // Alice
      { name: 'Operations', code: 'OPS', headUserId: employees[1]._id },   // Bob
      { name: 'Sales', code: 'SAL', headUserId: employees[2]._id }         // Carol
    ]);

    // 3. Create Categories
    const categories = await AssetCategory.insertMany([
      { name: 'Electronics', description: 'Laptops, monitors, etc', customFields: [{ key: 'ram', label: 'RAM', type: 'Text' }, { key: 'cpu', label: 'CPU', type: 'Text' }] },
      { name: 'Furniture', description: 'Desks, chairs', customFields: [{ key: 'material', label: 'Material', type: 'Text' }] },
      { name: 'Vehicles', description: 'Company cars', customFields: [{ key: 'license_plate', label: 'License Plate', type: 'Text' }, { key: 'vin', label: 'VIN', type: 'Text' }] },
      { name: 'Meeting Rooms', description: 'Bookable spaces', customFields: [{ key: 'capacity', label: 'Capacity', type: 'Number' }] }
    ]);

    // 4. Create Assets (18-20)
    // We'll manually insert one by one so `pre('save')` generates `assetTag` correctly.
    const assetData = [
      // Electronics - Available
      { name: 'MacBook Pro M2', categoryId: categories[0]._id, departmentId: depts[0]._id, condition: 'New', location: 'HQ', status: 'Available' },
      { name: 'Dell XPS 15', categoryId: categories[0]._id, departmentId: depts[0]._id, condition: 'Good', location: 'HQ', status: 'Available' },
      { name: 'ThinkPad T14', categoryId: categories[0]._id, departmentId: depts[1]._id, condition: 'Good', location: 'HQ', status: 'Available' },
      { name: 'LG 27" Monitor', categoryId: categories[0]._id, departmentId: depts[0]._id, condition: 'Good', location: 'HQ', status: 'Available' },
      { name: 'LG 27" Monitor', categoryId: categories[0]._id, departmentId: depts[0]._id, condition: 'Good', location: 'HQ', status: 'Available' },
      
      // Furniture - Available
      { name: 'Ergo Chair', categoryId: categories[1]._id, departmentId: depts[0]._id, condition: 'Good', location: 'Floor 2', status: 'Available' },
      { name: 'Standing Desk', categoryId: categories[1]._id, departmentId: depts[1]._id, condition: 'Good', location: 'Floor 2', status: 'Available' },
      { name: 'Whiteboard', categoryId: categories[1]._id, departmentId: depts[2]._id, condition: 'Good', location: 'Floor 3', status: 'Available' },
      
      // Vehicles - Available
      { name: 'Toyota Prius', categoryId: categories[2]._id, condition: 'Good', location: 'Garage', status: 'Available' },
      { name: 'Ford Transit', categoryId: categories[2]._id, condition: 'Good', location: 'Garage', status: 'Available' },

      // Allocated (5)
      { name: 'MacBook Air M1', categoryId: categories[0]._id, condition: 'Good', location: 'Remote', status: 'Allocated' },
      { name: 'iPad Pro', categoryId: categories[0]._id, condition: 'New', location: 'Remote', status: 'Allocated' },
      { name: 'Ergo Chair', categoryId: categories[1]._id, condition: 'Good', location: 'Remote', status: 'Allocated' },
      { name: 'Company iPhone', categoryId: categories[0]._id, condition: 'Fair', location: 'Remote', status: 'Allocated' },
      { name: 'Honda Civic', categoryId: categories[2]._id, condition: 'Good', location: 'Field', status: 'Allocated' },

      // UnderMaintenance (2)
      { name: 'Server Rack A', categoryId: categories[0]._id, condition: 'Poor', location: 'Server Room', status: 'UnderMaintenance' },
      { name: 'Delivery Van', categoryId: categories[2]._id, condition: 'Damaged', location: 'Garage', status: 'UnderMaintenance' },

      // Lost (1)
      { name: 'Projector Portable', categoryId: categories[0]._id, condition: 'Poor', location: 'Unknown', status: 'Lost' },

      // Bookable (3)
      { name: 'Conference Room Alpha', categoryId: categories[3]._id, condition: 'Good', location: 'Floor 1', status: 'Available', isBookable: true },
      { name: 'Conference Room Beta', categoryId: categories[3]._id, condition: 'Good', location: 'Floor 1', status: 'Available', isBookable: true },
      { name: '4K Projector', categoryId: categories[0]._id, condition: 'New', location: 'Storage', status: 'Available', isBookable: true }
    ];

    const assets = [];
    for (const d of assetData) {
      const a = new Asset(d);
      await a.save();
      assets.push(a);
    }

    // 5. Create Allocations (5 active, some overdue)
    const now = new Date();
    const pastDate = new Date(now);
    pastDate.setDate(now.getDate() - 5); // 5 days overdue

    const futureDate = new Date(now);
    futureDate.setDate(now.getDate() + 10);

    const allocs = await Allocation.insertMany([
      { assetId: assets[10]._id, holderType: 'User', holderId: employees[5]._id, expectedReturnDate: futureDate, status: 'Active' },
      { assetId: assets[11]._id, holderType: 'User', holderId: employees[6]._id, expectedReturnDate: pastDate, status: 'Active' }, // Overdue
      { assetId: assets[12]._id, holderType: 'User', holderId: employees[7]._id, expectedReturnDate: futureDate, status: 'Active' },
      { assetId: assets[13]._id, holderType: 'User', holderId: employees[5]._id, expectedReturnDate: pastDate, status: 'Active' }, // Overdue
      { assetId: assets[14]._id, holderType: 'Department', holderId: depts[2]._id, expectedReturnDate: futureDate, status: 'Active' },
    ]);

    // 6. Create Maintenance Requests (2 active)
    const mreqs = await MaintenanceRequest.insertMany([
      { assetId: assets[15]._id, raisedBy: employees[3]._id, issue: 'Power supply failure', priority: 'High', status: 'InProgress' },
      { assetId: assets[16]._id, raisedBy: employees[4]._id, issue: 'Dent on side panel', priority: 'Medium', status: 'Pending' }
    ]);

    // 7. Create Bookings
    const today = new Date();
    today.setHours(10, 0, 0, 0); // 10 AM today
    
    const b1Start = new Date(today);
    const b1End = new Date(today); b1End.setHours(11, 0, 0, 0);
    
    const b2Start = new Date(today); b2Start.setHours(11, 0, 0, 0); // Back-to-back
    const b2End = new Date(today); b2End.setHours(12, 0, 0, 0);

    const b3Start = new Date(today); b3Start.setHours(14, 0, 0, 0); // Leaves 12-2 PM open for demo
    const b3End = new Date(today); b3End.setHours(15, 0, 0, 0);

    await Booking.insertMany([
      { assetId: assets[18]._id, bookedBy: employees[5]._id, startTime: b1Start, endTime: b1End, status: 'Upcoming' },
      { assetId: assets[18]._id, bookedBy: employees[6]._id, startTime: b2Start, endTime: b2End, status: 'Upcoming' },
      { assetId: assets[18]._id, bookedBy: employees[7]._id, startTime: b3Start, endTime: b3End, status: 'Upcoming' },
      { assetId: assets[19]._id, bookedBy: employees[5]._id, startTime: b1Start, endTime: b3End, status: 'Upcoming' }
    ]);

    // 8. Create closed AuditCycle
    const auditStart = new Date(); auditStart.setDate(auditStart.getDate() - 7);
    const auditEnd = new Date(); auditEnd.setDate(auditEnd.getDate() - 1);
    
    await AuditCycle.create({
      scope: { department: depts[0]._id },
      dateRange: { start: auditStart, end: auditEnd },
      auditors: [employees[3]._id],
      status: 'Closed',
      items: [
        { assetId: assets[17]._id, result: 'Missing', notes: 'Not found during sweep' }, // The Lost one
        { assetId: assets[16]._id, result: 'Damaged', notes: 'Dented side' }
      ],
      discrepancyReport: [
        { assetId: assets[17]._id, result: 'Missing', notes: 'Not found during sweep' },
        { assetId: assets[16]._id, result: 'Damaged', notes: 'Dented side' }
      ]
    });

    // 9. Activity Logs & Notifications
    await ActivityLog.insertMany([
      { userId: employees[3]._id, action: 'Created Allocation', entityType: 'Allocation', entityId: allocs[0]._id },
      { userId: employees[4]._id, action: 'Created Maintenance Request', entityType: 'MaintenanceRequest', entityId: mreqs[0]._id }
    ]);

    await Notification.insertMany([
      { userId: admin._id, type: 'audit', message: 'Audit cycle closed with 2 discrepancies (1 missing)' },
      { userId: admin._id, type: 'maintenance', message: 'Maintenance requested for Delivery Van' }
    ]);

    console.log('\n--- Seed Complete ---');
    console.log('Database wiped and populated with realistic demo data.');
    console.log('\nDemo Accounts (Password: Password123! except Admin):');
    console.log('- Admin: admin@assetflow.com (Admin123!)');
    console.log('- Asset Manager: dave@assetflow.com');
    console.log('- Dept Head: alice@assetflow.com');
    console.log('- Employee: frank@assetflow.com');
    console.log('\nCheck the dashboard for active KPIs, overdue items, and recent activity!');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
