#!/usr/bin/env python3
"""
PubNub Test Message Publisher

This script publishes a specified number of realistic JSON messages to a PubNub channel.
Messages vary in structure and size (100 bytes to 25KB) using fake data across 12 message types.
Supports metadata inclusion and specific message type targeting.

Usage:
    python publish_test_messages.py <publish_key> <subscribe_key> <channel_name> <message_count> [options]

Examples:
    # Random message types
    python publish_test_messages.py pub-c-abc123 sub-c-def456 test-channel 100
    
    # Specific message type with metadata
    python publish_test_messages.py pub-c-abc123 sub-c-def456 chat-room 50 --type chat_message --meta

Requirements:
    pip install pubnub faker
"""

import argparse
import asyncio
import json
import random
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List

try:
    from pubnub.pnconfiguration import PNConfiguration
    from pubnub.pubnub import PubNub
    from faker import Faker
except ImportError as e:
    print(f"Missing required dependency: {e}")
    print("Please install dependencies: pip install pubnub faker")
    sys.exit(1)


class MessageGenerator:
    """Generates various types of realistic fake messages in JSON format."""
    
    def __init__(self, locale='en_US'):
        self.fake = Faker(locale)
        self.message_templates = {
            'user_profile': self._generate_user_profile,
            'chat_message': self._generate_chat_message,
            'transaction': self._generate_transaction,
            'system_event': self._generate_system_event,
            'product': self._generate_product_data,
            'sensor_reading': self._generate_sensor_reading,
            'social_post': self._generate_social_post,
            'notification': self._generate_notification,
            'analytics_event': self._generate_analytics_event,
            'support_ticket': self._generate_support_ticket,
            'order': self._generate_order_data,
            'log_entry': self._generate_log_entry,
        }
        
        # Define relevant metadata for each message type
        self.meta_templates = {
            'user_profile': {
                'source': 'user_registration_system',
                'validation_status': lambda: random.choice(['verified', 'pending', 'unverified']),
                'data_completeness': lambda: f"{random.randint(60, 100)}%"
            },
            'chat_message': {
                'moderation_status': lambda: random.choice(['approved', 'pending', 'flagged']),
                'sentiment_score': lambda: round(random.uniform(-1.0, 1.0), 2),
                'language_detected': lambda: random.choice(['en', 'es', 'fr', 'de', 'pt'])
            },
            'transaction': {
                'risk_level': lambda: random.choice(['low', 'medium', 'high']),
                'fraud_score': lambda: round(random.uniform(0, 100), 1),
                'processing_region': lambda: random.choice(['us-east', 'us-west', 'eu-central', 'ap-southeast'])
            },
            'system_event': {
                'alert_severity': lambda: random.choice(['info', 'warning', 'error', 'critical']),
                'auto_resolve': lambda: random.choice([True, False]),
                'escalation_level': lambda: random.randint(0, 3)
            },
            'product': {
                'inventory_status': lambda: random.choice(['in_stock', 'low_stock', 'out_of_stock']),
                'promotion_eligible': lambda: random.choice([True, False]),
                'popularity_rank': lambda: random.randint(1, 1000)
            },
            'sensor_reading': {
                'data_quality': lambda: random.choice(['excellent', 'good', 'fair', 'poor']),
                'anomaly_detected': lambda: random.choice([True, False]),
                'calibration_due': lambda: random.choice([True, False])
            },
            'social_post': {
                'virality_score': lambda: round(random.uniform(0, 10), 1),
                'content_safety': lambda: random.choice(['safe', 'sensitive', 'inappropriate']),
                'trending_potential': lambda: random.choice(['low', 'medium', 'high'])
            },
            'notification': {
                'delivery_priority': lambda: random.choice(['low', 'normal', 'high', 'urgent']),
                'personalization_level': lambda: random.choice(['generic', 'targeted', 'personalized']),
                'a_b_test_variant': lambda: random.choice(['A', 'B', 'C', 'control'])
            },
            'analytics_event': {
                'data_freshness': lambda: random.choice(['real_time', 'near_real_time', 'batch']),
                'attribution_model': lambda: random.choice(['first_click', 'last_click', 'multi_touch']),
                'conversion_value': lambda: round(random.uniform(0, 500), 2)
            },
            'support_ticket': {
                'escalation_risk': lambda: random.choice(['low', 'medium', 'high']),
                'customer_satisfaction_predicted': lambda: round(random.uniform(1, 5), 1),
                'resolution_complexity': lambda: random.choice(['simple', 'moderate', 'complex'])
            },
            'order': {
                'fulfillment_priority': lambda: random.choice(['standard', 'expedited', 'priority']),
                'shipping_risk': lambda: random.choice(['low', 'medium', 'high']),
                'customer_tier': lambda: random.choice(['bronze', 'silver', 'gold', 'platinum'])
            },
            'log_entry': {
                'log_level_numeric': lambda: random.choice([10, 20, 30, 40, 50]),  # DEBUG, INFO, WARN, ERROR, FATAL
                'trace_sampling': lambda: random.choice([True, False]),
                'performance_impact': lambda: random.choice(['none', 'low', 'medium', 'high'])
            }
        }
    
    def generate_message(self, target_size: int = None, message_type: str = None, include_meta: bool = False) -> Dict[str, Any]:
        """Generate a message, optionally targeting a specific size and type."""
        if message_type and message_type in self.message_templates:
            template = self.message_templates[message_type]
            msg_type = message_type
        else:
            msg_type = random.choice(list(self.message_templates.keys()))
            template = self.message_templates[msg_type]
        
        message = template()
        
        # Add metadata if requested
        if include_meta and msg_type in self.meta_templates:
            meta_template = self.meta_templates[msg_type]
            message['meta'] = {}
            for key, value_generator in meta_template.items():
                if callable(value_generator):
                    message['meta'][key] = value_generator()
                else:
                    message['meta'][key] = value_generator
        
        # If target size specified, pad or trim the message
        if target_size:
            message = self._adjust_message_size(message, target_size)
            
        return message
    
    def get_available_types(self) -> List[str]:
        """Get list of available message types."""
        return list(self.message_templates.keys())
    
    def _adjust_message_size(self, message: Dict[str, Any], target_size: int) -> Dict[str, Any]:
        """Adjust message size to approximately match target size."""
        current_size = len(json.dumps(message, separators=(',', ':')))
        
        if current_size < target_size:
            # Pad with additional content
            padding_needed = target_size - current_size - 50  # Leave some buffer
            if padding_needed > 0:
                message['padding_content'] = self.fake.text(max_nb_chars=padding_needed)
        elif current_size > target_size:
            # Try to trim content
            if 'description' in message and len(message['description']) > 100:
                trim_amount = min(len(message['description']) - 100, current_size - target_size)
                message['description'] = message['description'][:-trim_amount]
            elif 'content' in message and len(message['content']) > 100:
                trim_amount = min(len(message['content']) - 100, current_size - target_size)
                message['content'] = message['content'][:-trim_amount]
                
        return message
    
    def _generate_user_profile(self) -> Dict[str, Any]:
        """Generate a user profile message."""
        return {
            "type": "user_profile",
            "user_id": self.fake.uuid4(),
            "username": self.fake.user_name(),
            "email": self.fake.email(),
            "full_name": self.fake.name(),
            "bio": self.fake.text(max_nb_chars=200),
            "location": {
                "city": self.fake.city(),
                "country": self.fake.country(),
                "coordinates": {
                    "lat": float(self.fake.latitude()),
                    "lng": float(self.fake.longitude())
                }
            },
            "preferences": {
                "theme": random.choice(["light", "dark", "auto"]),
                "language": self.fake.language_code(),
                "notifications": random.choice([True, False]),
                "privacy_level": random.choice(["public", "friends", "private"])
            },
            "created_at": self.fake.date_time_between(start_date="-2y").isoformat(),
            "last_active": self.fake.date_time_between(start_date="-30d").isoformat()
        }
    
    def _generate_chat_message(self) -> Dict[str, Any]:
        """Generate a chat message."""
        return {
            "type": "chat_message",
            "message_id": self.fake.uuid4(),
            "user_id": self.fake.uuid4(),
            "username": self.fake.user_name(),
            "content": self.fake.text(max_nb_chars=random.randint(10, 500)),
            "channel": f"#{self.fake.word()}",
            "timestamp": datetime.now().isoformat(),
            "thread_id": self.fake.uuid4() if random.choice([True, False]) else None,
            "mentions": [self.fake.user_name() for _ in range(random.randint(0, 3))],
            "attachments": [
                {
                    "type": "image",
                    "url": self.fake.image_url(),
                    "filename": f"{self.fake.word()}.jpg"
                }
            ] if random.choice([True, False]) else [],
            "reactions": {
                "👍": random.randint(0, 20),
                "❤️": random.randint(0, 15),
                "😂": random.randint(0, 10)
            }
        }
    
    def _generate_transaction(self) -> Dict[str, Any]:
        """Generate a financial transaction message."""
        return {
            "type": "transaction",
            "transaction_id": self.fake.uuid4(),
            "user_id": self.fake.uuid4(),
            "amount": round(random.uniform(1.00, 10000.00), 2),
            "currency": self.fake.currency_code(),
            "merchant": {
                "name": self.fake.company(),
                "category": random.choice(["restaurant", "retail", "gas", "grocery", "entertainment"]),
                "location": self.fake.address()
            },
            "payment_method": {
                "type": random.choice(["credit_card", "debit_card", "paypal", "apple_pay"]),
                "last_four": self.fake.credit_card_number()[-4:]
            },
            "status": random.choice(["pending", "completed", "failed", "refunded"]),
            "timestamp": self.fake.date_time_between(start_date="-30d").isoformat(),
            "description": self.fake.sentence(),
            "metadata": {
                "ip_address": self.fake.ipv4(),
                "user_agent": self.fake.user_agent(),
                "risk_score": round(random.uniform(0, 100), 2)
            }
        }
    
    def _generate_system_event(self) -> Dict[str, Any]:
        """Generate a system event message."""
        return {
            "type": "system_event",
            "event_id": self.fake.uuid4(),
            "event_type": random.choice(["login", "logout", "error", "warning", "info"]),
            "service": random.choice(["auth-service", "api-gateway", "user-service", "payment-service"]),
            "severity": random.choice(["low", "medium", "high", "critical"]),
            "message": self.fake.sentence(),
            "details": {
                "user_id": self.fake.uuid4(),
                "session_id": self.fake.uuid4(),
                "ip_address": self.fake.ipv4(),
                "user_agent": self.fake.user_agent(),
                "endpoint": f"/api/v1/{self.fake.word()}",
                "response_time": random.randint(10, 5000),
                "status_code": random.choice([200, 201, 400, 401, 403, 404, 500, 502])
            },
            "timestamp": datetime.now().isoformat(),
            "server": {
                "hostname": self.fake.hostname(),
                "region": random.choice(["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"]),
                "instance_id": f"i-{self.fake.hex_color()[1:]}"
            }
        }
    
    def _generate_product_data(self) -> Dict[str, Any]:
        """Generate product/inventory data."""
        return {
            "type": "product",
            "product_id": self.fake.uuid4(),
            "sku": self.fake.ean13(),
            "name": f"{self.fake.color_name()} {self.fake.word().title()}",
            "description": self.fake.text(max_nb_chars=300),
            "category": random.choice(["electronics", "clothing", "home", "sports", "books"]),
            "price": {
                "amount": round(random.uniform(9.99, 999.99), 2),
                "currency": "USD",
                "discount": round(random.uniform(0, 50), 2) if random.choice([True, False]) else 0
            },
            "inventory": {
                "quantity": random.randint(0, 1000),
                "warehouse": self.fake.city(),
                "last_updated": self.fake.date_time_between(start_date="-7d").isoformat()
            },
            "attributes": {
                "brand": self.fake.company(),
                "color": self.fake.color_name(),
                "size": random.choice(["XS", "S", "M", "L", "XL", "XXL"]),
                "weight": f"{round(random.uniform(0.1, 50.0), 2)} lbs",
                "dimensions": f"{random.randint(1, 50)}x{random.randint(1, 50)}x{random.randint(1, 50)} cm"
            },
            "ratings": {
                "average": round(random.uniform(1.0, 5.0), 1),
                "count": random.randint(0, 1000)
            },
            "created_at": self.fake.date_time_between(start_date="-1y").isoformat()
        }
    
    def _generate_sensor_reading(self) -> Dict[str, Any]:
        """Generate IoT sensor reading data."""
        return {
            "type": "sensor_reading",
            "device_id": self.fake.uuid4(),
            "sensor_type": random.choice(["temperature", "humidity", "pressure", "motion", "light"]),
            "location": {
                "building": self.fake.building_number(),
                "floor": random.randint(1, 20),
                "room": f"Room {random.randint(100, 999)}",
                "coordinates": {
                    "lat": float(self.fake.latitude()),
                    "lng": float(self.fake.longitude())
                }
            },
            "reading": {
                "value": round(random.uniform(-40, 120), 2),
                "unit": random.choice(["°C", "°F", "%", "Pa", "lux", "boolean"]),
                "calibrated": random.choice([True, False])
            },
            "quality": {
                "signal_strength": random.randint(-100, -30),
                "battery_level": random.randint(0, 100),
                "last_calibration": self.fake.date_time_between(start_date="-90d").isoformat()
            },
            "timestamp": datetime.now().isoformat(),
            "metadata": {
                "firmware_version": f"v{random.randint(1, 5)}.{random.randint(0, 99)}.{random.randint(0, 99)}",
                "manufacturer": self.fake.company(),
                "model": f"{self.fake.word().upper()}-{random.randint(1000, 9999)}"
            }
        }
    
    def _generate_social_post(self) -> Dict[str, Any]:
        """Generate social media post data."""
        return {
            "type": "social_post",
            "post_id": self.fake.uuid4(),
            "user_id": self.fake.uuid4(),
            "username": self.fake.user_name(),
            "content": self.fake.text(max_nb_chars=random.randint(20, 280)),
            "hashtags": [f"#{self.fake.word()}" for _ in range(random.randint(0, 5))],
            "mentions": [f"@{self.fake.user_name()}" for _ in range(random.randint(0, 3))],
            "media": [
                {
                    "type": random.choice(["image", "video", "gif"]),
                    "url": self.fake.url(),
                    "thumbnail": self.fake.image_url()
                }
            ] if random.choice([True, False]) else [],
            "engagement": {
                "likes": random.randint(0, 10000),
                "shares": random.randint(0, 1000),
                "comments": random.randint(0, 500),
                "views": random.randint(0, 100000)
            },
            "location": {
                "name": self.fake.city(),
                "coordinates": {
                    "lat": float(self.fake.latitude()),
                    "lng": float(self.fake.longitude())
                }
            } if random.choice([True, False]) else None,
            "timestamp": self.fake.date_time_between(start_date="-7d").isoformat(),
            "platform": random.choice(["twitter", "instagram", "facebook", "linkedin"])
        }
    
    def _generate_notification(self) -> Dict[str, Any]:
        """Generate notification message."""
        return {
            "type": "notification",
            "notification_id": self.fake.uuid4(),
            "user_id": self.fake.uuid4(),
            "title": self.fake.sentence(nb_words=4),
            "body": self.fake.text(max_nb_chars=150),
            "category": random.choice(["system", "social", "promotional", "reminder", "alert"]),
            "priority": random.choice(["low", "normal", "high", "urgent"]),
            "channels": random.sample(["push", "email", "sms", "in_app"], random.randint(1, 3)),
            "action_url": self.fake.url() if random.choice([True, False]) else None,
            "metadata": {
                "campaign_id": self.fake.uuid4(),
                "source": random.choice(["automated", "manual", "triggered"]),
                "experiment_id": self.fake.uuid4() if random.choice([True, False]) else None
            },
            "scheduled_for": self.fake.date_time_between(start_date="now", end_date="+7d").isoformat(),
            "created_at": datetime.now().isoformat()
        }
    
    def _generate_analytics_event(self) -> Dict[str, Any]:
        """Generate analytics/tracking event."""
        return {
            "type": "analytics_event",
            "event_id": self.fake.uuid4(),
            "session_id": self.fake.uuid4(),
            "user_id": self.fake.uuid4(),
            "event_name": random.choice(["page_view", "click", "purchase", "signup", "download"]),
            "properties": {
                "page_url": self.fake.url(),
                "referrer": self.fake.url(),
                "utm_source": random.choice(["google", "facebook", "twitter", "direct"]),
                "utm_medium": random.choice(["cpc", "social", "email", "organic"]),
                "utm_campaign": f"campaign_{random.randint(1, 100)}",
                "browser": random.choice(["Chrome", "Firefox", "Safari", "Edge"]),
                "os": random.choice(["Windows", "macOS", "Linux", "iOS", "Android"]),
                "device_type": random.choice(["desktop", "mobile", "tablet"])
            },
            "user_properties": {
                "country": self.fake.country_code(),
                "city": self.fake.city(),
                "timezone": self.fake.timezone(),
                "language": self.fake.language_code(),
                "is_returning": random.choice([True, False])
            },
            "timestamp": datetime.now().isoformat(),
            "client_info": {
                "ip_address": self.fake.ipv4(),
                "user_agent": self.fake.user_agent(),
                "screen_resolution": f"{random.choice([1920, 1366, 1536, 2560])}x{random.choice([1080, 768, 864, 1440])}"
            }
        }
    
    def _generate_support_ticket(self) -> Dict[str, Any]:
        """Generate customer support ticket."""
        return {
            "type": "support_ticket",
            "ticket_id": f"TICKET-{random.randint(10000, 99999)}",
            "user_id": self.fake.uuid4(),
            "customer": {
                "name": self.fake.name(),
                "email": self.fake.email(),
                "phone": self.fake.phone_number(),
                "tier": random.choice(["free", "premium", "enterprise"])
            },
            "subject": self.fake.sentence(nb_words=6),
            "description": self.fake.text(max_nb_chars=500),
            "category": random.choice(["technical", "billing", "feature_request", "bug_report", "general"]),
            "priority": random.choice(["low", "medium", "high", "critical"]),
            "status": random.choice(["open", "in_progress", "waiting_customer", "resolved", "closed"]),
            "assigned_to": {
                "agent_id": self.fake.uuid4(),
                "name": self.fake.name(),
                "department": random.choice(["support", "technical", "billing"])
            },
            "tags": [self.fake.word() for _ in range(random.randint(0, 4))],
            "created_at": self.fake.date_time_between(start_date="-30d").isoformat(),
            "updated_at": self.fake.date_time_between(start_date="-7d").isoformat(),
            "sla": {
                "response_time": f"{random.randint(1, 24)} hours",
                "resolution_time": f"{random.randint(1, 7)} days"
            }
        }
    
    def _generate_order_data(self) -> Dict[str, Any]:
        """Generate e-commerce order data."""
        items = []
        for _ in range(random.randint(1, 5)):
            items.append({
                "product_id": self.fake.uuid4(),
                "name": f"{self.fake.color_name()} {self.fake.word().title()}",
                "quantity": random.randint(1, 3),
                "price": round(random.uniform(9.99, 199.99), 2),
                "sku": self.fake.ean8()
            })
        
        subtotal = sum(item["price"] * item["quantity"] for item in items)
        tax = round(subtotal * 0.08, 2)
        shipping = round(random.uniform(0, 29.99), 2)
        
        return {
            "type": "order",
            "order_id": f"ORD-{random.randint(100000, 999999)}",
            "user_id": self.fake.uuid4(),
            "customer": {
                "name": self.fake.name(),
                "email": self.fake.email(),
                "phone": self.fake.phone_number()
            },
            "items": items,
            "pricing": {
                "subtotal": round(subtotal, 2),
                "tax": tax,
                "shipping": shipping,
                "discount": round(random.uniform(0, 50), 2) if random.choice([True, False]) else 0,
                "total": round(subtotal + tax + shipping, 2)
            },
            "shipping_address": {
                "street": self.fake.street_address(),
                "city": self.fake.city(),
                "state": self.fake.state_abbr(),
                "zip": self.fake.zipcode(),
                "country": self.fake.country_code()
            },
            "payment": {
                "method": random.choice(["credit_card", "paypal", "apple_pay", "google_pay"]),
                "status": random.choice(["pending", "authorized", "captured", "failed"])
            },
            "status": random.choice(["processing", "shipped", "delivered", "cancelled"]),
            "tracking_number": self.fake.ean13() if random.choice([True, False]) else None,
            "created_at": self.fake.date_time_between(start_date="-30d").isoformat(),
            "estimated_delivery": self.fake.date_time_between(start_date="now", end_date="+14d").isoformat()
        }
    
    def _generate_log_entry(self) -> Dict[str, Any]:
        """Generate application log entry."""
        return {
            "type": "log_entry",
            "timestamp": datetime.now().isoformat(),
            "level": random.choice(["DEBUG", "INFO", "WARN", "ERROR", "FATAL"]),
            "logger": f"{self.fake.word()}.{self.fake.word()}",
            "message": self.fake.sentence(),
            "thread": f"thread-{random.randint(1, 20)}",
            "context": {
                "request_id": self.fake.uuid4(),
                "user_id": self.fake.uuid4(),
                "session_id": self.fake.uuid4(),
                "correlation_id": self.fake.uuid4()
            },
            "source": {
                "file": f"{self.fake.word()}.py",
                "line": random.randint(1, 1000),
                "method": f"{self.fake.word()}_{self.fake.word()}"
            },
            "environment": random.choice(["development", "staging", "production"]),
            "host": {
                "hostname": self.fake.hostname(),
                "ip": self.fake.ipv4(),
                "region": random.choice(["us-east-1", "us-west-2", "eu-west-1"])
            },
            "performance": {
                "duration_ms": random.randint(1, 5000),
                "memory_mb": random.randint(50, 2048),
                "cpu_percent": round(random.uniform(0, 100), 1)
            } if random.choice([True, False]) else None
        }


