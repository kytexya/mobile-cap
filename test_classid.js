/**
 * Quick test to verify classId extraction from Teacher API
 */

const BASE_URL = 'https://kms-api-gkexamccg9hfbza8.southeastasia-01.azurewebsites.net/api';

async function testClassIdExtraction() {
  console.log('🔍 Testing classId extraction from Teacher API...\n');

  // Login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'teacher001', password: 'Admin@123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token;
  const userId = loginData.data?.user?.userId;

  console.log('✅ Login success');
  console.log(`UserID: ${userId}`);

  // Get teacher details
  const teacherRes = await fetch(`${BASE_URL}/Teacher/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const teacherData = await teacherRes.json();

  console.log('\n📦 Teacher API Response:');
  console.log(JSON.stringify(teacherData, null, 2));

  // Extract classId
  const data = teacherData.data;
  console.log('\n🔍 Checking for class info...');

  if (data?.AssignedClasses && Array.isArray(data.AssignedClasses)) {
    console.log(`✅ Found AssignedClasses array with ${data.AssignedClasses.length} classes`);
    if (data.AssignedClasses.length > 0) {
      const firstClass = data.AssignedClasses[0];
      console.log(`✅ ClassId: ${firstClass.ClassId || firstClass.classId}`);
      console.log(`✅ ClassName: ${firstClass.ClassName || firstClass.className}`);
    }
  } else {
    console.log('❌ No AssignedClasses found');
    console.log('Available fields:', Object.keys(data || {}));
  }
}

testClassIdExtraction().catch(console.error);
