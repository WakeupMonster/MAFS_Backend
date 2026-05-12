# 🛠️ MongoDB Atlas Connection Troubleshooting

If you see `ECONNREFUSED` or `querySrv` errors, follow these steps:

### 1. Flush DNS Cache (Windows)
Open PowerShell as Administrator and run:
```powershell
ipconfig /flushdns
```

### 2. Switch to Google DNS
Your current internet (ISP) might be blocking MongoDB SRV records.
1. Open **Control Panel** > **Network and Sharing Center**.
2. Click **Change adapter settings**.
3. Right-click your connection > **Properties**.
4. Select **Internet Protocol Version 4 (TCP/IPv4)** > **Properties**.
5. Set DNS to:
   - Preferred: `8.8.8.8`
   - Alternate: `8.8.4.4`

### 3. Check Atlas IP Whitelist
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. Go to **Network Access**.
3. Ensure your current IP is added, or add `0.0.0.0/0` (Allow All) temporarily for testing.

### 4. Use Non-SRV Connection String
If DNS still fails, use the old format in your `.env` (Replace with your user/pass):
```
MONGODB_URI=mongodb://user:pass@node1:27017,node2:27017,node3:27017/?ssl=true&authSource=admin&replicaSet=atlas-xxxx-shard-0
```

### 5. Try Mobile Hotspot
If you are on a Corporate/Office/College WiFi, they often block port 27017. Switching to a Mobile Hotspot usually fixes this instantly.