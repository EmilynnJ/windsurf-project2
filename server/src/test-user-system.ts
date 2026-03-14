/**
 * Test script for the user system functionality
 * This script demonstrates how to use the various user system endpoints
 */

import axios from 'axios';

// Base API URL - adjust as needed for your environment
const BASE_URL = 'http://localhost:3001/api';

// Mock authentication token (replace with real token in actual use)
const MOCK_TOKEN = 'mock-token';

// Axios instance with default headers
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Authorization': `Bearer ${MOCK_TOKEN}`,
    'Content-Type': 'application/json',
  }
});

// Test user data
const testUserData = {
  email: 'test@example.com',
  username: 'testuser',
  fullName: 'Test User',
  role: 'client' as const,
};

const testReaderData = {
  bio: 'Experienced tarot reader specializing in love and career guidance',
  specialties: 'Tarot, Astrology, Palm Reading',
  pricingChat: 100, // cents per minute
  pricingVoice: 200, // cents per minute
  pricingVideo: 300, // cents per minute
};

async function testUserSystem() {
  console.log('Testing User System...\n');

  try {
    // Test 1: Create a user (admin only)
    console.log('1. Testing user creation (admin only)...');
    try {
      const createUserResponse = await api.post('/users', {
        ...testUserData,
        role: 'reader',
      });
      console.log('✓ User created:', createUserResponse.data.user.id);
    } catch (error) {
      console.log('✗ User creation failed:', error.response?.data || error.message);
    }

    // Test 2: Get current user profile
    console.log('\n2. Testing getting current user profile...');
    try {
      const profileResponse = await api.get('/auth/me');
      console.log('✓ Current user profile:', profileResponse.data.id);
    } catch (error) {
      console.log('✗ Getting current user profile failed:', error.response?.data || error.message);
    }

    // Test 3: Update user profile
    console.log('\n3. Testing updating user profile...');
    try {
      const updateResponse = await api.put('/users/me', {
        bio: 'Updated bio',
        specialties: 'Updated specialties',
      });
      console.log('✓ User profile updated:', updateResponse.data.user.id);
    } catch (error) {
      console.log('✗ Updating user profile failed:', error.response?.data || error.message);
    }

    // Test 4: Toggle online status
    console.log('\n4. Testing toggling online status...');
    try {
      const toggleResponse = await api.patch('/users/me/online', { isOnline: true });
      console.log('✓ Online status toggled:', toggleResponse.data.user.isOnline);
    } catch (error) {
      console.log('✗ Toggling online status failed:', error.response?.data || error.message);
    }

    // Test 5: Search users
    console.log('\n5. Testing searching users...');
    try {
      const searchResponse = await api.get('/users?q=test&role=reader');
      console.log('✓ Users search returned:', searchResponse.data.users.length, 'results');
    } catch (error) {
      console.log('✗ Users search failed:', error.response?.data || error.message);
    }

    // Test 6: Get all readers
    console.log('\n6. Testing getting all readers...');
    try {
      const readersResponse = await api.get('/readers?isOnline=true');
      console.log('✓ Readers search returned:', readersResponse.data.readers.length, 'results');
    } catch (error) {
      console.log('✗ Readers search failed:', error.response?.data || error.message);
    }

    // Test 7: Update reader pricing
    console.log('\n7. Testing updating reader pricing...');
    try {
      const pricingResponse = await api.patch('/readers/me/pricing', {
        pricingChat: 150,
        pricingVoice: 250,
      });
      console.log('✓ Reader pricing updated:', pricingResponse.data.pricing);
    } catch (error) {
      console.log('✗ Updating reader pricing failed:', error.response?.data || error.message);
    }

    // Test 8: Get user balance
    console.log('\n8. Testing getting user balance...');
    try {
      const balanceResponse = await api.get('/balance/me');
      console.log('✓ User balance:', balanceResponse.data.balance);
    } catch (error) {
      console.log('✗ Getting user balance failed:', error.response?.data || error.message);
    }

    // Test 9: Top up balance
    console.log('\n9. Testing topping up balance...');
    try {
      const topUpResponse = await api.post('/balance/top-up', {
        amount: 1000, // Adding $10.00 (assuming cents)
        note: 'Test top-up'
      });
      console.log('✓ Balance topped up:', topUpResponse.data.newBalance);
    } catch (error) {
      console.log('✗ Topping up balance failed:', error.response?.data || error.message);
    }

    // Test 10: Get transaction history
    console.log('\n10. Testing getting transaction history...');
    try {
      const transactionsResponse = await api.get('/balance/transactions');
      console.log('✓ Transaction history:', transactionsResponse.data.transactions.length, 'transactions');
    } catch (error) {
      console.log('✗ Getting transaction history failed:', error.response?.data || error.message);
    }

    console.log('\n✓ All tests completed!');
  } catch (error) {
    console.error('✗ Test suite failed:', error.message);
  }
}

// Run the test
if (require.main === module) {
  testUserSystem();
}

export default testUserSystem;