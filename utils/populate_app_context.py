#!/usr/bin/env python3
"""
PubNub App Context Test Data Generator

This script populates PubNub App Context with test users, channels, and memberships
using realistic names, emails, and channel descriptions.

Usage:
    python populate_app_context.py --users 500 --channels 50 --membership-ratio 0.3

Requirements:
    pip install pubnub faker python-dotenv

Environment Variables (create a .env file):
    PUBNUB_PUBLISH_KEY=your_publish_key
    PUBNUB_SUBSCRIBE_KEY=your_subscribe_key
    PUBNUB_SECRET_KEY=your_secret_key  # Optional, for better performance
    PUBNUB_USER_ID=test-data-generator
"""

import os
import sys
import random
import argparse
import asyncio
import time
from typing import List, Dict, Any
from dataclasses import dataclass
from datetime import datetime

try:
    from faker import Faker
    from pubnub.pnconfiguration import PNConfiguration
    from pubnub.pubnub import PubNub
    from pubnub.exceptions import PubNubException
    from pubnub.models.consumer.objects_v2.memberships import PNChannelMembership
    from dotenv import load_dotenv
except ImportError as e:
    print(f"Missing required dependency: {e}")
    print("Please install required packages:")
    print("pip install pubnub faker python-dotenv")
    sys.exit(1)

# Load environment variables
load_dotenv()

fake = Faker()

@dataclass
class TestUser:
    id: str
    name: str
    email: str
    external_id: str
    profile_url: str
    custom: Dict[str, Any]

@dataclass
class TestChannel:
    id: str
    name: str
    description: str
    custom: Dict[str, Any]

