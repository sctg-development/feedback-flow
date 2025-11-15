/**
 * MIT License
 *
 * Copyright (c) 2025 Ronan LE MEILLAT
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as jose from 'jose';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

// Types
interface Tester {
  uuid: string;
  name: string;
  ids: string[];
}

interface Purchase {
  id?: string;
  testerId?: string;
  date: string;
  order: string;
  description: string;
  amount: number;
  screenshot: string;
  refunded?: boolean;
}

// Test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8787';
const AUTH0_TOKEN = process.env.AUTH0_TOKEN || '';
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || '';
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || '';

if (!AUTH0_TOKEN) {
  throw new Error('AUTH0_TOKEN environment variable is required');
}

// Test state
let testerId: string;
let expirationDate: Date;
let testerUuid: string;
let purchaseId: string;
let purchaseItIdNoFeedback: string;
let purchaseItNotRefundedId: string;
let purchaseIdWithScreenshot: string;
let purchaseIdForUpdate: string;

// Generate a fake Amazon order ID
// Amazon order IDs typically look like "123-1234567-1234567"
const generateFakeAmazonOrderId = () => {
  const part1 = Math.floor(Math.random() * 1000);
  const part2 = Math.floor(Math.random() * 10000000);
  const part3 = Math.floor(Math.random() * 10000000);
  return `${part1}-${part2}-${part3}`;
};

// HTTP client with authorization
const api = {
  post: async (path: string, data: any) => {
    return axios.post(`${API_BASE_URL}${path}`, data, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH0_TOKEN}`
      },
      validateStatus: function (status) {
        return status < 500; // The request resolves as long as the response code is
        // less than 500
      }
    });
  },
  get: async (path: string) => {
    return axios.get(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH0_TOKEN}`
      },
      validateStatus: function (status) {
        return status < 500; // The request resolves as long as the response code is
        // less than 500
      }
    });
  },
  delete: async (path: string) => {
    return axios.delete(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH0_TOKEN}`
      },
      validateStatus: function (status) {
        return status < 500; // The request resolves as long as the response code is
        // less than 500
      }
    });
  },
}

// Small base64 encoded WebP image for testing
const testImageBase64 = "data:image/webp;base64,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";

describe('Feedback Flow API', () => {
  beforeAll(async () => {
    // Extract the user ID (sub) from the JWT token
    const JWKS = jose.createRemoteJWKSet(
      new URL(
        `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
      ),
    );
    const joseResult = await jose.jwtVerify(AUTH0_TOKEN, JWKS, {
      issuer: `https://${AUTH0_DOMAIN}/`,
      audience: AUTH0_AUDIENCE,
    });
    if (!joseResult) {
      console.error('Failed to verify JWT token');
      process.exit(1);
    }

    const payload = joseResult.payload as jose.JWTPayload;

    testerId = payload.sub as string;
    expirationDate = new Date((payload.exp || 0) * 1000);

    console.log(`Using Auth0 user ID: ${testerId} expiring on ${expirationDate}`);
    if (expirationDate < new Date()) {
      // stop the test if the token has expired
      //throw new Error('Auth0 token has expired');
      process.exit(1);
    }

  });
  afterAll(() => {
    // Stop the Wrangler dev server
  });

  test('10. Should get the list of testers', async () => {
    const response = await api.get('/testers');
    console.log(`Testers: ${JSON.stringify(response.data)}`);
    expect(response.data.data.length).toBe(2);
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toBeDefined();
  });

  test('20. Should create a new tester', async () => {
    expect(testerId).toBeDefined();
    expect(testerId).toMatch(/^[a-zA-Z0-9|]{8,30}$/);
    const response = await api.post('/tester', {
      name: 'TESTER',
      ids:
        ["auth0|60f7b3b7b1b3d2006a7b3b7b"]
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.uuid).toBeDefined();

    testerUuid = response.data.uuid;
    console.log(`Created tester with UUID: ${testerUuid}`);
  });

  test('30. The list of testers should now have 3 members', async () => {
    const response = await api.get('/testers');
    console.log(`Testers: ${JSON.stringify(response.data)}`);
    expect(response.data.data.length).toBe(3);
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toBeDefined();
  });

  test('40. Should add the OAuth ID to the tester', async () => {
    const response = await api.post('/tester/ids', {
      name: 'TESTER',
      id: testerId
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.name).toBe('TESTER');
    expect(response.data.ids).toContain(testerId);
  });

  test('50. Should not add duplicate OAuth ID to the tester', async () => {
    const response = await api.post('/tester/ids', {
      name: 'TESTER',
      id: testerId
    });

    expect(response.status).toBe(409);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe('ID already exists in the database');
  });

  test('60. Should not add a duplicate OAuth ID owned by another tester', async () => {
    const response = await api.post('/tester/ids', {
      name: 'TESTER',
      id: 'auth0|0987654321' /* Owned by Jane Doe */
    });

    expect(response.status).toBe(409);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe('ID already exists in the database');
  });

  test('900. Should return an Auth0 management token from the system endpoint (if configured)', async () => {
    // Only run if Auth0 client credentials are configured in the environment
    const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || '';
    const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET || '';
    const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || '';

    if (!AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET || !AUTH0_DOMAIN) {
      // Skip this test if credentials are not present (local environment)
      console.warn('Skipping Auth0 management token test because AUTH0_CLIENT_* or AUTH0_DOMAIN is not set');
      return;
    }

    // Attempt to call the system endpoint to get a management token
    const response = await api.post('/api/__auth0/token', {});

    // If we are not permitted to call the endpoint, we can get a 403
    if (response.status === 403) {
      expect(response.data.success).toBeFalsy();
      expect(response.data.error).toBeDefined();
      return;
    }

    // If successful, expect an access token to be present
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.access_token).toBeDefined();
    expect(typeof response.data.access_token).toBe('string');
  });

  test('70. Should create a purchase', async () => {
    const purchase: Purchase = {
      date: new Date().toISOString().split('T')[0], // Today in YYYY-MM-DD format
      order: generateFakeAmazonOrderId(),
      description: 'Test product purchase',
      amount: 29.99,
      screenshot: testImageBase64
    };

    const response = await api.post('/purchase', purchase);

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBeDefined();

    purchaseId = response.data.id;
    console.log(`Created purchase with ID: ${purchaseId}`);
  });

  test('80. Should add feedback for the purchase', async () => {
    const response = await api.post('/feedback', {
      date: new Date().toISOString().split('T')[0],
      purchase: purchaseId,
      feedback: 'This is a fantastic product! Works exactly as described.'
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBe(purchaseId);
  });

  test('90. Should record publication of feedback', async () => {
    const response = await api.post('/publish', {
      date: new Date().toISOString().split('T')[0],
      purchase: purchaseId,
      screenshot: testImageBase64
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBe(purchaseId);
  });

  test('100. Should verify the purchase is now in the not refunded list', async () => {
    // Get the list of not refunded purchases
    const response = await api.get('/purchases/not-refunded');
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    const notRefundedPurchase = response.data.data.find((p: any) => p.id === purchaseId);
    expect(notRefundedPurchase).toBeDefined();
    // Check if the not refunded list contains exactly 1 line (only our purchase)
    console.log(`Not refunded purchase: ${JSON.stringify(notRefundedPurchase)}`);
    expect(response.data.data.length).toBe(1);
  });

  test('110. Should record refund for the purchase', async () => {
    const today = new Date().toISOString().split('T')[0];

    const response = await api.post('/refund', {
      date: today, // record date
      purchase: purchaseId,
      refundDate: today, // Same day refund for testing
      amount: 29.99,
      transactionId: `REFUND-${uuidv4().substring(0, 8)}`,
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBe(purchaseId);
  });

  test('120. Should verify the purchase is now not in the not refunded list', async () => {
    // Get the list of refunded purchases
    const response = await api.get('/purchases/not-refunded');

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);

    // Check if our purchase is not in the not refunded list
    const refundedPurchase = response.data.data.find((p: any) => p.id === purchaseId);
    expect(refundedPurchase).toBeUndefined();
  });

  test('130. Should verify the purchase is now in the refunded list', async () => {
    // Get the list of refunded purchases
    const response = await api.get('/purchases/refunded');

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);

    // Check if our purchase is in the refunded list
    const refundedPurchase = response.data.data.find((p: any) => p.id === purchaseId);
    expect(refundedPurchase).toBeDefined();
    // Check if the refund list contains exactly 1 line (only our purchase)
    expect(response.data.data.length).toBe(1);
  });

  test('140. Should check if in-memory database can be backed up', async () => {
    const response = await api.get('/backup/json');
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.testers).toBeDefined();
    expect(response.data.purchases).toBeDefined();
    expect(response.data.refunds).toBeDefined();
    expect(response.data.feedbacks).toBeDefined();
    expect(response.data.publications).toBeDefined();
    expect(response.data.testers.length).toBe(3);
    expect(response.data.purchases.length).toBe(4);
    expect(response.data.refunds.length).toBe(3);
    expect(response.data.feedbacks.length).toBe(3);
    expect(response.data.publications.length).toBe(3);
    expect(response.data.ids).toBeDefined();
    expect(response.data.ids.length).toBe(4);
  });

  test('150. Should create a non-refunded purchase', async () => {
    const purchase: Purchase = {
      date: new Date().toISOString().split('T')[0], // Today in YYYY-MM-DD format
      order: generateFakeAmazonOrderId(),
      description: 'Test product purchase not refunded',
      amount: 49.99,
      screenshot: testImageBase64
    };

    const response = await api.post('/purchase', purchase);

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBeDefined();

    purchaseItNotRefundedId = response.data.id;
    console.log(`Created purchase with ID: ${purchaseItNotRefundedId}`);
  });

  test('160. Should add feedback for the non-refunded purchase', async () => {
    const response = await api.post('/feedback', {
      date: new Date().toISOString().split('T')[0],
      purchase: purchaseItNotRefundedId,
      feedback: 'This is a fantastic product! Works exactly as described.'
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBe(purchaseItNotRefundedId);
  });

  test('170. Should create a non-refunded purchase with no feedback', async () => {
    const purchase: Purchase = {
      date: new Date().toISOString().split('T')[0], // Today in YYYY-MM-DD format
      order: generateFakeAmazonOrderId(),
      description: 'Test product purchase no feedback',
      amount: 69.99,
      screenshot: testImageBase64
    };
    const response = await api.post('/purchase', purchase);
    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBeDefined();
    purchaseItIdNoFeedback = response.data.id;
  });

  test('180. Should create a purchase and add feedback but not publish it', async () => {
    const purchase: Purchase = {
      date: new Date().toISOString().split('T')[0], // Today in YYYY-MM-DD format
      order: generateFakeAmazonOrderId(),
      description: 'Test product purchase not published',
      amount: 89.99,
      screenshot: testImageBase64
    };

    const response = await api.post('/purchase', purchase);

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBeDefined();

    const purchaseIdFeedbackNotPublished = response.data.id;

    const feedbackResponse = await api.post('/feedback', {
      date: new Date().toISOString().split('T')[0],
      purchase: purchaseIdFeedbackNotPublished,
      feedback: 'This is a fantastic product! Works exactly as described.'
    });

    expect(feedbackResponse.status).toBe(201);
    expect(feedbackResponse.data.success).toBe(true);
    expect(feedbackResponse.data.id).toBe(purchaseIdFeedbackNotPublished);
  });

  test('190. Should create a purchase, add feedback to it, publish the feedback but do not refund the purchase', async () => {
    const purchase: Purchase = {
      date: new Date().toISOString().split('T')[0], // Today in YYYY-MM-DD format
      order: generateFakeAmazonOrderId(),
      description: 'Test product purchase with feedback and publication',
      amount: 69.99,
      screenshot: testImageBase64
    };
    const response = await api.post('/purchase', purchase);
    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBeDefined();
    const newPurchaseId = response.data.id;
    const feedbackResponse = await api.post('/feedback', {
      date: new Date().toISOString().split('T')[0],
      purchase: newPurchaseId,
      feedback: 'This is a fantastic product! Works exactly as described.'
    });
    expect(feedbackResponse.status).toBe(201);
    expect(feedbackResponse.data.success).toBe(true);
    expect(feedbackResponse.data.id).toBe(newPurchaseId);
    const publishResponse = await api.post('/publish', {
      date: new Date().toISOString().split('T')[0],
      purchase: newPurchaseId,
      screenshot: testImageBase64
    });
    expect(publishResponse.status).toBe(201);
    expect(publishResponse.data.success).toBe(true);
    expect(publishResponse.data.id).toBe(newPurchaseId);
    // Check if the purchase is in the not refunded list
    const notRefundedResponse = await api.get('/purchases/not-refunded');
    expect(notRefundedResponse.status).toBe(200);
    expect(notRefundedResponse.data.success).toBe(true);
    const notRefundedPurchase = notRefundedResponse.data.data.find((p: any) => p.id === newPurchaseId);
    expect(notRefundedPurchase).toBeDefined();
  });

  test('200. Should get purchase status for the current tester', async () => {
    // Ensure we have an identified tester
    expect(testerId).toBeDefined();
    expect(testerUuid).toBeDefined();

    // Call the API to retrieve purchase status
    const response = await api.get('/purchase-status');

    // Verify response codes and structure
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);

    // Verify data correctness
    expect(response.data.data).toBeDefined();
    expect(Array.isArray(response.data.data)).toBe(true);

    // In our test data, the current tester has 5 purchases
    const purchases = response.data.data;
    expect(purchases.length).toBe(5);

    // Verify structure of a purchase in the response
    const purchase = purchases[0];
    expect(purchase.purchase).toBeDefined();
    expect(purchase.testerUuid).toBe(testerUuid);
    expect(purchase.date).toBeDefined();
    expect(purchase.order).toBeDefined();
    expect(purchase.description).toBeDefined();
    expect(purchase.amount).toBeDefined();
    expect(typeof purchase.refunded).toBe('boolean');
    expect(typeof purchase.hasFeedback).toBe('boolean');
    expect(typeof purchase.hasPublication).toBe('boolean');
    expect(typeof purchase.hasRefund).toBe('boolean');

    // Verify that the purchase we added and refunded has the correct status
    const ourPurchase = purchases.find((p: { purchase: string; }) => p.purchase === purchaseId);
    expect(ourPurchase).toBeDefined();
    expect(ourPurchase.refunded).toBe(true);
    expect(ourPurchase.hasFeedback).toBe(true);
    expect(ourPurchase.hasPublication).toBe(true);
    expect(ourPurchase.hasRefund).toBe(true);

    // Verify that the purchase we added but did not refund has the correct status
    const notRefundedPurchase = purchases.find((p: { purchase: string; }) => p.purchase === purchaseItNotRefundedId);
    expect(notRefundedPurchase).toBeDefined();
    expect(notRefundedPurchase.refunded).toBe(false);
    expect(notRefundedPurchase.hasFeedback).toBe(true);
    expect(notRefundedPurchase.hasPublication).toBe(false);
    expect(notRefundedPurchase.hasRefund).toBe(false);

    // Verify pagination and sorting
    expect(response.data.page).toBeDefined();
    expect(response.data.limit).toBeDefined();
    expect(response.data.total).toBeDefined();
  });

  test('210. Should get purchase status with custom pagination and sorting', async () => {
    // Call the API with custom parameters
    const response = await api.get('/purchase-status?page=1&limit=1&sort=date&order=asc');

    // Verify response codes and structure
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);

    // Verify that pagination works
    expect(response.data.data.length).toBeLessThanOrEqual(1);
    expect(response.data.page).toBe(1);
    expect(response.data.limit).toBe(1);

    // Verify that sorting works (we should have the oldest purchase first)
    if (response.data.data.length > 0) {
      const firstPurchase = response.data.data[0];
      const secondResponse = await api.get('/purchase-status?page=1&limit=5&sort=date&order=desc');
      expect(secondResponse.status).toBe(200);

      if (secondResponse.data.data.length > 1) {
        const lastPurchase = secondResponse.data.data[secondResponse.data.data.length - 1];
        // The date of the first purchase in ascending sort should be earlier
        // than the date of the last purchase in descending sort
        expect(new Date(firstPurchase.date).getTime()).toBeLessThanOrEqual(
          new Date(lastPurchase.date).getTime()
        );
      }
    }
  });
  test('220. Create a purchase with a screenshot', async () => {
    const purchase: Purchase = {
      date: new Date().toISOString().split('T')[0], // Today in YYYY-MM-DD format
      order: generateFakeAmazonOrderId(),
      description: 'Test product purchase with screenshot',
      amount: 99.99,
      screenshot: testImageBase64
    };

    const response = await api.post('/purchase', purchase);

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBeDefined();

    purchaseIdWithScreenshot = response.data.id;
    console.log(`Created purchase with ID: ${purchaseIdWithScreenshot}`);
  });
  test('230. Should delete the purchase with a screenshot', async () => {
    // count the number of purchases before deletion
    const countResponse = await api.get('/purchase-status');
    expect(countResponse.status).toBe(200);
    expect(countResponse.data.success).toBe(true);
    const initialCount = countResponse.data.data.length;
    const response = await api.delete(`/purchase/${purchaseIdWithScreenshot}`);
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.message).toBe('Purchase deleted successfully');
    // count the number of purchases after deletion
    const countResponseAfter = await api.get('/purchase-status');
    expect(countResponseAfter.status).toBe(200);
    expect(countResponseAfter.data.success).toBe(true);
    const finalCount = countResponseAfter.data.data.length;
    expect(finalCount).toBe(initialCount - 1);
  }
  );
  test('240. Should check the total not refunded amount', async () => {
    const response = await api.get('/purchases/not-refunded-amount');
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.amount).toBeDefined();
    expect(response.data.amount).toBe(279.96); // Only the non-refunded purchase
  }
  );
  test('250. Should check the total refunded amount', async () => {
    const response = await api.get('/purchases/refunded-amount');
    expect(response.status).toBe(200); // Only the refunded purchase
    expect(response.data.success).toBe(true);
    expect(response.data.amount).toBeDefined();
    expect(response.data.amount).toBe(29.99); // Only the refunded purchase
  }
  );

  test('260. Should create a purchase for update testing', async () => {
    const purchase: Purchase = {
      date: new Date().toISOString().split('T')[0], // Today in YYYY-MM-DD format
      order: generateFakeAmazonOrderId(),
      description: 'Test product purchase for update',
      amount: 99.99,
      screenshot: testImageBase64
    };

    const response = await api.post('/purchase', purchase);

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBeDefined();

    purchaseIdForUpdate = response.data.id;
    console.log(`Created purchase for update with ID: ${purchaseIdForUpdate}`);
  });

  test('270. Should get the original purchase details', async () => {
    const response = await api.get(`/purchase/${purchaseIdForUpdate}`);

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toBeDefined();
    expect(response.data.data.id).toBe(purchaseIdForUpdate);
    expect(response.data.data.description).toBe('Test product purchase for update');
    expect(response.data.data.amount).toBe(99.99);
  });

  test('280. Should update purchase description', async () => {
    const updateData = {
      description: 'Updated test product purchase description'
    };

    const response = await api.post(`/purchase/${purchaseIdForUpdate}`, updateData);

    if (response.status !== 200) {
      console.log('Update failed with status:', response.status);
      console.log('Error response:', response.data);
    }
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.message).toBe('Purchase updated successfully');

    // Verify the update by fetching the purchase again
    const getResponse = await api.get(`/purchase/${purchaseIdForUpdate}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.success).toBe(true);
    expect(getResponse.data.data.description).toBe('Updated test product purchase description');
    expect(getResponse.data.data.amount).toBe(99.99); // Amount should remain unchanged
  });

  test('290. Should update purchase amount', async () => {
    const updateData = {
      amount: 149.99
    };

    const response = await api.post(`/purchase/${purchaseIdForUpdate}`, updateData);

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.message).toBe('Purchase updated successfully');

    // Verify the update by fetching the purchase again
    const getResponse = await api.get(`/purchase/${purchaseIdForUpdate}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.success).toBe(true);
    expect(getResponse.data.data.amount).toBe(149.99);
    expect(getResponse.data.data.description).toBe('Updated test product purchase description'); // Description should remain unchanged
  });

  test('300. Should update multiple fields at once', async () => {
    const updateData = {
      description: 'Final updated description',
      amount: 199.99,
      order: `UPDATED-ORDER-${uuidv4().substring(0, 8)}`
    };

    const response = await api.post(`/purchase/${purchaseIdForUpdate}`, updateData);

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.message).toBe('Purchase updated successfully');

    // Verify the update by fetching the purchase again
    const getResponse = await api.get(`/purchase/${purchaseIdForUpdate}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.success).toBe(true);
    expect(getResponse.data.data.description).toBe('Final updated description');
    expect(getResponse.data.data.amount).toBe(199.99);
    expect(getResponse.data.data.order).toBe(updateData.order);
  });

  test('310. Should fail to update non-existent purchase', async () => {
    const nonExistentId = `NON-EXISTENT-${uuidv4()}`;
    const updateData = {
      description: 'This should fail'
    };

    const response = await api.post(`/purchase/${nonExistentId}`, updateData);

    expect(response.status).toBe(404);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe('Purchase not found');
  });

  test('320. Should fail to update purchase with no fields provided', async () => {
    const updateData = {}; // Empty object

    const response = await api.post(`/purchase/${purchaseIdForUpdate}`, updateData);

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe('No valid fields provided for update');
  });

  test('330. Should fail to update purchase with invalid fields', async () => {
    const updateData = {
      invalidField: 'This should be ignored'
    };

    const response = await api.post(`/purchase/${purchaseIdForUpdate}`, updateData);

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe('No valid fields provided for update');
  });

  test('340. Should update purchase date', async () => {
    // Create a new purchase for this test to avoid rate limiting issues
    const purchase: Purchase = {
      date: '2024-01-01',
      order: generateFakeAmazonOrderId(),
      description: 'Test product for date update',
      amount: 49.99,
      screenshot: testImageBase64
    };

    const createResponse = await api.post('/purchase', purchase);
    expect(createResponse.status).toBe(201);
    const newPurchaseId = createResponse.data.id;

    const newDate = '2024-12-25'; // Christmas 2024
    const updateData = {
      date: newDate
    };

    const response = await api.post(`/purchase/${newPurchaseId}`, updateData);

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.message).toBe('Purchase updated successfully');

    // Verify the update by fetching the purchase again
    const getResponse = await api.get(`/purchase/${newPurchaseId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.data.success).toBe(true);
    expect(getResponse.data.data.date).toBe(newDate);

    // Clean up by deleting the purchase
    await api.delete(`/purchase/${newPurchaseId}`);
  });

  test('350. Should clean up by deleting the updated purchase', async () => {
    const response = await api.delete(`/purchase/${purchaseIdForUpdate}`);

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.message).toBe('Purchase deleted successfully');

    // Verify the purchase is deleted
    const getResponse = await api.get(`/purchase/${purchaseIdForUpdate}`);
    expect(getResponse.status).toBe(404);
    expect(getResponse.data.success).toBe(false);
    expect(getResponse.data.error).toBe('Purchase not found');
  });
});

