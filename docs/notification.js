[
  // 🔔 New Match Alert
  {
    user: "69326e698057256d8ceea096",
    type: "NEW_MATCH",
    title: "New Match Alert 🎉",
    body: "You've got a new match waiting to connect with you. Start a conversation!",
    image: "https://cdn.app.com/users/u123.jpg",
    action: {
      screen: "chat",
      payload: { matchId: "MATCH_ID" },
    },
  },

  // 💬 New Connection Request
  {
    type: "CONNECTION_REQUEST",
    title: "New Connection Request 💑",
    body: "Someone wants to connect with you. Accept their request and start chat now!",
    image: "https://cdn.app.com/users/u456.jpg",
    action: {
      screen: "match",
      payload: { userId: "USER_ID" },
    },
  },

  // 🔐 Account Security Alert

  {
    type: "SECURITY_ALERT",
    title: "Account Security Alert 🔒",
    body: "We've detected unusual activity. Please verify your account for added security.",
    action: {
      screen: "settings",
      payload: { section: "security" },
    },
  },

  // ⭐ Premium Promotion
  {
    type: "PREMIUM_PROMO",
    title: "Unlock Premium Features ✨",
    body: "Upgrade to Premium for exclusive benefits & enhance your experience!",
    action: {
      screen: "premium",
    },
  },
];

/*
metadata: {
  ip: "192.168.1.10",
  device: "Android",
  riskLevel: "high"
}
*/
