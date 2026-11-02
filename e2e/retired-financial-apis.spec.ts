import { expect, test } from "@playwright/test";

for (const endpoint of ["transactions", "vouchers"]) {
  test(`anonymous ${endpoint} requests return an explicit retirement response`, async ({ request }) => {
    const response = await request.get(`/api/${endpoint}`);
    expect(response.status()).toBe(410);
    expect(response.headers()["cache-control"]).toBe("no-store");
    const body = await response.json();
    expect(body.error.code).toBe("endpoint_retired");
    expect(body).not.toHaveProperty("data");
    expect(body).not.toHaveProperty("balance");
    expect(body).not.toHaveProperty("total");
  });
}
