#!/usr/bin/env python3
"""
PubNub Gallery Upload Script
Downloads random images from the internet and uploads them to a PubNub channel
for gallery app testing purposes.

Usage:
    python upload_gallery.py --count 50 --channel gallery-files
"""

import argparse
import os
import sys
import time
import random
import string
import tempfile
import requests
from pathlib import Path
from pubnub.pnconfiguration import PNConfiguration
from pubnub.pubnub import PubNub
from pubnub.models.consumer.file import PNSendFileResult
from pubnub.exceptions import PubNubException


# Image sources with different categories
IMAGE_SOURCES = {
    'lorem_picsum': {
        'base_url': 'https://picsum.photos',
        'sizes': [(300, 200), (400, 300), (500, 350), (600, 400), (800, 600), (1000, 700), (1200, 800)],
        'description': 'Lorem Picsum - Random nature/landscape photos'
    },
    'dummyimage': {
        'base_url': 'https://dummyimage.com',
        'sizes': [(300, 200), (400, 300), (500, 350), (600, 400), (800, 600)],
        'description': 'DummyImage.com - Simple colored placeholders'
    },
    'placehold': {
        'base_url': 'https://placehold.co',
        'sizes': [(300, 200), (400, 300), (500, 350), (600, 400), (800, 600)],
        'description': 'Placehold.co - Modern placeholder service'
    }
}

# Image categories for Lorem Picsum (if we want specific themes)
PICSUM_CATEGORIES = ['nature', 'city', 'people', 'tech', 'animals']


def generate_image_filename():
    """Generate a realistic gallery image filename."""
    # Different naming patterns for variety
    patterns = [
        'IMG_{timestamp}_{random}.jpg',
        'photo_{random}_{timestamp}.jpg',
        'gallery_{random}.jpg',
        '{category}_{random}.jpg',
        'image_{timestamp}.jpg'
    ]
    
    pattern = random.choice(patterns)
    timestamp = str(int(time.time()))[-8:]  # Last 8 digits
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    category = random.choice(['nature', 'city', 'portrait', 'landscape', 'abstract'])
    
    return pattern.format(
        timestamp=timestamp,
        random=random_str,
        category=category
    )


def download_random_image(max_retries=3):
    """Download a random image from the internet with retry logic."""
    for attempt in range(max_retries):
        # Choose a random source with weighted preference for real photos
        # 80% chance for Lorem Picsum (real photos), 10% each for placeholders
        rand = random.random()
        if rand < 0.8:
            source_name = 'lorem_picsum'
        elif rand < 0.9:
            source_name = 'dummyimage'
        else:
            source_name = 'placehold'
            
        source = IMAGE_SOURCES[source_name]
        
        # Choose a random size
        width, height = random.choice(source['sizes'])
        
        try:
            if source_name == 'lorem_picsum':
                # Lorem Picsum API
                url = f"{source['base_url']}/{width}/{height}"
                # Add some randomness
                url += f"?random={random.randint(1, 10000)}"
                
            elif source_name == 'dummyimage':
                # DummyImage.com API - create abstract patterns without text
                colors = ['FF6B6B', '4ECDC4', '45B7D1', 'FFA07A', '98D8C8', 'F7DC6F', 'BB8FCE']
                bg_color = random.choice(colors)
                # Create gradient-like effect by using two colors
                text_color = random.choice(['FFFFFF', '000000', colors[random.randint(0, len(colors)-1)]])
                url = f"{source['base_url']}/{width}x{height}/{bg_color}/{text_color}.jpg"
                
            elif source_name == 'placehold':
                # Placehold.co API - solid colors without text
                colors = ['ff6b6b', '4ecdc4', '45b7d1', 'ffa07a', '98d8c8', 'f7dc6f', 'bb8fce', 
                         '6c5ce7', 'fd79a8', '00b894', 'e17055', 'fdcb6e', '74b9ff']
                bg_color = random.choice(colors)
                url = f"{source['base_url']}/{width}x{height}/{bg_color}"
            
            # Download the image
            response = requests.get(url, timeout=15, stream=True)
            response.raise_for_status()
            
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
            
            # Write image data
            for chunk in response.iter_content(chunk_size=8192):
                temp_file.write(chunk)
            
            temp_file.close()
            
            # Get file size for validation
            file_size = os.path.getsize(temp_file.name)
            file_size_mb = file_size / (1024 * 1024)
            
            if file_size_mb > 5:
                os.unlink(temp_file.name)
                return None, f"Downloaded image too large ({file_size_mb:.2f} MB)"
            
            return temp_file.name, f"Downloaded {width}x{height} image from {source_name} ({file_size_mb:.2f} MB)"
            
        except requests.RequestException as e:
            if attempt == max_retries - 1:
                return None, f"Failed to download after {max_retries} attempts: {str(e)}"
            # Try again with a different source
            continue
        except Exception as e:
            if attempt == max_retries - 1:
                return None, f"Unexpected error after {max_retries} attempts: {str(e)}"
            continue
    
    return None, f"Failed to download after {max_retries} attempts"


