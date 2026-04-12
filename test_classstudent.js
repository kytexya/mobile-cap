/**
 * Test ClassStudent API - check response structure
 */

const BASE_URL = 'https://kms-api-gkexamccg9hfbza8.southeastasia-01.azurewebsites.net/api';

async function testClassStudentAPI() {
  console.log('📚 Testing ClassStudent API...\n');
  
  // Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'teacher001', password: 'Admin@123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token;
  
  console.log('✅ Login success\n');
  
  // Get class students
  const res = await fetch(`${BASE_URL}/ClassStudent/class/1`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  
  console.log('📦 Full API Response:');
  console.log(JSON.stringify(data, null, 2).substring(0, 2000));
  
  console.log('\n🔍 Response structure analysis:');
  console.log('- Is Array:', Array.isArray(data));
  console.log('- Has data.data:', data?.data !== undefined);
  console.log('- data.data is Array:', Array.isArray(data?.data));
  
  if (Array.isArray(data?.data) && data.data.length > 0) {
    const first = data.data[0];
    console.log('\n📋 First item fields:', Object.keys(first));
    console.log('Sample item:', JSON.stringify(first, null, 2).substring(0, 500));
  }
}

testClassStudentAPI().catch(console.error);
