# MongoDB URI Fix Required

## Issue Found
Your `.env` file has an incorrect MongoDB URI format:
```
MONGO_URI=mongodb+srv://daleh:Dalleh123@cluster0.lbkpzbb.mongodb.net/?halalify=Cluster0
```

## Problem
The `?halalify=Cluster0` parameter is invalid. MongoDB connection strings should specify the database name directly, not as a query parameter.

## Correct Format
```
MONGO_URI=mongodb+srv://daleh:Dalleh123@cluster0.lbkpzbb.mongodb.net/halalify
```

## What Changed
- **Before**: `...mongodb.net/?halalify=Cluster0`
- **After**: `...mongodb.net/halalify`

The database name `halalify` should come after the `/` and before any query parameters.

## Next Steps
1. Update the MONGO_URI in both:
   - Local `.env` file
   - Railway environment variables
2. Restart the local server (if needed)
3. Redeploy to Railway (or restart the service)
4. Run the test user creation script

## Command to Update Locally
Edit `.env` and change the MONGO_URI line to:
```
MONGO_URI=mongodb+srv://daleh:Dalleh123@cluster0.lbkpzbb.mongodb.net/halalify
```

Then restart: `npm start`
