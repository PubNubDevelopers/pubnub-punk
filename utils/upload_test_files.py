#!/usr/bin/env python3
"""
PubNub File Upload Test Script
Uploads the same image file multiple times with random names to a PubNub channel
for testing purposes.

Usage:
    python upload_test_files.py --image path/to/image.jpg --count 50 --channel test-files
"""

import argparse
import os
import sys
import time
import random
import string
from pathlib import Path
from pubnub.pnconfiguration import PNConfiguration
from pubnub.pubnub import PubNub
from pubnub.models.consumer.file import PNSendFileResult
from pubnub.exceptions import PubNubException


def generate_random_filename(original_filename):
    """Generate a random filename while preserving the file extension."""
    # Get the file extension
    _, ext = os.path.splitext(original_filename)
    
    # Generate random string (8-12 characters)
    length = random.randint(8, 12)
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))
    
    # Add optional prefix
    prefixes = ['test_', 'img_', 'file_', 'upload_', '']
    prefix = random.choice(prefixes)
    
    # Add optional timestamp
    if random.random() > 0.5:
        timestamp = str(int(time.time()))[-6:]  # Last 6 digits of timestamp
        return f"{prefix}{random_str}_{timestamp}{ext}"
    else:
        return f"{prefix}{random_str}{ext}"


def upload_file(pubnub, channel, file_path, custom_name=None):
    """Upload a single file to PubNub channel."""
    try:
        # Use custom name or original name
        file_name = custom_name or os.path.basename(file_path)
        
        # Open the file and send it
        with open(file_path, 'rb') as file_handle:
            # Send file using the correct API
            result = pubnub.send_file() \
                .channel(channel) \
                .file_name(file_name) \
                .file_object(file_handle) \
                .message({"description": f"Test upload of {file_name}"}) \
                .sync()
        
        return True, f"Successfully uploaded: {file_name}"
        
    except PubNubException as e:
        return False, f"Failed to upload {file_name}: {str(e)}"
    except Exception as e:
        return False, f"Unexpected error uploading {file_name}: {str(e)}"


def main():
    parser = argparse.ArgumentParser(
        description='Upload test files to PubNub channel',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Upload image.jpg 50 times to 'test-files' channel
  python upload_test_files.py --image image.jpg --count 50 --channel test-files
  
  # Use custom PubNub keys
  python upload_test_files.py --image photo.png --count 20 --channel my-test \\
      --publish-key YOUR_PUB_KEY --subscribe-key YOUR_SUB_KEY
  
  # Add delay between uploads
  python upload_test_files.py --image test.jpg --count 100 --channel files \\
      --delay 500
        """
    )
    
    # Required arguments
    parser.add_argument('--image', '-i', required=True, 
                       help='Path to source image file')
    parser.add_argument('--count', '-n', type=int, required=True,
                       help='Number of times to upload the file')
    parser.add_argument('--channel', '-c', required=True,
                       help='PubNub channel to upload files to')
    
    # Optional arguments
    parser.add_argument('--publish-key', '--pub', 
                       default='demo',
                       help='PubNub publish key (default: demo)')
    parser.add_argument('--subscribe-key', '--sub',
                       default='demo', 
                       help='PubNub subscribe key (default: demo)')
    parser.add_argument('--user-id', '-u',
                       default='file-upload-test-script',
                       help='User ID for PubNub client (default: file-upload-test-script)')
    parser.add_argument('--delay', '-d', type=int, default=100,
                       help='Delay in milliseconds between uploads (default: 100)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Show detailed output for each upload')
    
    args = parser.parse_args()
    
    # Validate image file
    if not os.path.exists(args.image):
        print(f"Error: Image file '{args.image}' not found")
        sys.exit(1)
    
    # Check file size
    file_size = os.path.getsize(args.image)
    file_size_mb = file_size / (1024 * 1024)
    
    if file_size_mb > 5:
        print(f"Error: File size ({file_size_mb:.2f} MB) exceeds PubNub's 5 MB limit")
        sys.exit(1)
    
    print(f"Starting upload test:")
    print(f"  Source file: {args.image} ({file_size_mb:.2f} MB)")
    print(f"  Upload count: {args.count}")
    print(f"  Target channel: {args.channel}")
    print(f"  Delay between uploads: {args.delay}ms")
    print()
    
    # Initialize PubNub
    pnconfig = PNConfiguration()
    pnconfig.publish_key = args.publish_key
    pnconfig.subscribe_key = args.subscribe_key
    pnconfig.uuid = args.user_id
    pnconfig.ssl = True
    
    pubnub = PubNub(pnconfig)
    
    # Track results
    successful = 0
    failed = 0
    start_time = time.time()
    
    print(f"Uploading {args.count} files...")
    
    # Upload files
    for i in range(args.count):
        # Generate random filename
        random_name = generate_random_filename(args.image)
        
        # Upload file
        success, message = upload_file(pubnub, args.channel, args.image, random_name)
        
        if success:
            successful += 1
            if args.verbose:
                print(f"[{i+1}/{args.count}] ✓ {message}")
        else:
            failed += 1
            print(f"[{i+1}/{args.count}] ✗ {message}")
        
        # Progress indicator (every 10 files if not verbose)
        if not args.verbose and (i + 1) % 10 == 0:
            print(f"Progress: {i+1}/{args.count} uploaded ({successful} successful, {failed} failed)")
        
        # Delay between uploads (except after last one)
        if i < args.count - 1 and args.delay > 0:
            time.sleep(args.delay / 1000.0)  # Convert milliseconds to seconds
    
    # Summary
    elapsed_time = time.time() - start_time
    print()
    print("Upload test completed:")
    print(f"  Total files: {args.count}")
    print(f"  Successful: {successful}")
    print(f"  Failed: {failed}")
    print(f"  Time elapsed: {elapsed_time:.1f}s")
    print(f"  Average rate: {args.count/elapsed_time:.1f} files/second")
    
    # List some example filenames that were generated
    if successful > 0:
        print()
        print("Example generated filenames:")
        for _ in range(min(5, successful)):
            print(f"  - {generate_random_filename(args.image)}")
    
    # Exit with error code if any uploads failed
    sys.exit(1 if failed > 0 else 0)


if __name__ == '__main__':
    main()