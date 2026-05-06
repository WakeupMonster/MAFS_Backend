const fs = require('fs');
let c = fs.readFileSync('exports/generate-combined.js', 'utf8');

const giveawayMod = `  { name: '🎰 GIVEAWAY / SPINWHEEL MODULE', color: '#d97706', rows: [
    [1,'Claim Prize','/api/v1/giveaway/claim','POST','✅ Yes','Claim a giveaway prize after winning the spin.\\nRequires winHistoryId and claimEmail.\\nChecks if user has active store subscription.\\nSets deliveryStatus to REVEALED.',\`{ "winHistoryId": "ObjectId", "claimEmail": "user@example.com" }\`,200,\`{ "success": true, "message": "Prize claimed successfully", "data": { "claimedAt": "ISO", "deliveryStatus": "REVEALED", "claimEmail": "..." } }\`,'400, 404, 500',\`{ "success": false, "message": "Win ID (winHistoryId) is required to claim the prize" }\\n{ "success": false, "message": "A valid email address is required" }\\n{ "success": false, "message": "No unclaimed prize found" }\`,'1) Missing winHistoryId → 400\\n2) Invalid email → 400\\n3) Already claimed → 404\\n4) Internal → 500'],
    [2,'Get Giveaway Info','/api/v1/giveaway/info','GET','✅ Yes','Fetch giveaway landing page content.\\nReturns brands, howItWorks steps, and importantInfo.\\nCreates default doc if none exists.',\`None\`,200,\`{ "success": true, "message": "Giveaway info fetched successfully", "data": { "brands": [{ "heading": "...", "subheading": "..." }], "howItWorks": [...], "importantInfo": { "heading": "...", "points": [...] } } }\`,'500',\`{ "success": false, "message": "Internal server error" }\`,'1) Auto-creates defaults if empty\\n2) Internal → 500'],
    [3,'Update Giveaway Info','/api/v1/giveaway/info','POST','✅ Yes','Update giveaway landing page content.\\nAccepts brands[], howItWorks[], importantInfo{}.',\`{ "brands": [{ "heading": "Amazon", "subheading": "Gift Cards" }], "howItWorks": [{ "heading": "Step 1", "subheading": "Subscribe" }], "importantInfo": { "heading": "Note", "points": ["Point 1"] } }\`,200,\`{ "success": true, "message": "Giveaway info updated successfully", "data": { ... } }\`,'500',\`{ "success": false, "message": "Internal server error" }\`,'1) Partial update supported\\n2) Internal → 500'],
    [4,'My Giveaways','/api/v1/giveaway/my-giveaways','GET','✅ Yes','Get user\\'s full giveaway history + spin wheel config.\\nReturns all wins with prize details, claim status,\\ncoupon codes (if delivered). Includes spinConfig with\\nwheel items and winnerIndex for UI animation.',\`None\`,200,\`{ "success": true, "totalWins": 2, "data": { "history": [{ "id": "...", "wonAt": "ISO", "claimedAt": "ISO", "deliveryStatus": "DELIVERED", "couponCode": "ABC123", "prize": { "title": "...", "value": 50, "type": "GIFT_CARD" }, "campaign": { "title": "...", "drawStatus": "DRAWN" } }], "spinConfig": { "available": true, "showSpin": true, "winnerIndex": 3, "items": [{ "label": "..." }] } } }\`,'500',\`{ "success": false, "message": "Failed to fetch giveaway history" }\`,'1) No wins → empty history[]\\n2) Unclaimed win → showSpin: true\\n3) Delivered → shows couponCode\\n4) Internal → 500'],
  ]},`;

// Insert before CMS module
c = c.replace("{ name: '📄 CMS / CONTENT MODULE'", giveawayMod + "\n  { name: '📄 CMS / CONTENT MODULE'");

// Update footer
c = c.replace("12 Modules: Auth, Profile, Swipe, Chat, Notification, Subscription, Webhook, Account, Blocked Contacts, Boost, Support, CMS",
              "13 Modules: Auth, Profile, Swipe, Chat, Notification, Subscription, Webhook, Account, Blocked Contacts, Giveaway, Support, CMS, Boost");

fs.writeFileSync('exports/generate-combined.js', c);
console.log('Giveaway Module Added!');