def upload_file(pubnub, channel, file_path, file_name):
    """Upload a single file to PubNub channel."""
    try:
        # Open the file and send it
        with open(file_path, 'rb') as file_handle:
            # Send file using the correct API
            result = pubnub.send_file() \
                .channel(channel) \
                .file_name(file_name) \
                .file_object(file_handle) \
                .message({"description": f"Gallery upload: {file_name}", "type": "gallery_image"}) \
                .sync()
        
        return True, f"Successfully uploaded: {file_name}"
        
    except PubNubException as e:
        return False, f"Failed to upload {file_name}: {str(e)}"
    except Exception as e:
        return False, f"Unexpected error uploading {file_name}: {str(e)}"


def main():
    parser = argparse.ArgumentParser(
        description='Download random images and upload to PubNub channel for gallery testing',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Download and upload 50 random gallery images
  python upload_gallery.py --count 50 --channel gallery-files
  
  # Use custom PubNub keys with verbose output
  python upload_gallery.py --count 20 --channel my-gallery \\
      --publish-key YOUR_PUB_KEY --subscribe-key YOUR_SUB_KEY --verbose
  
  # Add delay between uploads to be gentle on APIs
  python upload_gallery.py --count 100 --channel gallery \\
      --delay 1000
        """
    )
    
    # Required arguments
    parser.add_argument('--count', '-n', type=int, required=True,
                       help='Number of random images to download and upload')
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
                       default='gallery-upload-script',
                       help='User ID for PubNub client (default: gallery-upload-script)')
    parser.add_argument('--delay', '-d', type=int, default=500,
                       help='Delay in milliseconds between uploads (default: 500)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Show detailed output for each upload')
    parser.add_argument('--cleanup', action='store_true', default=True,
                       help='Clean up downloaded temporary files (default: True)')
    
    args = parser.parse_args()
    
    print(f"Starting gallery upload:")
    print(f"  Random images to download: {args.count}")
    print(f"  Target channel: {args.channel}")
    print(f"  Delay between uploads: {args.delay}ms")
    print()
    
    # Show available image sources
    if args.verbose:
        print("Available image sources:")
        for name, source in IMAGE_SOURCES.items():
            print(f"  - {name}: {source['description']}")
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
    downloaded_files = []
    start_time = time.time()
    
    print(f"Downloading and uploading {args.count} gallery images...")
    
    try:
        # Download and upload images
        for i in range(args.count):
            # Download random image
            temp_file, message = download_random_image()
            
            if temp_file is None:
                failed += 1
                print(f"[{i+1}/{args.count}] ✗ Download failed: {message}")
                continue
            
            downloaded_files.append(temp_file)
            
            if args.verbose:
                print(f"[{i+1}/{args.count}] Downloaded: {message}")
            
            # Generate filename
            file_name = generate_image_filename()
            
            # Upload file
            success, upload_message = upload_file(pubnub, args.channel, temp_file, file_name)
            
            if success:
                successful += 1
                if args.verbose:
                    print(f"[{i+1}/{args.count}] ✓ {upload_message}")
            else:
                failed += 1
                print(f"[{i+1}/{args.count}] ✗ {upload_message}")
            
            # Progress indicator (every 10 files if not verbose)
            if not args.verbose and (i + 1) % 10 == 0:
                print(f"Progress: {i+1}/{args.count} processed ({successful} successful, {failed} failed)")
            
            # Delay between uploads (except after last one)
            if i < args.count - 1 and args.delay > 0:
                time.sleep(args.delay / 1000.0)  # Convert milliseconds to seconds
    
    finally:
        # Clean up temporary files
        if args.cleanup:
            for temp_file in downloaded_files:
                try:
                    if os.path.exists(temp_file):
                        os.unlink(temp_file)
                except Exception as e:
                    print(f"Warning: Could not clean up temp file {temp_file}: {e}")
    
    # Summary
    elapsed_time = time.time() - start_time
    print()
    print("Gallery upload completed:")
    print(f"  Total images processed: {args.count}")
    print(f"  Successful uploads: {successful}")
    print(f"  Failed: {failed}")
    print(f"  Time elapsed: {elapsed_time:.1f}s")
    if args.count > 0:
        print(f"  Average rate: {args.count/elapsed_time:.1f} images/second")
    
    # Show example of generated filenames
    if successful > 0:
        print()
        print("Example generated filenames:")
        for _ in range(min(5, successful)):
            print(f"  - {generate_image_filename()}")
    
    # Exit with error code if any uploads failed
    sys.exit(1 if failed > 0 else 0)


if __name__ == '__main__':
    main()