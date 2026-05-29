const mongoose = require("mongoose");
const Subscription = require("../modules/subscription/models/Subscription");
const User = require("../modules/auth/auth.model");
const { listSubscribers } = require("../modules/subscription/controllers/admin.controller");

describe("Subscription subscribers controller planType normalization", () => {
  const userId = new mongoose.Types.ObjectId();
  const now = new Date();

  beforeEach(async () => {
    // Create test users
    await User.create([
      {
        _id: userId,
        phone: "+61412345678",
        email: "test@example.com",
      },
    ]);

    // Create subscriptions with different planTypes
    await Subscription.create([
      {
        userId,
        productId: "com.keenasmustard.premium.1month",
        planType: "1_MONTH",
        status: "ACTIVE",
        platform: "ios",
        startedAt: now,
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        environment: "production",
        autoRenew: true,
      },
      {
        userId,
        productId: "com.keenasmustard.premium.3month",
        planType: "3_MONTH",
        status: "ACTIVE",
        platform: "android",
        startedAt: now,
        expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        environment: "production",
        autoRenew: true,
      },
    ]);
  });

  const buildReq = (query) => ({ query });
  const buildRes = () => ({ json: jest.fn() });
  const next = jest.fn();

  beforeEach(() => {
    next.mockClear();
  });

  const callListSubscribers = async (query) => {
    const req = buildReq(query);
    const res = buildRes();
    await listSubscribers(req, res, next);
    if (res.json.mock.calls.length > 0) {
      return res.json.mock.calls[0][0];
    }
    return null;
  };

  it("filters by planType=ONE_MONTH (frontend format)", async () => {
    const body = await callListSubscribers({ planType: "ONE_MONTH", page: 1, limit: 20 });

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].planType).toBe("1_MONTH");
  });

  it("filters by planType=THREE_MONTHS (frontend format)", async () => {
    const body = await callListSubscribers({ planType: "THREE_MONTHS", page: 1, limit: 20 });

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].planType).toBe("3_MONTH");
  });

  it("filters by planType=1_MONTH (internal format backward compatibility)", async () => {
    const body = await callListSubscribers({ planType: "1_MONTH", page: 1, limit: 20 });

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].planType).toBe("1_MONTH");
  });

  it("returns all subscriptions when no planType filter", async () => {
    const body = await callListSubscribers({ page: 1, limit: 20 });

    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
  });
});
