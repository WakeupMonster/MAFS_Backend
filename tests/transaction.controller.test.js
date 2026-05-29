const mongoose = require("mongoose");
const SubscriptionTransaction = require("../modules/subscription/models/SubscriptionTransaction");
const { getTransactions } = require("../modules/subscription/controllers/transaction.controller");

describe("Transaction controller platform normalization", () => {
  const userId = new mongoose.Types.ObjectId();
  const occurredAt = new Date();

  beforeEach(async () => {
    await SubscriptionTransaction.create([
      {
        userId,
        platform: "ios",
        productId: "prod_ios",
        eventType: "PURCHASE",
        amount: 10,
        occurredAt,
      },
      {
        userId,
        platform: "android",
        productId: "prod_android",
        eventType: "PURCHASE",
        amount: 20,
        occurredAt,
      },
      {
        userId,
        platform: "ADMIN",
        productId: "prod_admin",
        eventType: "ADMIN_GRANT",
        amount: 0,
        occurredAt,
      },
    ]);

    await SubscriptionTransaction.collection.insertOne({
      userId,
      platform: "admin_granted",
      productId: "prod_admin_granted",
      eventType: "ADMIN_GRANT",
      amount: 0,
      occurredAt,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    });
  });

  const buildReq = (query) => ({ query });
  const buildRes = () => ({ json: jest.fn() });
  const next = jest.fn();

  beforeEach(() => {
    next.mockClear();
  });

  const callGetTransactions = async (query) => {
    const req = buildReq(query);
    const res = buildRes();
    await getTransactions(req, res, next);
    return res.json.mock.calls[0][0];
  };

  it("returns only iOS transactions when platform=ios", async () => {
    const body = await callGetTransactions({ platform: "ios", page: 1, limit: 20 });

    expect(body.success).toBe(true);
    expect(body.transactions).toHaveLength(1);
    expect(body.transactions[0].platform).toBe("ios");
  });

  it("returns only Android transactions when platform=android", async () => {
    const body = await callGetTransactions({ platform: "android", page: 1, limit: 20 });

    expect(body.transactions).toHaveLength(1);
    expect(body.transactions[0].platform).toBe("android");
  });

  it("returns admin grant transactions for platform=admin", async () => {
    const body = await callGetTransactions({ platform: "admin", page: 1, limit: 20 });

    expect(body.transactions).toHaveLength(2);
    expect(body.transactions.map((tx) => tx.platform).sort()).toEqual(["ADMIN", "admin_granted"].sort());
  });

  it("returns same result for platform=admin_granted as platform=admin", async () => {
    const adminBody = await callGetTransactions({ platform: "admin", page: 1, limit: 20 });
    const adminGrantedBody = await callGetTransactions({ platform: "admin_granted", page: 1, limit: 20 });

    expect(adminBody.transactions).toHaveLength(2);
    expect(adminGrantedBody.transactions).toHaveLength(2);
    expect(adminBody.transactions.map((tx) => tx.productId).sort()).toEqual(
      adminGrantedBody.transactions.map((tx) => tx.productId).sort(),
    );
  });

  it("returns all transactions when platform is absent", async () => {
    const body = await callGetTransactions({ page: 1, limit: 20 });

    expect(body.transactions).toHaveLength(4);
    expect(body.pagination.totalItems).toBe(4);
  });
});
