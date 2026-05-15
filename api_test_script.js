/**
 * API Connectivity Test Script for KMS Backend
 * Tests all API endpoints to verify connectivity and basic responses
 * 
 * Run with: node api_test_script.js
 */

const BASE_URL = 'https://kms-api-gkexamccg9hfbza8.southeastasia-01.azurewebsites.net/api';

// Test credentials (provided by user)
const TEST_CREDENTIALS = {
  username: 'parent001',
  password: 'Admin@123'
};

// Store token for authenticated requests
let authToken = null;

// Test results tracker
const testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  details: []
};

// Helper function to make HTTP requests
async function makeRequest(endpoint, method = 'GET', body = null, headers = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };

  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    let data = null;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      ok: response.ok,
      data,
      url
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      url
    };
  }
}

// Test result logger
function logResult(testName, result, expectedStatus = null) {
  const status = result.ok ? '✅ PASS' : '❌ FAIL';
  const actualStatus = result.status || 'NETWORK_ERROR';
  const expected = expectedStatus || '200-299';

  const detail = {
    name: testName,
    status: status,
    httpStatus: actualStatus,
    expectedStatus: expected,
    url: result.url,
    error: result.error || null,
    timestamp: new Date().toISOString()
  };

  testResults.details.push(detail);

  if (result.ok) {
    testResults.passed++;
    console.log(`${status} | ${testName} | HTTP ${actualStatus}`);
  } else {
    testResults.failed++;
    console.log(`${status} | ${testName} | HTTP ${actualStatus} | ${result.error || ''}`);
    if (result.error) {
      testResults.errors.push({ test: testName, error: result.error });
    }
  }
}

// ==================== AUTH API TESTS ====================
async function testAuthAPIs() {
  console.log('\n🔐 Testing Auth APIs...\n');

  // Test 1: Login (will likely fail without valid credentials, but tests connectivity)
  const loginResult = await makeRequest('/auth/login', 'POST', {
    username: 'admin',
    password: 'admin123'
  });
  logResult('POST /auth/login', loginResult, '200 or 401');

  // If login succeeds, store token
  if (loginResult.ok && loginResult.data?.data?.token) {
    authToken = loginResult.data.data.token;
    console.log('   📝 Auth token acquired');
  }

  // Test 2: Get Profile (requires auth)
  const profileResult = await makeRequest('/auth/profile', 'GET');
  logResult('GET /auth/profile', profileResult, '200 or 401');
}

// ==================== ANNOUNCEMENT API TESTS ====================
async function testAnnouncementAPIs() {
  console.log('\n📢 Testing Announcement APIs...\n');

  // Test 1: Get all announcements
  const getAllResult = await makeRequest('/Announcements', 'GET');
  logResult('GET /Announcements', getAllResult, '200 or 401');

  // Test 2: Get announcement by ID (using ID 1 as test)
  const getByIdResult = await makeRequest('/Announcements/1', 'GET');
  logResult('GET /Announcements/1', getByIdResult, '200, 401, or 404');

  // Test 3: Create announcement (requires auth)
  const createResult = await makeRequest('/Announcements', 'POST', {
    Title: 'Test Announcement',
    Content: 'This is a test announcement',
    TargetAudience: 'All',
    TargetClassId: null,
    Priority: 'Normal',
    IsPublished: false
  });
  logResult('POST /Announcements', createResult, '201, 401, or 400');
}

// ==================== ATTENDANCE API TESTS ====================
async function testAttendanceAPIs() {
  console.log('\n📋 Testing Attendance APIs...\n');

  // Test 1: Get class sheet
  const classSheetResult = await makeRequest('/Attendance/class/1', 'GET');
  logResult('GET /Attendance/class/1', classSheetResult, '200 or 401');

  // Test 2: Submit bulk attendance
  const bulkResult = await makeRequest('/Attendance/bulk', 'POST', {
    classId: 1,
    date: new Date().toISOString().split('T')[0],
    records: [
      { studentId: 1, status: 'Present', notes: '' }
    ]
  });
  logResult('POST /Attendance/bulk', bulkResult, '200, 201, or 401');

  // Test 3: Get student attendance history
  const historyResult = await makeRequest('/Attendance/student/1', 'GET');
  logResult('GET /Attendance/student/1', historyResult, '200 or 401');
}

