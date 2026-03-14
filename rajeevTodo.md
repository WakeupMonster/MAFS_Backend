change MAFS to Keen As Mustard.
remove susbcription object from user object.
how many filters in premiumFeatures.
feature in catalog response
admin can increase/decrease likes,superlike
test restore purchase
dry run for this line :- 4.	Your backend receives a webhook (UPGRADE / DID_CHANGE_RENEWAL_PREF) and updates the subscription record with the new plan and expiry date.
dry run how webhook works
{
  "milestone": {
    "type": "FIRST_1000_USERS",
    "target": 1000,
    "claimed": 743,
    "remaining": 257,
    "isAvailable": true,
    "progressPercent": 74.3
  }
}
free/premium likes,superlikes, boost will be backend congif / admin config

| **Grant free subscription to user** | ✅ YES | Admin-granted, no store |


In catalog response.
 "freeFeatures": [
    "6 likes per day",
    "1 Super Keen per day",
    "1 rewind per day",
    "Basic filters"
  ],
  "milestone": {
    "type": "FIRST_1000_USERS",
    "target": 1000,
    "claimed": 743,
    "remaining": 257,
    "isAvailable": true,
    "canClaim": true
  },


test create product 


quantity in product schema.

plantype (line 317) and in subscriber management filter




in getting match or somewhere in API. it is asked for subscription.
delete activities


Today's 


Boost API documented.


Issue 9: What Are All Valid Swipe Actions?
The example shows action: "like". What are ALL valid values?

"like" — confirmed
"dislike" or "pass" — which one?
"superlike" or "superkeen" — which one?
"rewind" — is this a swipe action or separate?
Flutter needs the exact string values.


Google Play Consumables & Webhook Fix Plan


 "premiumFeatures": {
                "seeWhoLikedYou": true,
                "passport": false,  ---   How it will work
                "advancedFilters": true,
                "noAds": true
            },


user A has 1 month premium then he clicks on the 3 month purchase button.



{
    "success": true,
    "message": "Subscription verified successfully",
    "data": {
        "purchaseType": "SUBSCRIPTION",
        "subscription": {
            "id": "69b51f5b9a4bb1601ff6fe99",
            "status": "ACTIVE",
            "planType": "3_MONTH",
            "platform": "android",
            "productId": "com.keenasmustard.premium.3month",
            "startedAt": "2026-03-14T08:42:03.161Z",
            "expiresAt": "2026-04-13T08:42:03.161Z",
            "autoRenew": true
        },
        "status": {
            "isPremium": true,
            "productId": "com.keenasmustard.premium.1month",
            "status": "ACTIVE",
            "expiresAt": "2026-04-13T06:34:15.887Z",
            "autoRenew": true,
            "isCancelled": false,
            "cancelledAt": null,
            "allocations": {
                "likes": {
                    "limit": -1,
                    "used": 0,
                    "remaining": -1,
                    "period": "daily",
                    "resetsAt": "2026-03-14T13:00:00.000Z"
                },
                "rewinds": {
                    "limit": -1,
                    "used": 0,
                    "remaining": -1,
                    "period": "daily",
                    "resetsAt": "2026-03-14T13:00:00.000Z"
                },
                "superKeens": {
                    "limit": 3,
                    "used": 3,
                    "remaining": 0,
                    "period": "daily",
                    "resetsAt": "2026-03-14T13:00:00.000Z"
                },
                "boosts": {
                    "limit": 2,
                    "used": 2,
                    "remaining": 0,
                    "period": "monthly",
                    "resetsAt": "2026-03-31T13:00:00.000Z"
                }
            },
            "wallet": {
                "superKeens": 7,
                "boosts": 14
            },
            "premiumFeatures": {
                "seeWhoLikedYou": true,
                "passport": false,
                "advancedFilters": true,
                "noAds": true
            },
            "showAds": false
        }
    }
}