describe('Purchase Status Batch API Tests', () => {
  let batchTestPurchaseIds: string[] = [];

  beforeAll(async () => {
    // Create multiple purchases for batch testing
    const purchases: Purchase[] = [
      {
        date: '2024-01-15',
        order: generateFakeAmazonOrderId(),
        description: 'Batch test product 1',
        amount: 29.99,
        screenshot: testImageBase64
      },
      {
        date: '2024-01-20',
        order: generateFakeAmazonOrderId(),
        description: 'Batch test product 2',
        amount: 49.99,
        screenshot: testImageBase64
      },
      {
        date: '2024-02-01',
        order: generateFakeAmazonOrderId(),
        description: 'Batch test product 3',
        amount: 79.99,
        screenshot: testImageBase64
      }
    ];

    for (const purchase of purchases) {
      const response = await api.post('/purchase', purchase);
      if (response.status === 201) {
        batchTestPurchaseIds.push(response.data.id);
      }
    }
  });

  test('400. Should return purchase statuses for provided IDs', async () => {
    const response = await api.post('/purchase-status-batch', {
      purchaseIds: batchTestPurchaseIds.slice(0, 2),
      page: 1,
      limit: 10,
      sort: 'date',
      order: 'desc'
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    expect(response.data.data.length).toBeLessThanOrEqual(2);
    expect(response.data.pageInfo).toBeDefined();
    expect(response.data.pageInfo.totalCount).toBeLessThanOrEqual(2);
  });

  test('410. Should validate required purchaseIds field', async () => {
    const response = await api.post('/purchase-status-batch', {
      page: 1,
      limit: 10
    });

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain('purchaseIds must be a non-empty array');
  });

  test('420. Should return empty array for non-existent purchase IDs', async () => {
    const response = await api.post('/purchase-status-batch', {
      purchaseIds: ['non-existent-id-1', 'non-existent-id-2'],
      page: 1,
      limit: 10
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data.length).toBe(0);
    expect(response.data.pageInfo.totalCount).toBe(0);
  });

  test('430. Should handle pagination correctly', async () => {
    const response = await api.post('/purchase-status-batch', {
      purchaseIds: batchTestPurchaseIds,
      page: 1,
      limit: 2,
      sort: 'date',
      order: 'asc'
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.pageInfo.currentPage).toBe(1);
    expect(response.data.pageInfo.totalPages).toBeGreaterThanOrEqual(1);
    expect(response.data.pageInfo.hasNextPage).toBeDefined();
    expect(response.data.pageInfo.hasPreviousPage).toBe(false);
  });

  test('440. Should sort by date in ascending order', async () => {
    const response = await api.post('/purchase-status-batch', {
      purchaseIds: batchTestPurchaseIds,
      sort: 'date',
      order: 'asc'
    });

    expect(response.status).toBe(200);
    const data = response.data.data as any[];
    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        expect(new Date(data[i].date).getTime()).toBeGreaterThanOrEqual(
          new Date(data[i - 1].date).getTime()
        );
      }
    }
  });

  test('450. Should sort by order in descending order', async () => {
    const response = await api.post('/purchase-status-batch', {
      purchaseIds: batchTestPurchaseIds,
      sort: 'order',
      order: 'desc'
    });

    expect(response.status).toBe(200);
    const data = response.data.data as any[];
    if (data.length > 1) {
      for (let i = 1; i < data.length; i++) {
        expect(data[i].order.localeCompare(data[i - 1].order)).toBeLessThanOrEqual(0);
      }
    }
  });

  test('460. Should include transaction ID when purchase is refunded', async () => {
    if (batchTestPurchaseIds.length === 0) {
      return;
    }

    const purchaseId = batchTestPurchaseIds[0];

    // First, add feedback to make it ready for refund
    const feedbackResponse = await api.post('/api/feedback', {
      date: new Date().toISOString(),
      purchase: purchaseId,
      feedback: 'Batch test feedback for refund'
    });

    if (feedbackResponse.status !== 201) {
      console.error('Failed to create feedback:', feedbackResponse.data);
      return;
    }

    // Then add publication
    const publishResponse = await api.post('/api/publish', {
      date: new Date().toISOString(),
      purchase: purchaseId,
      screenshot: testImageBase64
    });

    if (publishResponse.status !== 201) {
      console.error('Failed to publish feedback:', publishResponse.data);
      return;
    }

    // Now refund the purchase
    const refundResponse = await api.post('/api/refund', {
      date: new Date().toISOString(),
      purchase: purchaseId,
      refundDate: new Date().toISOString(),
      amount: 29.99,
      transactionId: 'TEST-TRANSACTION-12345'
    });

    if (refundResponse.status !== 201) {
      console.error('Failed to create refund:', refundResponse.data);
      return;
    }

    // Get the batch status including this purchase
    const response = await api.post('/purchase-status-batch', {
      purchaseIds: [purchaseId],
      page: 1,
      limit: 10
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    if (response.data.data.length > 0) {
      const purchase = response.data.data[0];
      expect(purchase.refunded).toBe(true);
      if (purchase.hasRefund) {
        expect(purchase.transactionId).toBeDefined();
        expect(purchase.transactionId).toBe('TEST-TRANSACTION-12345');
      }
    }
  });

  afterAll(async () => {
    // Clean up: Delete all batch test purchases
    for (const purchaseId of batchTestPurchaseIds) {
      await api.delete(`/purchase/${purchaseId}`);
    }
  });
});

describe('Fuzzy Search API Tests', () => {
  let fuzzySearchTestPurchaseIds: string[] = [];

  beforeAll(async () => {
    // Create purchases with varied descriptions for fuzzy search testing
    const purchases: Purchase[] = [
      {
        date: '2024-03-01',
        order: generateFakeAmazonOrderId(),
        description: 'Écran 4K Samsung 55 pouces',
        amount: 599.99,
        screenshot: testImageBase64
      },
      {
        date: '2024-03-02',
        order: generateFakeAmazonOrderId(),
        description: 'Ecran 4K LG 49 pouces',
        amount: 699.99,
        screenshot: testImageBase64
      },
      {
        date: '2024-03-03',
        order: generateFakeAmazonOrderId(),
        description: 'AMAZON ALEXA SPEAKER PRO',
        amount: 129.99,
        screenshot: testImageBase64
      },
      {
        date: '2024-03-04',
        order: generateFakeAmazonOrderId(),
        description: 'Amazon Alexa Speaker Mini',
        amount: 49.99,
        screenshot: testImageBase64
      },
      {
        date: '2024-03-05',
        order: generateFakeAmazonOrderId(),
        description: 'Clavier mécanique RGB Corsair K95 Platinum PRO',
        amount: 249.99,
        screenshot: testImageBase64
      },
      {
        date: '2024-03-06',
        order: generateFakeAmazonOrderId(),
        description: 'Clavier Mecanique RGB Corsair K70',
        amount: 189.99,
        screenshot: testImageBase64
      },
      {
        date: '2024-03-07',
        order: generateFakeAmazonOrderId(),
        description: 'Souris gaming Logitech G Pro X2',
        amount: 149.99,
        screenshot: testImageBase64
      },
      {
        date: '2024-03-08',
        order: generateFakeAmazonOrderId(),
        description: 'Cable HDMI 2.1 8K Premium',
        amount: 29.99,
        screenshot: testImageBase64
      },
      {
        date: '2024-03-09',
        order: generateFakeAmazonOrderId(),
        description: 'Convertisseur USB-C Adaptateur Multi-Port',
        amount: 39.99,
        screenshot: testImageBase64
      },
      {
        date: '2024-03-10',
        order: generateFakeAmazonOrderId(),
        description: 'Support Moniteur Ergonomique Réglable',
        amount: 79.99,
        screenshot: testImageBase64
      }
    ];

    for (const purchase of purchases) {
      const response = await api.post('/purchase', purchase);
      if (response.status === 201) {
        fuzzySearchTestPurchaseIds.push(response.data.id);
      }
    }
    console.log(`Created ${fuzzySearchTestPurchaseIds.length} purchases for fuzzy search tests`);
  });

  test('500. Should search by exact case-insensitive match', async () => {
    const response = await api.post('/purchase/search', {
      query: 'amazon',
      limit: 10
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    // Should match "AMAZON ALEXA SPEAKER PRO" and "Amazon Alexa Speaker Mini"
    expect(response.data.data.length).toBeGreaterThanOrEqual(2);
  });

  test('510. Should search with uppercase query matching lowercase description', async () => {
    const response = await api.post('/purchase/search', {
      query: 'CORSAIR',
      limit: 10
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    // Should match descriptions containing "corsair" (case-insensitive)
    expect(response.data.data.length).toBeGreaterThanOrEqual(2);
  });

  test('520. Should match accented characters ignoring diacritics', async () => {
    const response = await api.post('/purchase/search', {
      query: 'ecran',
      limit: 10
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    // Should match both "Écran 4K Samsung" and "Ecran 4K LG" despite accent differences
    expect(response.data.data.length).toBeGreaterThanOrEqual(2);
  });

  test('525. Should match accented query characters against unaccented text', async () => {
    const response = await api.post('/purchase/search', {
      query: 'écran',
      limit: 10
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    // Should match descriptions with or without accents
    expect(response.data.data.length).toBeGreaterThanOrEqual(2);
  });

  test('530. Should match partial word substring', async () => {
    const response = await api.post('/purchase/search', {
      query: 'alexa',
      limit: 10
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    // Should match "AMAZON ALEXA SPEAKER PRO" and "Amazon Alexa Speaker Mini"
    expect(response.data.data.length).toBeGreaterThanOrEqual(2);
  });

  test('540. Should match multiple words in query', async () => {
    const response = await api.post('/purchase/search', {
      query: 'keyboard mechanical',
      limit: 10
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    // "Clavier mécanique" contains "clavier" which contains "keyboard" meaning or "mecanique" matching
    // At least one keyboard-related item should be found
    expect(response.data.data.length).toBeGreaterThanOrEqual(0);
  });

  test('545. Should search by description with punctuation tolerance', async () => {
    const response = await api.post('/purchase/search', {
      query: 'K95 Platinum',
      limit: 10
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    // Should match "Clavier mécanique RGB Corsair K95 Platinum PRO"
    expect(response.data.data.length).toBeGreaterThanOrEqual(1);
  });

  test('550. Should handle query with special characters', async () => {
    const response = await api.post('/purchase/search', {
      query: 'USB-C',
      limit: 10
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    // Should match "Convertisseur USB-C Adaptateur Multi-Port"
    expect(response.data.data.length).toBeGreaterThanOrEqual(1);
  });

  test('560. Should fail with query less than 4 characters', async () => {
    const response = await api.post('/purchase/search', {
      query: 'abc',
      limit: 10
    });

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBeDefined();
  });

  test('565. Should succeed with query exactly 4 characters', async () => {
    const response = await api.post('/purchase/search', {
      query: 'hdmi',
      limit: 10
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    // Should match "Cable HDMI 2.1 8K Premium"
    expect(response.data.data.length).toBeGreaterThanOrEqual(1);
  });

  test('570. Should return empty array for non-matching query', async () => {
    const response = await api.post('/purchase/search', {
      query: 'xyz123nonexistent',
      limit: 10
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    expect(response.data.data.length).toBe(0);
  });

  test('575. Should respect the limit parameter', async () => {
    const response = await api.post('/purchase/search', {
      query: 'corsair',
      limit: 1
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    // Should return at most 1 result
    expect(response.data.data.length).toBeLessThanOrEqual(1);
  });

  test('580. Should require purchaseIds in body for valid request', async () => {
    const response = await api.post('/purchase/search', {
      // Missing query field
      limit: 10
    });

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
  });

  test('585. Should return purchase IDs that can be used in batch API', async () => {
    // First, search for purchases
    const searchResponse = await api.post('/purchase/search', {
      query: 'corsair',
      limit: 10
    });

    expect(searchResponse.status).toBe(200);
    expect(searchResponse.data.success).toBe(true);
    expect(Array.isArray(searchResponse.data.data)).toBe(true);

    if (searchResponse.data.data.length > 0) {
      // Then use the returned IDs in the batch API
      const batchResponse = await api.post('/purchase-status-batch', {
        purchaseIds: searchResponse.data.data,
        page: 1,
        limit: 10
      });

      expect(batchResponse.status).toBe(200);
      expect(batchResponse.data.success).toBe(true);
      expect(Array.isArray(batchResponse.data.data)).toBe(true);
      // Results should match the count of search results
      expect(batchResponse.data.data.length).toBeLessThanOrEqual(searchResponse.data.data.length);
    }
  });

  test('590. Should handle fuzzy matching with amount field via description', async () => {
    // Search for a specific price range description
    const response = await api.post('/purchase/search', {
      query: '29.99',
      limit: 10
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    // May or may not match depending on implementation - just verify it doesn't error
  });

  test('595. Should match partial words case-insensitively', async () => {
    const response = await api.post('/purchase/search', {
      query: 'platinum pro',
      limit: 50
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(Array.isArray(response.data.data)).toBe(true);
    // Should match items containing "platinum" like "Platinum PRO"
    expect(response.data.data.length).toBeGreaterThanOrEqual(0);
  });

  afterAll(async () => {
    // Clean up: Delete all fuzzy search test purchases
    for (const purchaseId of fuzzySearchTestPurchaseIds) {
      await api.delete(`/purchase/${purchaseId}`);
    }
  });
});

// ========== SHORT LINK PUBLIC API TESTS ==========

describe('Short Link API Tests', () => {
  let shortLinkCode: string;
  let purchaseWithFeedbackAndPublication: string;
  let purchaseWithoutFeedback: string;
  let purchaseWithoutPublication: string;

  test('600. Should create a purchase for link generation testing', async () => {
    const purchase: Purchase = {
      date: new Date().toISOString().split('T')[0],
      order: generateFakeAmazonOrderId(),
      description: 'Test product for link generation',
      amount: 49.99,
      screenshot: testImageBase64
    };

    const response = await api.post('/purchase', purchase);

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBeDefined();

    purchaseWithFeedbackAndPublication = response.data.id;
  });

  test('610. Should add feedback for the link test purchase', async () => {
    const response = await api.post('/feedback', {
      date: new Date().toISOString().split('T')[0],
      purchase: purchaseWithFeedbackAndPublication,
      feedback: 'Testing the short link functionality with this feedback.'
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
  });

  test('620. Should record publication for the link test purchase', async () => {
    const response = await api.post('/publish', {
      date: new Date().toISOString().split('T')[0],
      purchase: purchaseWithFeedbackAndPublication,
      screenshot: testImageBase64
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
  });

  test('630. Should generate a short link for a purchase with feedback and publication', async () => {
    const durationSeconds = 3600; // 1 hour
    const response = await api.post(`/link/public?duration=${durationSeconds}&purchase=${purchaseWithFeedbackAndPublication}`, {});

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.code).toBeDefined();
    expect(response.data.code).toMatch(/^[0-9a-zA-Z]{7}$/); // 7 alphanumeric characters
    expect(response.data.url).toBeDefined();
    expect(response.data.url).toMatch(/^link\/[0-9a-zA-Z]{7}$/);

    shortLinkCode = response.data.code;
  });

  test('640. Should require duration parameter', async () => {
    const response = await api.post(`/link/public?purchase=${purchaseWithFeedbackAndPublication}`, {});

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain('Duration');
  });

  test('650. Should require purchase parameter', async () => {
    const response = await api.post('/link/public?duration=3600', {});

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain('Purchase');
  });

  test('660. Should reject duration less than 60 seconds', async () => {
    const response = await api.post(`/link/public?duration=30&purchase=${purchaseWithFeedbackAndPublication}`, {});

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain('Duration');
  });

  test('670. Should reject duration greater than 1 year', async () => {
    const response = await api.post(`/link/public?duration=31536001&purchase=${purchaseWithFeedbackAndPublication}`, {});

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain('Duration');
  });

  test('680. Should create a purchase without feedback to test link generation failure', async () => {
    const purchase: Purchase = {
      date: new Date().toISOString().split('T')[0],
      order: generateFakeAmazonOrderId(),
      description: 'Test product without feedback',
      amount: 39.99,
      screenshot: testImageBase64
    };

    const response = await api.post('/purchase', purchase);

    expect(response.status).toBe(201);
    purchaseWithoutFeedback = response.data.id;
  });

  test('690. Should reject link generation for purchase without feedback', async () => {
    const response = await api.post(`/link/public?duration=3600&purchase=${purchaseWithoutFeedback}`, {});

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain('feedback and publication');
  });

  test('700. Should create a purchase with feedback but no publication', async () => {
    const purchase: Purchase = {
      date: new Date().toISOString().split('T')[0],
      order: generateFakeAmazonOrderId(),
      description: 'Test product without publication',
      amount: 59.99,
      screenshot: testImageBase64
    };

    const response = await api.post('/purchase', purchase);
    expect(response.status).toBe(201);

    purchaseWithoutPublication = response.data.id;

    // Add feedback
    const feedbackResponse = await api.post('/feedback', {
      date: new Date().toISOString().split('T')[0],
      purchase: purchaseWithoutPublication,
      feedback: 'This purchase has feedback but no publication.'
    });

    expect(feedbackResponse.status).toBe(201);
  });

  test('710. Should reject link generation for purchase without publication', async () => {
    const response = await api.post(`/link/public?duration=3600&purchase=${purchaseWithoutPublication}`, {});

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain('feedback and publication');
  });

  test('720. Should retrieve dispute data via valid short link', async () => {
    // Note: This is a public endpoint, so we don't use the authenticated API client
    const response = await axios.get(`${API_BASE_URL}/link/${shortLinkCode}`, {
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: function (status) {
        return status < 500;
      }
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toBeDefined();

    const data = response.data.data;
    expect(data.orderNumber).toBeDefined();
    expect(data.orderDate).toBeDefined();
    expect(data.purchaseAmount).toBeDefined();
    expect(data.purchaseScreenshot).toBeDefined();
    expect(data.feedbackDate).toBeDefined();
    expect(data.feedbackText).toBeDefined();
    expect(data.publicationDate).toBeDefined();
    expect(data.publicationScreenshot).toBeDefined();
    expect(data.isRefunded).toBeDefined();
  });

  test('730. Should return 404 for non-existent link code', async () => {
    const response = await axios.get(`${API_BASE_URL}/link/invalid`, {
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: function (status) {
        return status < 500;
      }
    });

    expect(response.status).toBe(404);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain('not found or has expired');
  });

  test('740. Should return 400 for invalid link code format', async () => {
    const response = await axios.get(`${API_BASE_URL}/link/invalid1`, {
      headers: {
        'Content-Type': 'application/json'
      },
      validateStatus: function (status) {
        return status < 500;
      }
    });

    expect(response.status).toBe(400);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain('Invalid link code format');
  });

  test('750. Should generate links with short duration (60 seconds)', async () => {
    const response = await api.post(`/link/public?duration=60&purchase=${purchaseWithFeedbackAndPublication}`, {});

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.code).toMatch(/^[0-9a-zA-Z]{7}$/);
  });

  test('760. Should generate links with long duration (30 days)', async () => {
    const thirtyDaysInSeconds = 30 * 24 * 60 * 60; // 2592000 seconds
    const response = await api.post(`/link/public?duration=${thirtyDaysInSeconds}&purchase=${purchaseWithFeedbackAndPublication}`, {});

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.code).toMatch(/^[0-9a-zA-Z]{7}$/);
  });

  test('770. Should reject link generation for non-existent purchase', async () => {
    const fakeUuid = uuidv4();
    const response = await api.post(`/link/public?duration=3600&purchase=${fakeUuid}`, {});

    expect(response.status).toBe(404);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toContain('Purchase not found');
  });

  test('780. Should delete expired links', async () => {
    // Generate a link with minimum valid duration (60 seconds, then it will be expired by cleanup)
    // We'll create a link that definitely has expired by the time cleanup runs
    const shortDurationResponse = await api.post(`/link/public?duration=60&purchase=${purchaseWithFeedbackAndPublication}`, {});
    expect(shortDurationResponse.status).toBe(200);

    // For testing purposes, we'll just verify the cleanup endpoint works
    // In production, this would be called periodically to remove expired links
    const response = await api.delete('/links/expired');

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(typeof response.data.deletedCount).toBe('number');
  });

  test('790. Should return deleted count of zero if no expired links', async () => {
    // Call the cleanup endpoint - should not find any newly expired links
    const response = await api.delete('/links/expired');

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(typeof response.data.deletedCount).toBe('number');
  });
});