class AppContextPopulator:
    def __init__(self, publish_key: str, subscribe_key: str, secret_key: str = None, user_id: str = "test-data-generator"):
        """Initialize PubNub client"""
        config = PNConfiguration()
        config.publish_key = publish_key
        config.subscribe_key = subscribe_key
        config.uuid = user_id
        
        if secret_key:
            config.secret_key = secret_key
            
        # Enable SSL and set origin
        config.ssl = True
        config.origin = "ps.pndsn.com"
        
        self.pubnub = PubNub(config)
        self.created_users = []
        self.created_channels = []
        
    def generate_users(self, count: int) -> List[TestUser]:
        """Generate realistic test users"""
        users = []
        departments = ["Engineering", "Marketing", "Sales", "Support", "Product", "Design", "HR", "Finance"]
        roles = ["Manager", "Developer", "Analyst", "Specialist", "Coordinator", "Director", "Lead"]
        
        for i in range(count):
            first_name = fake.first_name()
            last_name = fake.last_name()
            department = random.choice(departments)
            role = random.choice(roles)
            
            user = TestUser(
                id=f"user_{i+1:05d}_{first_name.lower()}_{last_name.lower()}",
                name=f"{first_name} {last_name}",
                email=f"{first_name.lower()}.{last_name.lower()}@{fake.company().lower().replace(' ', '').replace(',', '').replace('.', '')}.com",
                external_id=f"ext_{fake.uuid4()[:8]}",
                profile_url=f"https://api.dicebear.com/7.x/personas/svg?seed={first_name}{last_name}",
                custom={
                    "department": department,
                    "role": role,
                    "join_date": fake.date_between(start_date='-2y', end_date='today').isoformat(),
                    "timezone": fake.timezone(),
                    "phone": fake.phone_number(),
                    "employee_id": f"EMP{i+1:05d}",
                    "manager": random.choice([True, False]),
                    "status": random.choice(["active", "active", "active", "away", "busy"])  # Weighted toward active
                }
            )
            users.append(user)
        
        return users
    
    def generate_channels(self, count: int) -> List[TestChannel]:
        """Generate realistic test channels"""
        channels = []
        
        # Channel types and themes
        channel_types = [
            ("general", "General discussion and announcements"),
            ("team-", ["engineering", "marketing", "sales", "support", "product", "design", "hr", "finance"]),
            ("project-", ["alpha", "beta", "gamma", "phoenix", "titan", "nova", "quantum", "nexus"]),
            ("topic-", ["random", "tech-talk", "coffee-chat", "book-club", "fitness", "gaming", "music"]),
            ("location-", ["nyc", "sf", "london", "tokyo", "berlin", "sydney", "toronto", "austin"]),
            ("event-", ["all-hands", "standup", "retrospective", "planning", "demo", "social"]),
            ("help-", ["it-support", "hr-questions", "facilities", "security", "onboarding"]),
            ("announcement-", ["company", "product", "engineering", "security", "policy"])
        ]
        
        for i in range(count):
            if i == 0:
                # First channel is always general
                channel = TestChannel(
                    id="general",
                    name="General",
                    description="Company-wide general discussion and announcements",
                    custom={
                        "type": "general",
                        "visibility": "public",
                        "created_date": fake.date_between(start_date='-1y', end_date='-6m').isoformat(),
                        "max_members": 1000,
                        "moderated": True,
                        "category": "Company"
                    }
                )
            else:
                # Generate other channels
                channel_type = random.choice(channel_types)
                
                if channel_type[0] == "general":
                    channel_id = "general-2"
                    name = "General Chat"
                    description = channel_type[1]
                elif isinstance(channel_type[1], list):
                    suffix = random.choice(channel_type[1])
                    channel_id = f"{channel_type[0]}{suffix}"
                    name = suffix.replace('-', ' ').title()
                    
                    # Generate contextual descriptions
                    if "team-" in channel_type[0]:
                        description = f"Team channel for {name} department discussions and updates"
                    elif "project-" in channel_type[0]:
                        description = f"Project channel for {name} initiative coordination and updates"
                    elif "topic-" in channel_type[0]:
                        description = f"Topic-based discussion channel for {name.lower()}"
                    elif "location-" in channel_type[0]:
                        description = f"Location-based channel for {name} office discussions"
                    elif "event-" in channel_type[0]:
                        description = f"Event coordination channel for {name.lower()} meetings"
                    elif "help-" in channel_type[0]:
                        description = f"Support channel for {name.lower()} related questions and assistance"
                    else:
                        description = f"Announcement channel for {name.lower()} updates and notifications"
                else:
                    channel_id = f"channel_{i:03d}"
                    name = fake.catch_phrase()
                    description = fake.text(max_nb_chars=100)
                
                visibility = random.choice(["public", "public", "private"])  # Weighted toward public
                category = random.choice(["Work", "Social", "Project", "Team", "General", "Support"])
                
                channel = TestChannel(
                    id=channel_id,
                    name=name,
                    description=description,
                    custom={
                        "type": channel_type[0].rstrip('-'),
                        "visibility": visibility,
                        "created_date": fake.date_between(start_date='-1y', end_date='today').isoformat(),
                        "max_members": random.choice([50, 100, 200, 500, 1000]),
                        "moderated": random.choice([True, False]),
                        "category": category,
                        "archive_after_days": random.choice([30, 60, 90, 365, None])
                    }
                )
            
            channels.append(channel)
        
        return channels
    
    async def create_users(self, users: List[TestUser], batch_size: int = 10) -> None:
        """Create users in PubNub App Context"""
        print(f"Creating {len(users)} users...")
        
        for i in range(0, len(users), batch_size):
            batch = users[i:i + batch_size]
            
            for user in batch:
                try:
                    envelope = self.pubnub.set_uuid_metadata()\
                        .uuid(user.id)\
                        .set_name(user.name)\
                        .email(user.email)\
                        .external_id(user.external_id)\
                        .profile_url(user.profile_url)\
                        .custom(user.custom)\
                        .sync()
                    
                    if envelope.status.is_error():
                        print(f"Error creating user {user.id}: {envelope.status.error_message}")
                    else:
                        self.created_users.append(user.id)
                        
                except PubNubException as e:
                    print(f"Exception creating user {user.id}: {str(e)}")
            
            # Progress update
            created_count = min(i + batch_size, len(users))
            print(f"Created {created_count}/{len(users)} users ({(created_count/len(users)*100):.1f}%)")
            
            # Small delay to avoid rate limiting
            if i + batch_size < len(users):
                await asyncio.sleep(0.1)
    
    async def create_channels(self, channels: List[TestChannel], batch_size: int = 10) -> None:
        """Create channels in PubNub App Context"""
        print(f"Creating {len(channels)} channels...")
        
        for i in range(0, len(channels), batch_size):
            batch = channels[i:i + batch_size]
            
            for channel in batch:
                try:
                    envelope = self.pubnub.set_channel_metadata()\
                        .channel(channel.id)\
                        .set_name(channel.name)\
                        .description(channel.description)\
                        .custom(channel.custom)\
                        .sync()
                    
                    if envelope.status.is_error():
                        print(f"Error creating channel {channel.id}: {envelope.status.error_message}")
                    else:
                        self.created_channels.append(channel.id)
                        
                except PubNubException as e:
                    print(f"Exception creating channel {channel.id}: {str(e)}")
            
            # Progress update
            created_count = min(i + batch_size, len(channels))
            print(f"Created {created_count}/{len(channels)} channels ({(created_count/len(channels)*100):.1f}%)")
            
            # Small delay to avoid rate limiting
            if i + batch_size < len(channels):
                await asyncio.sleep(0.1)
    
    async def create_memberships(self, users: List[str], channels: List[str], membership_ratio: float = 0.3, batch_size: int = 5) -> None:
        """Create random memberships between users and channels"""
        total_possible = len(users) * len(channels)
        target_memberships = int(total_possible * membership_ratio)
        
        print(f"Creating approximately {target_memberships} memberships (ratio: {membership_ratio})...")
        
        # Ensure every user is in at least one channel (general if it exists, or random)
        guaranteed_channel = "general" if "general" in channels else random.choice(channels)
        membership_count = 0
        
        # First, add all users to a common channel
        for i, user_id in enumerate(users):
            try:
                # Custom membership data
                membership_custom = {
                    "joined_date": fake.date_between(start_date='-6m', end_date='today').isoformat(),
                    "role": random.choice(["member", "member", "moderator", "admin"]),  # Weighted toward member
                    "notifications": random.choice([True, False]),
                    "last_read": fake.date_time_between(start_date='-30d', end_date='now').isoformat()
                }
                
                result = self.pubnub.set_memberships()\
                    .uuid(user_id)\
                    .channel_memberships([PNChannelMembership.channel_with_custom(guaranteed_channel, membership_custom)])\
                    .sync()
                
                if not result.status.is_error():
                    membership_count += 1
                
                if i % 50 == 0:
                    print(f"Guaranteed memberships: {i+1}/{len(users)}")
                    
            except PubNubException as e:
                print(f"Exception creating guaranteed membership for {user_id}: {str(e)}")
            
            # Small delay
            if i % batch_size == 0:
                await asyncio.sleep(0.05)
        
        # Then create additional random memberships
        additional_needed = target_memberships - membership_count
        created_additional = 0
        
        while created_additional < additional_needed:
            # Create batch of random memberships
            batch_memberships = []
            
            for _ in range(min(batch_size, additional_needed - created_additional)):
                user_id = random.choice(users)
                channel_id = random.choice(channels)
                
                # Skip if this would be a duplicate of guaranteed membership
                if channel_id == guaranteed_channel:
                    continue
                
                membership_custom = {
                    "joined_date": fake.date_between(start_date='-6m', end_date='today').isoformat(),
                    "role": random.choice(["member", "member", "member", "moderator"]),  # Weighted toward member
                    "notifications": random.choice([True, False]),
                    "last_read": fake.date_time_between(start_date='-30d', end_date='now').isoformat()
                }
                
                batch_memberships.append((user_id, channel_id, membership_custom))
            
            # Execute batch
            for user_id, channel_id, custom_data in batch_memberships:
                try:
                    result = self.pubnub.set_memberships()\
                        .uuid(user_id)\
                        .channel_memberships([PNChannelMembership.channel_with_custom(channel_id, custom_data)])\
                        .sync()
                    
                    if not result.status.is_error():
                        created_additional += 1
                        membership_count += 1
                        
                except PubNubException as e:
                    # Skip errors (likely duplicates)
                    pass
            
            # Progress update
            if created_additional % 100 == 0 or created_additional >= additional_needed:
                total_created = membership_count
                print(f"Created {total_created} total memberships ({(total_created/target_memberships*100):.1f}% of target)")
            
            await asyncio.sleep(0.1)
        
        print(f"✅ Membership creation complete! Created {membership_count} total memberships")
    
    def cleanup_on_error(self):
        """Clean up created data if script fails"""
        print("Cleaning up created data due to error...")
        
        # Delete created users
        for user_id in self.created_users:
            try:
                self.pubnub.remove_uuid_metadata().uuid(user_id).sync()
            except:
                pass
        
        # Delete created channels
        for channel_id in self.created_channels:
            try:
                self.pubnub.remove_channel_metadata().channel(channel_id).sync()
            except:
                pass