class PubNubMessagePublisher:
    """Publishes test messages to PubNub channels."""
    
    def __init__(self, publish_key: str, subscribe_key: str):
        self.config = PNConfiguration()
        self.config.subscribe_key = subscribe_key
        self.config.publish_key = publish_key
        self.config.user_id = f"test-publisher-{int(time.time())}"
        self.config.enable_subscribe = False  # We're only publishing
        
        self.pubnub = PubNub(self.config)
        self.generator = MessageGenerator()
    
    async def publish_messages(self, channel_name: str, message_count: int, 
                             size_range: tuple = (100, 25000), 
                             delay_ms: int = 100,
                             message_type: str = None,
                             include_meta: bool = False) -> List[Dict[str, Any]]:
        """
        Publish specified number of messages to the channel.
        
        Args:
            channel_name: Target channel name
            message_count: Number of messages to publish
            size_range: Tuple of (min_size, max_size) in bytes
            delay_ms: Delay between messages in milliseconds
            message_type: Specific message type to generate (if None, random types)
            include_meta: Whether to include metadata in messages
            
        Returns:
            List of publish results
        """
        results = []
        
        print(f"Publishing {message_count} messages to channel '{channel_name}'...")
        print(f"Message size range: {size_range[0]} - {size_range[1]} bytes")
        if message_type:
            print(f"Message type: {message_type} (fixed)")
        else:
            print(f"Message type: random")
        print(f"Include metadata: {include_meta}")
        
        for i in range(message_count):
            try:
                # Generate target size for this message
                target_size = random.randint(size_range[0], size_range[1])
                
                # Generate message
                message = self.generator.generate_message(target_size, message_type, include_meta)
                
                # Add sequence info
                message['_meta'] = {
                    'sequence': i + 1,
                    'total': message_count,
                    'generated_at': datetime.now().isoformat(),
                    'publisher': self.config.user_id,
                    'target_size_bytes': target_size,
                    'actual_size_bytes': len(json.dumps(message, separators=(',', ':')))
                }
                
                # Publish message using POST to avoid URL length limits
                result = self.pubnub.publish().channel(channel_name).message(message).use_post(True).sync()
                
                if result.status.is_error():
                    print(f"❌ Error publishing message {i+1}: {result.status.error_data}")
                else:
                    actual_size = len(json.dumps(message, separators=(',', ':')))
                    print(f"✅ Message {i+1}/{message_count} published "
                          f"(timetoken: {result.result.timetoken}, "
                          f"size: {actual_size} bytes, "
                          f"type: {message.get('type', 'unknown')})")
                
                results.append({
                    'sequence': i + 1,
                    'success': not result.status.is_error(),
                    'timetoken': result.result.timetoken if not result.status.is_error() else None,
                    'error': result.status.error_data if result.status.is_error() else None,
                    'message_type': message.get('type', 'unknown'),
                    'size_bytes': len(json.dumps(message, separators=(',', ':'))),
                    'target_size_bytes': target_size
                })
                
                # Add delay between messages
                if delay_ms > 0 and i < message_count - 1:
                    await asyncio.sleep(delay_ms / 1000.0)
                    
            except Exception as e:
                print(f"❌ Exception publishing message {i+1}: {str(e)}")
                results.append({
                    'sequence': i + 1,
                    'success': False,
                    'error': str(e),
                    'message_type': 'unknown',
                    'size_bytes': 0,
                    'target_size_bytes': target_size
                })
        
        return results
    
    def close(self):
        """Clean up PubNub connection."""
        # No cleanup needed for publish-only instance
        # The stop() method is only for subscription management
        pass


