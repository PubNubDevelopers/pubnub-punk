#!/usr/bin/env python3
"""
PubNub Channel Groups Secret Key Test

This script tests whether a secret key is required to create and manage PubNub channel groups.
It creates two channel groups: one with secret key and one without, then queries both to verify creation.

Usage:
    python test_channel_groups_secret_key.py

Test Results:
    - Tests creation of channel groups with and without secret key
    - Queries both groups to verify they exist
    - Compares functionality between the two configurations
    - Provides clear documentation of secret key requirements

Requirements:
    pip install pubnub
"""

import sys
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

try:
    from pubnub.pnconfiguration import PNConfiguration
    from pubnub.pubnub import PubNub
    from pubnub.exceptions import PubNubException
except ImportError as e:
    print(f"Missing required dependency: {e}")
    print("Please install dependencies: pip install pubnub")
    sys.exit(1)


class ChannelGroupTester:
    """Tests channel group operations with and without secret key."""
    
    def __init__(self, pub_key: str, sub_key: str, secret_key: str):
        self.pub_key = pub_key
        self.sub_key = sub_key
        self.secret_key = secret_key
        
        # Test configurations
        self.test_results = {
            'with_secret': {
                'config': None,
                'pubnub': None,
                'group_name': f'test-group-with-secret-{int(time.time())}',
                'channels': ['test-channel-with-secret-1', 'test-channel-with-secret-2'],
                'creation_success': False,
                'query_success': False,
                'channels_found': [],
                'error_messages': []
            },
            'without_secret': {
                'config': None,
                'pubnub': None,
                'group_name': f'test-group-without-secret-{int(time.time())}',
                'channels': ['test-channel-without-secret-1', 'test-channel-without-secret-2'],
                'creation_success': False,
                'query_success': False,
                'channels_found': [],
                'error_messages': []
            }
        }
    
    def setup_configurations(self):
        """Set up PubNub configurations with and without secret key."""
        print("🔧 Setting up PubNub configurations...")
        
        # Configuration WITH secret key
        config_with_secret = PNConfiguration()
        config_with_secret.publish_key = self.pub_key
        config_with_secret.subscribe_key = self.sub_key
        config_with_secret.secret_key = self.secret_key
        config_with_secret.user_id = f"test-user-with-secret-{int(time.time())}"
        config_with_secret.enable_subscribe = False
        
        self.test_results['with_secret']['config'] = config_with_secret
        self.test_results['with_secret']['pubnub'] = PubNub(config_with_secret)
        
        print(f"✅ Configuration WITH secret key: user_id={config_with_secret.user_id}")
        
        # Configuration WITHOUT secret key
        config_without_secret = PNConfiguration()
        config_without_secret.publish_key = self.pub_key
        config_without_secret.subscribe_key = self.sub_key
        # Explicitly NOT setting secret_key
        config_without_secret.user_id = f"test-user-without-secret-{int(time.time())}"
        config_without_secret.enable_subscribe = False
        
        self.test_results['without_secret']['config'] = config_without_secret
        self.test_results['without_secret']['pubnub'] = PubNub(config_without_secret)
        
        print(f"✅ Configuration WITHOUT secret key: user_id={config_without_secret.user_id}")
    
    def test_channel_group_creation(self, test_type: str) -> bool:
        """Test creating a channel group for the given test type."""
        test_data = self.test_results[test_type]
        pubnub = test_data['pubnub']
        group_name = test_data['group_name']
        channels = test_data['channels']
        
        print(f"\n📝 Testing channel group creation {test_type.upper()} secret key...")
        print(f"   Group: {group_name}")
        print(f"   Channels: {channels}")
        
        try:
            # Add channels to group (this creates the group if it doesn't exist)
            result = pubnub.add_channel_to_channel_group()\
                          .channels(channels)\
                          .channel_group(group_name)\
                          .sync()
            
            if result.status.is_error():
                error_msg = f"API Error: {result.status.error_data}"
                test_data['error_messages'].append(error_msg)
                print(f"❌ Failed: {error_msg}")
                return False
            else:
                test_data['creation_success'] = True
                print(f"✅ Success: Channel group created")
                print(f"   Status: {result.status.status_code}")
                return True
                
        except PubNubException as e:
            error_msg = f"PubNub Exception: {str(e)}"
            test_data['error_messages'].append(error_msg)
            print(f"❌ Failed: {error_msg}")
            return False
        except Exception as e:
            error_msg = f"General Exception: {str(e)}"
            test_data['error_messages'].append(error_msg)
            print(f"❌ Failed: {error_msg}")
            return False
    
    def test_channel_group_query(self, test_type: str) -> bool:
        """Test querying a channel group for the given test type."""
        test_data = self.test_results[test_type]
        pubnub = test_data['pubnub']
        group_name = test_data['group_name']
        
        print(f"\n🔍 Testing channel group query {test_type.upper()} secret key...")
        print(f"   Group: {group_name}")
        
        try:
            # List channels in the group
            result = pubnub.list_channels_in_channel_group()\
                          .channel_group(group_name)\
                          .sync()
            
            if result.status.is_error():
                error_msg = f"Query API Error: {result.status.error_data}"
                test_data['error_messages'].append(error_msg)
                print(f"❌ Failed: {error_msg}")
                return False
            else:
                channels_found = result.result.channels or []
                test_data['query_success'] = True
                test_data['channels_found'] = channels_found
                print(f"✅ Success: Found {len(channels_found)} channels")
                print(f"   Channels: {channels_found}")
                print(f"   Status: {result.status.status_code}")
                return True
                
        except PubNubException as e:
            error_msg = f"Query PubNub Exception: {str(e)}"
            test_data['error_messages'].append(error_msg)
            print(f"❌ Failed: {error_msg}")
            return False
        except Exception as e:
            error_msg = f"Query General Exception: {str(e)}"
            test_data['error_messages'].append(error_msg)
            print(f"❌ Failed: {error_msg}")
            return False
    
    def cleanup_test_groups(self):
        """Clean up test channel groups."""
        print(f"\n🧹 Cleaning up test channel groups...")
        
        for test_type in ['with_secret', 'without_secret']:
            test_data = self.test_results[test_type]
            if test_data['creation_success']:
                try:
                    pubnub = test_data['pubnub']
                    group_name = test_data['group_name']
                    
                    result = pubnub.remove_channel_group()\
                                  .channel_group(group_name)\
                                  .sync()
                    
                    if result.status.is_error():
                        print(f"⚠️  Warning: Could not delete {group_name}: {result.status.error_data}")
                    else:
                        print(f"✅ Deleted: {group_name}")
                        
                except Exception as e:
                    print(f"⚠️  Warning: Error deleting {group_name}: {str(e)}")
    
    def run_tests(self) -> Dict[str, Any]:
        """Run all channel group tests."""
        print("🚀 Starting PubNub Channel Groups Secret Key Test")
        print("=" * 60)
        
        # Setup configurations
        self.setup_configurations()
        
        # Test creation with secret key
        print("\n" + "=" * 60)
        print("TEST 1: Channel Group Creation WITH Secret Key")
        print("=" * 60)
        self.test_channel_group_creation('with_secret')
        
        # Test creation without secret key
        print("\n" + "=" * 60)
        print("TEST 2: Channel Group Creation WITHOUT Secret Key")
        print("=" * 60)
        self.test_channel_group_creation('without_secret')
        
        # Small delay to ensure creation is processed
        print("\n⏳ Waiting 2 seconds for group creation to propagate...")
        time.sleep(2)
        
        # Test querying with secret key
        print("\n" + "=" * 60)
        print("TEST 3: Channel Group Query WITH Secret Key")
        print("=" * 60)
        self.test_channel_group_query('with_secret')
        
        # Test querying without secret key
        print("\n" + "=" * 60)
        print("TEST 4: Channel Group Query WITHOUT Secret Key")
        print("=" * 60)
        self.test_channel_group_query('without_secret')
        
        # Generate summary report
        return self.generate_summary_report()
    
    def generate_summary_report(self) -> Dict[str, Any]:
        """Generate a comprehensive test summary."""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY REPORT")
        print("=" * 60)
        
        with_secret = self.test_results['with_secret']
        without_secret = self.test_results['without_secret']
        
        # Print results table
        print(f"\n{'Operation':<25} | {'With Secret':<12} | {'Without Secret':<15}")
        print("-" * 60)
        print(f"{'Channel Group Creation':<25} | {'✅ Success' if with_secret['creation_success'] else '❌ Failed':<12} | {'✅ Success' if without_secret['creation_success'] else '❌ Failed':<15}")
        print(f"{'Channel Group Query':<25} | {'✅ Success' if with_secret['query_success'] else '❌ Failed':<12} | {'✅ Success' if without_secret['query_success'] else '❌ Failed':<15}")
        
        # Print detailed results
        print(f"\n📋 DETAILED RESULTS:")
        
        for test_type in ['with_secret', 'without_secret']:
            test_data = self.test_results[test_type]
            print(f"\n{test_type.replace('_', ' ').title()}:")
            print(f"  Group Name: {test_data['group_name']}")
            print(f"  Expected Channels: {test_data['channels']}")
            print(f"  Creation Success: {'✅ Yes' if test_data['creation_success'] else '❌ No'}")
            print(f"  Query Success: {'✅ Yes' if test_data['query_success'] else '❌ No'}")
            print(f"  Channels Found: {test_data['channels_found']}")
            
            if test_data['error_messages']:
                print(f"  Errors:")
                for error in test_data['error_messages']:
                    print(f"    - {error}")
        
        # Generate conclusion
        both_creation_success = with_secret['creation_success'] and without_secret['creation_success']
        both_query_success = with_secret['query_success'] and without_secret['query_success']
        
        print(f"\n🎯 CONCLUSION:")
        if both_creation_success and both_query_success:
            print("✅ SECRET KEY IS NOT REQUIRED for PubNub Channel Groups!")
            print("   Both configurations successfully created and queried channel groups.")
            conclusion = "SECRET_KEY_NOT_REQUIRED"
        elif with_secret['creation_success'] and not without_secret['creation_success']:
            print("❌ SECRET KEY IS REQUIRED for PubNub Channel Groups!")
            print("   Only the configuration with secret key succeeded.")
            conclusion = "SECRET_KEY_REQUIRED"
        elif not with_secret['creation_success'] and without_secret['creation_success']:
            print("🤔 SECRET KEY MAY INTERFERE with PubNub Channel Groups!")
            print("   Only the configuration without secret key succeeded.")
            conclusion = "SECRET_KEY_INTERFERES"
        else:
            print("❓ INCONCLUSIVE RESULTS!")
            print("   Both configurations failed. Check your PubNub keys and configuration.")
            conclusion = "INCONCLUSIVE"
        
        # Return structured results
        return {
            'timestamp': datetime.now().isoformat(),
            'conclusion': conclusion,
            'with_secret': with_secret,
            'without_secret': without_secret,
            'summary': {
                'both_creation_success': both_creation_success,
                'both_query_success': both_query_success,
                'secret_key_required': conclusion == "SECRET_KEY_REQUIRED",
                'secret_key_not_required': conclusion == "SECRET_KEY_NOT_REQUIRED"
            }
        }


