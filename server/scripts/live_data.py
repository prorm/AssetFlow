"""
AssetFlow Live Data Simulator
Reads MONGO_URI from server/.env, loops every 30-45s:
  - Randomly flips 1-2 Available assets to UnderMaintenance and back
  - Nudges expectedReturnDate / booking times to trigger overdue flags
Purely for demo visuals — safe to stop anytime.
"""

import os
import sys
import time
import random
from datetime import datetime, timedelta, timezone

try:
    from pymongo import MongoClient
    from dotenv import load_dotenv
except ImportError:
    print("Install dependencies: pip install pymongo python-dotenv")
    sys.exit(1)

# Load .env from server directory
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(env_path)

MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/assetflow')


def main():
    client = MongoClient(MONGO_URI)
    try:
        db = client.get_default_database()
    except Exception:
        db = client['assetflow']

    print(f"✅ Connected to MongoDB: {MONGO_URI}")

    # ── Startup Diagnostics ──
    asset_count = db.assets.count_documents({})
    alloc_count = db.allocations.count_documents({'status': 'Active'})
    booking_count = db.bookings.count_documents({})
    available_count = db.assets.count_documents({'status': 'Available'})
    maint_count = db.assets.count_documents({'status': 'UnderMaintenance'})
    print(f"📊 DB Snapshot: {asset_count} total assets ({available_count} available, {maint_count} maintenance)")
    print(f"   Active allocations: {alloc_count} | Bookings: {booking_count}")

    if asset_count == 0:
        print("⚠️  No assets found in the database! Run 'node scripts/seed.js' first.")
        return

    print("🔄 Live data simulator running... Press Ctrl+C to stop.\n")

    cycle = 0
    while True:
        cycle += 1
        now_str = datetime.now().strftime('%H:%M:%S')
        flipped_to_maint = 0
        flipped_to_avail = 0
        nudged_allocs = 0
        nudged_bookings = 0

        try:
            # 1. Flip 1-2 Available assets to UnderMaintenance
            available = list(db.assets.find({'status': 'Available'}).limit(10))
            if available:
                to_flip = random.sample(available, min(random.randint(1, 2), len(available)))
                for asset in to_flip:
                    db.assets.update_one(
                        {'_id': asset['_id']},
                        {'$set': {'status': 'UnderMaintenance'}}
                    )
                    flipped_to_maint += 1

            # 2. Flip 1-2 UnderMaintenance assets back to Available
            under_maint = list(db.assets.find({'status': 'UnderMaintenance'}).limit(10))
            if under_maint:
                to_restore = random.sample(under_maint, min(random.randint(1, 2), len(under_maint)))
                for asset in to_restore:
                    db.assets.update_one(
                        {'_id': asset['_id']},
                        {'$set': {'status': 'Available'}}
                    )
                    flipped_to_avail += 1

            # 3. Nudge a couple expectedReturnDate values to create overdue flags
            active_allocs = list(db.allocations.find({
                'status': 'Active',
                'expectedReturnDate': {'$gt': datetime.now(timezone.utc)}
            }).limit(5))
            if active_allocs:
                to_nudge = random.sample(active_allocs, min(random.randint(1, 2), len(active_allocs)))
                for alloc in to_nudge:
                    past_date = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 5))
                    db.allocations.update_one(
                        {'_id': alloc['_id']},
                        {'$set': {'expectedReturnDate': past_date}}
                    )
                    nudged_allocs += 1

            # 4. Nudge a booking time to the past for demo
            upcoming_bookings = list(db.bookings.find({
                'status': 'Upcoming',
                'startTime': {'$gt': datetime.now(timezone.utc)}
            }).limit(3))
            if upcoming_bookings:
                booking = random.choice(upcoming_bookings)
                past_start = datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 24))
                past_end = past_start + timedelta(hours=2)
                db.bookings.update_one(
                    {'_id': booking['_id']},
                    {'$set': {'startTime': past_start, 'endTime': past_end}}
                )
                nudged_bookings += 1

        except Exception as e:
            print(f"  ⚠ Error: {e}")

        # Print cycle summary
        changes = []
        if flipped_to_maint: changes.append(f"🔧 {flipped_to_maint} → Maintenance")
        if flipped_to_avail: changes.append(f"✅ {flipped_to_avail} → Available")
        if nudged_allocs: changes.append(f"⏰ {nudged_allocs} → Overdue")
        if nudged_bookings: changes.append(f"📅 {nudged_bookings} booking shifted")

        summary = " | ".join(changes) if changes else "💤 No changes (pool exhausted)"

        sleep_time = random.randint(30, 45)
        print(f"── Cycle {cycle} @ {now_str} ──  {summary}  (next in {sleep_time}s)")
        time.sleep(sleep_time)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Simulator stopped.")
