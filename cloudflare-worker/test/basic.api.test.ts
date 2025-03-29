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

if (!AUTH0_TOKEN) {
  throw new Error('AUTH0_TOKEN environment variable is required');
}

// Test state
let testerId: string;
let expirationDate: Date;
let testerUuid: string;
let purchaseId: string;

// HTTP client with authorization
const api = {
  post: async (path: string, data: any) => {
    return axios.post(`${API_BASE_URL}${path}`, data, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH0_TOKEN}`
      },
      validateStatus: function (status) {
        return status < 500; // la requête résout tant que le code de sa réponse est
        // inférieur à 500
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
        return status < 500; // la requête résout tant que le code de sa réponse est
        // inférieur à 500
      }
    });
  },
}

// Small base64 encoded WebP image for testing
const testImageBase64 = "UklGRp4AAABXRUJQVlA4WAoAAAAQAAAABwAABwAAQUxQSAkAAAABBxAREYiI/gcAVlA4IBgAAAAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AABQU0FJTgAAADhCSU0D7QAAAAAAEABIAAAAAQACAEgAAAABAAI4QklNBCgAAAAAAAwAAAACP/AAAAAAAAA4QklNBEMAAAAAAA5QYmVXARAABgBQAAAAAA==";

describe('Feedback Flow API', () => {
  beforeAll(async () => {
    // Extract the user ID (sub) from the JWT token
    const decodedToken = jose.decodeJwt(AUTH0_TOKEN);
    testerId = decodedToken.sub as string;
    expirationDate = new Date((decodedToken.exp || 0) * 1000);

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

  test('25. The list of testers should have now 3 members', async () => {
    const response = await api.get('/testers');
    console.log(`Testers: ${JSON.stringify(response.data)}`);
    expect(response.data.data.length).toBe(3);
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.data).toBeDefined();
  });

  test('30. Should add the OAuth ID to the tester', async () => {
    const response = await api.post('/tester/ids', {
      name: 'TESTER',
      id: testerId
    });

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    expect(response.data.name).toBe('TESTER');
    expect(response.data.ids).toContain(testerId);
  });

  test('40. Should not add duplicate OAuth ID to the tester', async () => {
    const response = await api.post('/tester/ids', {
      name: 'TESTER',
      id: testerId
    });

    expect(response.status).toBe(409);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe('ID already exists in the database');
  });

  test('45. Should not add a duplicate OAuth ID owned by another tester', async () => {
    const response = await api.post('/tester/ids', {
      name: 'TESTER',
      id: 'auth0|0987654321' /* Owned by Jane Doe */
    });

    expect(response.status).toBe(409);
    expect(response.data.success).toBe(false);
    expect(response.data.error).toBe('ID already exists in the database');
  });

  test('50. Should create a purchase', async () => {
    const purchase: Purchase = {
      date: new Date().toISOString().split('T')[0], // Today in YYYY-MM-DD format
      order: `ORDER-${uuidv4().substring(0, 8)}`,
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

  test('60. Should add feedback for the purchase', async () => {
    const response = await api.post('/feedback', {
      date: new Date().toISOString().split('T')[0],
      purchase: purchaseId,
      feedback: 'This is a fantastic product! Works exactly as described.'
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBe(purchaseId);
  });

  test('70. Should record publication of feedback', async () => {
    const response = await api.post('/publish', {
      date: new Date().toISOString().split('T')[0],
      purchase: purchaseId,
      screenshot: testImageBase64
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBe(purchaseId);
  });

  test('80. Should verify the purchase is now in the not refunded list', async () => {
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

  test('90. Should record refund for the purchase', async () => {
    const today = new Date().toISOString().split('T')[0];

    const response = await api.post('/refund', {
      date: today,
      purchase: purchaseId,
      refundDate: today, // Same day refund for testing
      amount: 29.99
    });

    expect(response.status).toBe(201);
    expect(response.data.success).toBe(true);
    expect(response.data.id).toBe(purchaseId);
  });

  test('100. Should verify the purchase is now not in the not refunded list', async () => {
    // Get the list of refunded purchases
    const response = await api.get('/purchases/not-refunded');

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);

    // Check if our purchase is not the refunded list
    const refundedPurchase = response.data.data.find((p: any) => p.id === purchaseId);
    expect(refundedPurchase).toBeUndefined();
  });

  test('110. Should verify the purchase is now in the refunded list', async () => {
    // Get the list of refunded purchases
    const response = await api.get('/purchases/refunded');

    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);

    // Check if our purchase is in the refunded list
    const refundedPurchase = response.data.data.find((p: any) => p.id === purchaseId);
    expect(refundedPurchase).toBeDefined();
    // Check if the refund list contails exactly 1 line (only our purchase)
    expect(response.data.data.length).toBe(1);
  });

  test('120. Should check if in memory database can be backed up', async () => {
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

  test('140. Should get purchase status for the current tester', async () => {
    // S'assurer que nous avons un tester identifié
    expect(testerId).toBeDefined();
    expect(testerUuid).toBeDefined();
    
    // Appel à l'API pour récupérer le statut des achats
    const response = await api.get('/purchase-status');
    
    // Vérifier les codes de réponse et la structure
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    
    // Vérifier que les données sont correctes
    expect(response.data.data).toBeDefined();
    expect(Array.isArray(response.data.data)).toBe(true);
    
    // Dans nos données de test, John Doe (qui est notre tester actuel) a 2 achats
    const purchases = response.data.data;
    expect(purchases.length).toBe(1);
    
    // Vérifier la structure d'un achat dans la réponse
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
    
    // Vérifier que l'achat que nous avons ajouté et remboursé a le bon statut
    const ourPurchase = purchases.find((p: { purchase: string; }) => p.purchase === purchaseId);
    expect(ourPurchase).toBeDefined();
    expect(ourPurchase.refunded).toBe(true);
    expect(ourPurchase.hasFeedback).toBe(true);
    expect(ourPurchase.hasPublication).toBe(true);
    expect(ourPurchase.hasRefund).toBe(true);
    
    // Vérifier la pagination et le tri
    expect(response.data.page).toBeDefined();
    expect(response.data.limit).toBeDefined();
    expect(response.data.total).toBeDefined();
  });

  test('145. Should get purchase status with custom pagination and sorting', async () => {
    // Appel à l'API avec des paramètres personnalisés
    const response = await api.get('/purchase-status?page=1&limit=1&sort=date&order=asc');
    
    // Vérifier les codes de réponse et la structure
    expect(response.status).toBe(200);
    expect(response.data.success).toBe(true);
    
    // Vérifier que la pagination fonctionne
    expect(response.data.data.length).toBeLessThanOrEqual(1);
    expect(response.data.page).toBe(1);
    expect(response.data.limit).toBe(1);
    
    // Vérifier que le tri fonctionne (nous devrions avoir l'achat le plus ancien en premier)
    if (response.data.data.length > 0) {
      const firstPurchase = response.data.data[0];
      const secondResponse = await api.get('/purchase-status?page=1&limit=5&sort=date&order=desc');
      expect(secondResponse.status).toBe(200);
      
      if (secondResponse.data.data.length > 1) {
        const lastPurchase = secondResponse.data.data[secondResponse.data.data.length - 1];
        // La date du premier achat dans un tri ascendant devrait être antérieure 
        // à la date du dernier achat dans un tri descendant
        expect(new Date(firstPurchase.date).getTime()).toBeLessThanOrEqual(
          new Date(lastPurchase.date).getTime()
        );
      }
    }
  });
});