const fs = require('fs');

async function testApi() {
  console.log("Reading a token...");
  const tokens = JSON.parse(fs.readFileSync('k6/data/load_test_tokens.json', 'utf8'));
  const token = tokens[0];
  
  console.log("Token found. Testing /swipe/feed...");
  const feedRes = await fetch('http://localhost:3001/api/v1/swipe/feed?page=1&limit=5', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const feedData = await feedRes.json();
  
  if (!feedData.success) {
    console.error("❌ Feed failed:", feedData);
    process.exit(1);
  }
  
  console.log("✅ Feed Success! Returned profiles:", feedData.data.length);
  
  if (feedData.data.length > 0) {
    const targetId = feedData.data[0].userId;
    console.log(`Testing Swipe 'like' on target: ${targetId}...`);
    
    const swipeRes = await fetch('http://localhost:3001/api/v1/swipe/action', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ targetId, action: 'like' })
    });
    
    const swipeData = await swipeRes.json();
    if (!swipeData.success) {
      console.error("❌ Swipe failed:", swipeData);
      process.exit(1);
    }
    console.log("✅ Swipe Success! Result:", swipeData.message);
  } else {
    console.log("No profiles in feed to swipe on.");
  }
  
  console.log("🎉 ALL TESTS PASSED. NO BREAKAGES.");
}

testApi();