def main():
    """Main function to run the channel groups secret key test."""
    
    # PubNub test keys - these should be the actual keys used in testing
    PUB_KEY = "pub-c-17c0aef0-b03b-460f-8f93-69fa5d80034a"
    SUB_KEY = "sub-c-f18d5abb-122f-4ca0-9031-64e002e0fad0"
    SECRET_KEY = "sec-c-MTc4MGEzMDUtNTU4Ni00MGEwLTgyYjItZDE3MzUxYTkxZjc0"
    
    print("PubNub Channel Groups Secret Key Test")
    print("=" * 60)
    print(f"Publish Key: {PUB_KEY}")
    print(f"Subscribe Key: {SUB_KEY}")
    print(f"Secret Key: {SECRET_KEY[:20]}...{SECRET_KEY[-4:]}")  # Partially masked for security
    print("=" * 60)
    
    # Create tester instance
    tester = ChannelGroupTester(PUB_KEY, SUB_KEY, SECRET_KEY)
    
    try:
        # Run all tests
        results = tester.run_tests()
        
        # Final conclusion
        print(f"\n🏁 FINAL RESULT: {results['conclusion']}")
        
        if results['conclusion'] == "SECRET_KEY_NOT_REQUIRED":
            print("\n💡 This means you can use PubNub Channel Groups in frontend")
            print("   applications without needing to expose your secret key!")
        elif results['conclusion'] == "SECRET_KEY_REQUIRED":
            print("\n⚠️  This means PubNub Channel Groups require server-side")
            print("   implementation to avoid exposing your secret key.")
        
        print(f"\n✅ Test completed successfully at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        sys.exit(1)
    finally:
        # Cleanup
        try:
            tester.cleanup_test_groups()
        except:
            pass  # Don't fail on cleanup errors


if __name__ == "__main__":
    main()