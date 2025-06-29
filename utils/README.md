# PubNub App Context Test Data Generator

This script generates realistic test data for PubNub App Context to help you test the App Context page with large datasets.

## Features

- **Realistic User Data**: Generates users with real names, email addresses, departments, roles, and custom metadata
- **Realistic Channel Data**: Creates channels with contextual names and descriptions (teams, projects, locations, etc.)
- **Smart Memberships**: Creates realistic membership relationships with custom metadata
- **Progress Tracking**: Shows real-time progress with counters and percentages
- **Batch Processing**: Handles large datasets efficiently with configurable batch sizes
- **Error Handling**: Includes cleanup functionality and graceful error handling
- **Dry Run Mode**: Preview what would be created without actually creating data

## Installation

1. **Install Python dependencies:**
   ```bash
   cd utils
   pip install -r requirements.txt
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your PubNub keys
   ```

3. **Configure your .env file:**
   ```env
   PUBNUB_PUBLISH_KEY=pub-c-your-publish-key
   PUBNUB_SUBSCRIBE_KEY=sub-c-your-subscribe-key
   PUBNUB_SECRET_KEY=sec-c-your-secret-key  # Optional, for better performance
   PUBNUB_USER_ID=test-data-generator       # Optional
   ```

## Usage

### Basic Usage
```bash
# Create 100 users, 20 channels, with 30% membership ratio
python populate_app_context.py

# Create 500 users and 50 channels
python populate_app_context.py --users 500 --channels 50

# Create with higher membership density
python populate_app_context.py --users 200 --channels 30 --membership-ratio 0.5
```

### Advanced Options
```bash
# Dry run to see what would be created
python populate_app_context.py --users 1000 --channels 100 --dry-run

# Adjust batch size for better performance
python populate_app_context.py --users 500 --channels 50 --batch-size 20

# Create a large test dataset
python populate_app_context.py --users 2000 --channels 150 --membership-ratio 0.25
```

### Command Line Options

| Option | Short | Default | Description |
|--------|-------|---------|-------------|
| `--users` | `-u` | 100 | Number of users to create |
| `--channels` | `-c` | 20 | Number of channels to create |
| `--membership-ratio` | `-m` | 0.3 | Ratio of total possible memberships to create (0.0-1.0) |
| `--batch-size` | `-b` | 10 | Batch size for API calls (adjust for performance) |
| `--dry-run` | | False | Generate data structure but don't create in PubNub |

## Generated Data Structure

### Users
- **Realistic Names**: John Smith, Maria Garcia, etc.
- **Professional Emails**: john.smith@company.com
- **Departments**: Engineering, Marketing, Sales, Support, Product, Design, HR, Finance
- **Roles**: Manager, Developer, Analyst, Specialist, Coordinator, Director, Lead
- **Custom Metadata**: Join date, timezone, phone, employee ID, manager status, activity status

### Channels
- **General Channels**: company-wide discussion
- **Team Channels**: team-engineering, team-marketing, etc.
- **Project Channels**: project-alpha, project-beta, etc.
- **Topic Channels**: topic-random, topic-tech-talk, etc.
- **Location Channels**: location-nyc, location-sf, etc.
- **Event Channels**: event-all-hands, event-standup, etc.
- **Help Channels**: help-it-support, help-hr-questions, etc.
- **Announcement Channels**: announcement-company, etc.

### Memberships
- **Guaranteed Membership**: Every user gets added to at least one channel (preferably "general")
- **Random Distribution**: Additional memberships distributed randomly based on ratio
- **Membership Metadata**: Join date, role (member/moderator/admin), notification preferences, last read timestamp

## Performance Notes

- **Batch Size**: Default batch size of 10 works well for most cases. Increase for better performance with stable connections.
- **Rate Limiting**: The script includes small delays to avoid hitting PubNub rate limits.
- **Membership Ratio**: 0.3 (30%) is recommended for realistic datasets. Higher ratios take longer to create.
- **Memory Usage**: Large datasets (1000+ users) will use significant memory. Monitor system resources.

## Example Outputs

### Small Test Dataset
```bash
python populate_app_context.py --users 50 --channels 10
```
- Creates 50 users with realistic data
- Creates 10 channels with contextual names
- Creates ~150 memberships (30% of 500 possible)
- Takes ~30-60 seconds

### Medium Test Dataset
```bash
python populate_app_context.py --users 500 --channels 50
```
- Creates 500 users with full metadata
- Creates 50 channels across all categories
- Creates ~7,500 memberships (30% of 25,000 possible)
- Takes ~5-10 minutes

### Large Test Dataset
```bash
python populate_app_context.py --users 2000 --channels 100 --membership-ratio 0.2
```
- Creates 2000 users with complete profiles
- Creates 100 channels with rich descriptions
- Creates ~40,000 memberships (20% of 200,000 possible)
- Takes ~20-30 minutes

## Testing Your App Context Page

After running the script, you can test the App Context page features:

1. **Loading Performance**: Test the new progress meters with large datasets
2. **Pagination Removal**: Verify all users/channels load (no more 1000 limit)
3. **Membership Navigation**: Click the membership icons to navigate between tabs
4. **Search Functionality**: Search through the realistic names and descriptions
5. **Filtering**: Test filtering with the diverse metadata

## Cleanup

To remove test data, you can use the PubNub Admin Portal or create a cleanup script. The generated data includes:
- User IDs with pattern: `user_00001_john_smith`
- Channel IDs with patterns: `team-engineering`, `project-alpha`, etc.

## Troubleshooting

### Common Issues

1. **Missing Dependencies**:
   ```bash
   pip install pubnub faker python-dotenv
   ```

2. **Environment Variables Not Found**:
   - Ensure `.env` file exists in the utils directory
   - Check that your PubNub keys are correct
   - Verify App Context is enabled in your PubNub Admin Portal

3. **Rate Limiting**:
   - Reduce batch size: `--batch-size 5`
   - The script already includes delays to prevent rate limiting

4. **Memory Issues with Large Datasets**:
   - Use smaller batch sizes
   - Run in smaller chunks (e.g., 500 users at a time)

5. **PubNub API Errors**:
   - Ensure App Context is enabled in your keyset
   - Check that your keys have the necessary permissions
   - Verify your keyset has sufficient quota

### Success Indicators

The script will show:
- ✅ Progress counters for users and channels created
- ✅ Membership creation progress with percentages
- ✅ Final summary with counts and timing
- ✅ Success message with link encouragement to test the page

### Error Handling

The script includes automatic cleanup on errors and interruption (Ctrl+C). If something goes wrong, it will attempt to remove any partially created data.

## Support

If you encounter issues with the script, check:
1. PubNub Admin Portal for App Context configuration
2. API key permissions and quotas
3. Network connectivity
4. Python environment and dependencies