// ==================== CLASS ACTIVITY API TESTS ====================
async function testClassActivityAPIs() {
  console.log('\n🎨 Testing Class Activity APIs...\n');

  // Test 1: Get activities by class
  const byClassResult = await makeRequest('/ClassActivities/class/1', 'GET');
  logResult('GET /ClassActivities/class/1', byClassResult, '200 or 401');

  // Test 2: Get activity by ID
  const byIdResult = await makeRequest('/ClassActivities/1', 'GET');
  logResult('GET /ClassActivities/1', byIdResult, '200, 401, or 404');

  // Test 3: Get activity media
  const mediaResult = await makeRequest('/activity-media/activity/1', 'GET');
  logResult('GET /activity-media/activity/1', mediaResult, '200, 401, or 404');

  // Test 4: Create activity
  const createResult = await makeRequest('/ClassActivities', 'POST', {
    ClassId: 1,
    Title: 'Test Activity',
    Content: 'Test content',
    ActivityDate: new Date().toISOString().split('T')[0]
  });
  logResult('POST /ClassActivities', createResult, '201, 401, or 400');
}

// ==================== TEACHER API TESTS ====================
async function testTeacherAPIs() {
  console.log('\n👨‍🏫 Testing Teacher APIs...\n');

  // Test 1: Get teacher by ID
  const byIdResult = await makeRequest('/Teacher/1', 'GET');
  logResult('GET /Teacher/1', byIdResult, '200, 401, or 404');

  // Test 2: Search teachers
  const searchResult = await makeRequest('/Teacher/search?keyword=teacher', 'GET');
  logResult('GET /Teacher/search?keyword=teacher', searchResult, '200 or 401');
}

// ==================== INVOICE API TESTS ====================
async function testInvoiceAPIs() {
  console.log('\n💰 Testing Invoice APIs...\n');

  // Test 1: Get invoices by student
  const byStudentResult = await makeRequest('/Invoice/student/1', 'GET');
  logResult('GET /Invoice/student/1', byStudentResult, '200 or 401');

  // Test 2: Get invoice by ID
  const byIdResult = await makeRequest('/Invoice/1', 'GET');
  logResult('GET /Invoice/1', byIdResult, '200, 401, or 404');

  // Test 3: Pay invoice
  const payResult = await makeRequest('/Invoice/1/pay', 'POST', {
    paymentMethod: 'BankTransfer'
  });
  logResult('POST /Invoice/1/pay', payResult, '200, 401, or 404');
}

// ==================== MEAL EVALUATION API TESTS ====================
async function testMealEvaluationAPIs() {
  console.log('\n🍽️ Testing Meal Evaluation APIs...\n');

  // Test: Submit daily report
  const reportResult = await makeRequest('/daily-reports', 'POST', {
    studentId: 1,
    classId: 1,
    livingData: JSON.stringify({
      mealType: 'Lunch',
      eatingLevel: 'All eaten',
      notes: 'Good appetite'
    }),
    educationalData: '',
    status: 'Completed',
    createdBy: 0
  });
  logResult('POST /daily-reports', reportResult, '201, 401, or 400');
}

// ==================== MENU API TESTS ====================
async function testMenuAPIs() {
  console.log('\n📅 Testing Menu APIs...\n');

  // Test 1: Get menu by class
  const byClassResult = await makeRequest('/menus/by-class/1', 'GET');
  logResult('GET /menus/by-class/1', byClassResult, '200 or 401');

  // Test 2: Get menu by ID
  const byIdResult = await makeRequest('/menus/1', 'GET');
  logResult('GET /menus/1', byIdResult, '200, 401, or 404');

  // Test 3: Create menu
  const createResult = await makeRequest('/menus', 'POST', {
    classId: 1,
    campusId: 1,
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    meals: []
  });
  logResult('POST /menus', createResult, '201, 401, or 400');
}

// ==================== NOTIFICATION API TESTS ====================
async function testNotificationAPIs() {
  console.log('\n🔔 Testing Notification APIs...\n');

  // Test 1: Get my notifications
  const getResult = await makeRequest('/Notification', 'GET');
  logResult('GET /Notification', getResult, '200 or 401');

  // Test 2: Mark as read
  const readResult = await makeRequest('/Notification/1/read', 'PATCH');
  logResult('PATCH /Notification/1/read', readResult, '200, 401, or 404');

  // Test 3: Delete notification
  const deleteResult = await makeRequest('/Notification/1', 'DELETE');
  logResult('DELETE /Notification/1', deleteResult, '200, 401, or 404');
}