async def main():
    parser = argparse.ArgumentParser(description="Populate PubNub App Context with test data")
    parser.add_argument("--users", "-u", type=int, default=100, help="Number of users to create (default: 100)")
    parser.add_argument("--channels", "-c", type=int, default=20, help="Number of channels to create (default: 20)")
    parser.add_argument("--membership-ratio", "-m", type=float, default=0.3, help="Ratio of total possible memberships to create (default: 0.3)")
    parser.add_argument("--batch-size", "-b", type=int, default=10, help="Batch size for API calls (default: 10)")
    parser.add_argument("--dry-run", action="store_true", help="Generate data but don't create in PubNub")
    
    args = parser.parse_args()
    
    # Validate environment variables
    publish_key = os.getenv("PUBNUB_PUBLISH_KEY")
    subscribe_key = os.getenv("PUBNUB_SUBSCRIBE_KEY")
    secret_key = os.getenv("PUBNUB_SECRET_KEY")
    user_id = os.getenv("PUBNUB_USER_ID", "test-data-generator")
    
    if not publish_key or not subscribe_key:
        print("❌ Error: PUBNUB_PUBLISH_KEY and PUBNUB_SUBSCRIBE_KEY environment variables are required")
        print("Create a .env file with your PubNub keys:")
        print("PUBNUB_PUBLISH_KEY=your_publish_key")
        print("PUBNUB_SUBSCRIBE_KEY=your_subscribe_key")
        print("PUBNUB_SECRET_KEY=your_secret_key  # Optional")
        print("PUBNUB_USER_ID=test-data-generator  # Optional")
        sys.exit(1)
    
    print("🚀 PubNub App Context Test Data Generator")
    print(f"📊 Configuration:")
    print(f"   Users: {args.users}")
    print(f"   Channels: {args.channels}")
    print(f"   Membership Ratio: {args.membership_ratio}")
    print(f"   Batch Size: {args.batch_size}")
    print(f"   Dry Run: {args.dry_run}")
    print()
    
    if args.dry_run:
        print("🔍 DRY RUN MODE - No data will be created in PubNub")
    else:
        print("⚠️  This will create real data in your PubNub App Context!")
        response = input("Continue? (y/N): ")
        if response.lower() != 'y':
            print("Cancelled.")
            sys.exit(0)
    
    try:
        # Initialize populator
        if not args.dry_run:
            populator = AppContextPopulator(publish_key, subscribe_key, secret_key, user_id)
        
        # Generate data
        print("\n📝 Generating test data...")
        start_time = time.time()
        
        # For dry run, we still need to generate data structures for display
        if args.dry_run:
            fake_populator = AppContextPopulator("dummy", "dummy", None, "dummy")
            users = fake_populator.generate_users(args.users)
            channels = fake_populator.generate_channels(args.channels)
        else:
            users = populator.generate_users(args.users)
            channels = populator.generate_channels(args.channels)
        
        generation_time = time.time() - start_time
        print(f"✅ Generated test data in {generation_time:.2f} seconds")
        
        if args.dry_run:
            print(f"Would create {args.users} users and {args.channels} channels")
            print(f"Would create approximately {int(args.users * args.channels * args.membership_ratio)} memberships")
            return
        
        # Create data in PubNub
        print("\n🔨 Creating data in PubNub App Context...")
        creation_start = time.time()
        
        try:
            # Create users
            await populator.create_users(users, args.batch_size)
            
            # Create channels
            await populator.create_channels(channels, args.batch_size)
            
            # Create memberships
            user_ids = [user.id for user in users]
            channel_ids = [channel.id for channel in channels]
            await populator.create_memberships(user_ids, channel_ids, args.membership_ratio, args.batch_size)
            
            creation_time = time.time() - creation_start
            total_time = time.time() - start_time
            
            print(f"\n🎉 Success! Created test data in {creation_time:.2f} seconds")
            print(f"📈 Summary:")
            print(f"   ✅ Users: {len(populator.created_users)}/{args.users}")
            print(f"   ✅ Channels: {len(populator.created_channels)}/{args.channels}")
            print(f"   ✅ Estimated Memberships: ~{int(args.users * args.channels * args.membership_ratio)}")
            print(f"   ⏱️  Total Time: {total_time:.2f} seconds")
            print(f"\n🔗 You can now test the App Context page with this data!")
            
        except KeyboardInterrupt:
            print("\n⚠️  Script interrupted by user")
            populator.cleanup_on_error()
            sys.exit(1)
        except Exception as e:
            print(f"\n❌ Error during creation: {str(e)}")
            populator.cleanup_on_error()
            raise
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())