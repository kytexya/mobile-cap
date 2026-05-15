/**
 * Test Menu API to check why list is empty
 */

const BASE_URL = 'https://kms-api-gkexamccg9hfbza8.southeastasia-01.azurewebsites.net/api';

async function testMenuAPI() {
  console.log('🍽️ Testing Menu API...\n');
  
  // Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'teacher001', password: 'Admin@123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token;
  
  console.log('✅ Login success\n');
  
  // Test all menu endpoints
  const endpoints = [
    '/menus',
    '/menus/1',
    '/menus/by-class/1',
    '/menus/by-class/2',
    '/menus/by-class/999'
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n📡 Testing: ${endpoint}`);
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log('Response:', JSON.stringify(data, null, 2).substring(0, 800));
    
    // Check if array
    if (Array.isArray(data)) {
      console.log(`✅ Array with ${data.length} items`);
    } else if (data?.data && Array.isArray(data.data)) {
      console.log(`✅ data array with ${data.data.length} items`);
    }
  }
}

testMenuAPI().catch(console.error);