// ==================== PASSWORD API TESTS ====================
async function testPasswordAPIs() {
  console.log('\n🔑 Testing Password APIs...\n');

  // Test: Change password
  const changeResult = await makeRequest('/Password/change', 'POST', {
    CurrentPassword: 'oldpassword',
    NewPassword: 'newpassword',
    ConfirmPassword: 'newpassword'
  });
  logResult('POST /Password/change', changeResult, '200, 401, or 400');
}

// ==================== STUDENT API TESTS ====================
async function testStudentAPIs() {
  console.log('\n👨‍🎓 Testing Student APIs...\n');

  // Test 1: Get student by ID
  const byIdResult = await makeRequest('/Student/1', 'GET');
  logResult('GET /Student/1', byIdResult, '200, 401, or 404');

  // Test 2: Get students by parent
  const byParentResult = await makeRequest('/Student/parent/1', 'GET');
  logResult('GET /Student/parent/1', byParentResult, '200 or 401');

  // Test 3: Alternative parent endpoint
  const altParentResult = await makeRequest('/StudentParent/parent/1', 'GET');
  logResult('GET /StudentParent/parent/1', altParentResult, '200, 401, or 404');

  // Test 4: Get students by class
  const byClassResult = await makeRequest('/Student/class/1', 'GET');
  logResult('GET /Student/class/1', byClassResult, '200 or 401');

  // Test 5: Get class-student relationship
  const classStudentResult = await makeRequest('/ClassStudent/student/1', 'GET');
  logResult('GET /ClassStudent/student/1', classStudentResult, '200, 401, or 404');
}

// ==================== SYSTEM SETTINGS API TESTS ====================
async function testSystemSettingsAPIs() {
  console.log('\n⚙️ Testing System Settings APIs...\n');

  // Test: Get all settings
  const getResult = await makeRequest('/SystemSettings', 'GET');
  logResult('GET /SystemSettings', getResult, '200 or 401');
}

// ==================== BASE URL TEST ====================
async function testBaseUrl() {
  console.log('\n🌐 Testing Base URL Connectivity...\n');

  try {
    const response = await fetch(BASE_URL);
    console.log(`Base URL Response: HTTP ${response.status}`);
    testResults.details.push({
      name: 'Base URL Connectivity',
      status: response.ok ? '✅ PASS' : '⚠️ CHECK',
      httpStatus: response.status,
      url: BASE_URL,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.log(`Base URL Error: ${error.message}`);
    testResults.details.push({
      name: 'Base URL Connectivity',
      status: '❌ FAIL',
      error: error.message,
      url: BASE_URL,
      timestamp: new Date().toISOString()
    });
  }
}

// ==================== GENERATE REPORT ====================
function generateReport() {
  console.log('\n' + '='.repeat(70));
  console.log('📊 API TEST REPORT');
  console.log('='.repeat(70));
  console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  console.log('\n⏰ Report Generated: ' + new Date().toISOString());
  console.log('='.repeat(70));

  // Save detailed report to file
  const fs = require('fs');
  const reportPath = './api_test_results.json';
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed results saved to: ${reportPath}`);

  return testResults;
}

// ==================== MAIN EXECUTION ====================
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         KMS API Connectivity Test Suite                            ║');
  console.log('║         Base URL: ' + BASE_URL.substring(0, 45).padEnd(45) + ' ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  // Test base URL first
  await testBaseUrl();

  // Run all API tests
  await testAuthAPIs();
  await testAnnouncementAPIs();
  await testAttendanceAPIs();
  await testClassActivityAPIs();
  await testTeacherAPIs();
  await testInvoiceAPIs();
  await testMealEvaluationAPIs();
  await testMenuAPIs();
  await testNotificationAPIs();
  await testPasswordAPIs();
  await testStudentAPIs();
  await testSystemSettingsAPIs();

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n⏱️  Total Test Duration: ${duration}s`);

  // Generate final report
  const results = generateReport();

  // Return exit code based on results
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
