/* eslint-disable no-undef */
const request = require("supertest");
const app = require("../app");

describe("Auth Register API", () => {

  it("should return 400 if username is missing", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        email: "test@test.com",
        password: "123456"
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("should return 201 if user is created", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({
        username: "raj",
        email: "test@test.com",
        password: "123456"
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.success).toBe(true);
  });

});