def main():
    """Main function to handle command line arguments and run the publisher."""
    parser = argparse.ArgumentParser(
        description="Publish random test messages to PubNub",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Publish 100 random messages
  python publish_test_messages.py pub-c-abc123 sub-c-def456 test-channel 100
  
  # Publish 50 chat messages with metadata
  python publish_test_messages.py pub-c-abc123 sub-c-def456 chat-room 50 --type chat_message --meta
  
  # Publish 25 transaction messages without metadata
  python publish_test_messages.py pub-c-abc123 sub-c-def456 payments 25 --type transaction
  
  # Publish 200 random messages with metadata and faster rate
  python publish_test_messages.py pub-c-abc123 sub-c-def456 mixed-channel 200 --meta --delay 50

Available message types:
  user_profile, chat_message, transaction, system_event, product, sensor_reading,
  social_post, notification, analytics_event, support_ticket, order, log_entry
        """
    )
    
    parser.add_argument('publish_key', help='PubNub publish key')
    parser.add_argument('subscribe_key', help='PubNub subscribe key')
    parser.add_argument('channel_name', help='Target channel name')
    parser.add_argument('message_count', type=int, help='Number of messages to publish')
    parser.add_argument('--min-size', type=int, default=100, 
                       help='Minimum message size in bytes (default: 100)')
    parser.add_argument('--max-size', type=int, default=25000,
                       help='Maximum message size in bytes (default: 25000)')
    parser.add_argument('--delay', type=int, default=100,
                       help='Delay between messages in milliseconds (default: 100)')
    parser.add_argument('--meta', action='store_true',
                       help='Include 3 relevant metadata key/value pairs for each message type')
    parser.add_argument('--type', type=str, choices=[
                       'user_profile', 'chat_message', 'transaction', 'system_event', 
                       'product', 'sensor_reading', 'social_post', 'notification',
                       'analytics_event', 'support_ticket', 'order', 'log_entry'
                       ], help='Specific message type to generate (if omitted, random types are used)')
    
    args = parser.parse_args()
    
    # Validate arguments
    if args.message_count <= 0:
        print("❌ Error: message_count must be greater than 0")
        sys.exit(1)
    
    if args.min_size >= args.max_size:
        print("❌ Error: min-size must be less than max-size")
        sys.exit(1)
    
    # Create publisher
    publisher = PubNubMessagePublisher(args.publish_key, args.subscribe_key)
    
    try:
        # Run the publishing process
        start_time = time.time()
        
        # Use asyncio to run the async function
        results = asyncio.run(publisher.publish_messages(
            args.channel_name, 
            args.message_count,
            (args.min_size, args.max_size),
            args.delay,
            args.type,
            args.meta
        ))
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Print summary
        successful = sum(1 for r in results if r['success'])
        failed = len(results) - successful
        total_bytes = sum(r['size_bytes'] for r in results if r['success'])
        avg_size = total_bytes / successful if successful > 0 else 0
        
        print(f"\n📊 Publishing Summary:")
        print(f"   Total messages: {len(results)}")
        print(f"   Successful: {successful}")
        print(f"   Failed: {failed}")
        print(f"   Duration: {duration:.2f} seconds")
        print(f"   Rate: {len(results) / duration:.2f} messages/sec")
        print(f"   Total data: {total_bytes:,} bytes ({total_bytes / 1024:.2f} KB)")
        print(f"   Average size: {avg_size:.0f} bytes")
        
        if failed > 0:
            print(f"\n❌ Failed messages:")
            for result in results:
                if not result['success']:
                    print(f"   Message {result['sequence']}: {result.get('error', 'Unknown error')}")
        
        print(f"\n✅ Completed publishing to channel '{args.channel_name}'")
        
    except KeyboardInterrupt:
        print("\n⚠️  Publishing interrupted by user")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)
    finally:
        publisher.close()


if __name__ == "__main__":
    main()