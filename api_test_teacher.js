/**
 * API Test with Teacher Credentials (teacher001)
 */

const BASE_URL = 'https://kms-api-gkexamccg9hfbza8.southeastasia-01.azurewebsites.net/api';

let authToken = null;
let userInfo = {};

const testResults = {
  passed: 0,
  failed: 0,
  details: []
};

async function makeRequest(endpoint, method = 'GET', body = null) {
  const url = `${BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken && { 'Authorization': `Bearer ${authToken}` })
    }
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => null);
    return { status: response.status, ok: response.ok, data, url };
  } catch (error) {
    return { status: 0, ok: false, error: error.message, url };
  }
}

function logResult(name, result) {
  const status = result.ok ? '✅ PASS' : '❌ FAIL';
  testResults.details.push({ name, status, httpStatus: result.status, url: result.url });
  if (result.ok) {
    testResults.passed++;
    console.log(`${status} | ${name} | HTTP ${result.status}`);
  } else {
    testResults.failed++;
    console.log(`${status} | ${name} | HTTP ${result.status}`);
  }
}

async function login() {
  console.log('🔐 Đang đăng nhập với teacher001...\n');
  const result = await makeRequest('/auth/login', 'POST', {
    username: 'teacher001',
    password: 'Admin@123'
  });
  
  if (result.ok && result.data?.data?.token) {
    authToken = result.data.data.token;
    userInfo = result.data.data.user;
    console.log(`✅ Login thành công!`);
    console.log(`👤 User: ${userInfo.fullName} (${userInfo.username})`);
    console.log(`🎭 Role: ${userInfo.roles?.[0] || userInfo.role}`);
    console.log(`📝 Token: ${authToken.substring(0, 40)}...\n`);
    return true;
  }
  console.log('❌ Login thất bại:', result.data?.message || 'Unknown error');
  return false;
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         KMS API Test - TEACHER ROLE                                ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  await login();
  if (!authToken) return;

  console.log('🔐 Auth APIs...');
  logResult('GET /auth/profile', await makeRequest('/auth/profile', 'GET'));

  console.log('\n📢 Announcement APIs...');
  logResult('GET /Announcements', await makeRequest('/Announcements', 'GET'));
  logResult('GET /Announcements/1', await makeRequest('/Announcements/1', 'GET'));
  logResult('POST /Announcements', await makeRequest('/Announcements', 'POST', {
    Title: 'Test ' + Date.now(), Content: 'Test', TargetAudience: 'All', Priority: 'Normal', IsPublished: false
  }));
  logResult('PUT /Announcements/1', await makeRequest('/Announcements/1', 'PUT', { Title: 'Updated' }));
  logResult('DELETE /Announcements/1', await makeRequest('/Announcements/1', 'DELETE'));

  console.log('\n📋 Attendance APIs...');
  logResult('GET /Attendance/class/1', await makeRequest('/Attendance/class/1', 'GET'));
  logResult('POST /Attendance/bulk', await makeRequest('/Attendance/bulk', 'POST', {
    classId: 1, date: new Date().toISOString().split('T')[0],
    records: [{ studentId: 1, status: 'Present', notes: '' }]
  }));
  logResult('GET /Attendance/student/1', await makeRequest('/Attendance/student/1', 'GET'));

  console.log('\n🎨 Class Activity APIs...');
  logResult('GET /ClassActivities/class/1', await makeRequest('/ClassActivities/class/1', 'GET'));
  logResult('GET /ClassActivities/1', await makeRequest('/ClassActivities/1', 'GET'));
  logResult('POST /ClassActivities', await makeRequest('/ClassActivities', 'POST', {
    ClassId: 1, Title: 'Activity ' + Date.now(), Content: 'Test', ActivityDate: new Date().toISOString().split('T')[0]
  }));
  logResult('PUT /ClassActivities/1', await makeRequest('/ClassActivities/1', 'PUT', { Title: 'Updated' }));
  logResult('DELETE /ClassActivities/1', await makeRequest('/ClassActivities/1', 'DELETE'));
  logResult('GET /activity-media/activity/1', await makeRequest('/activity-media/activity/1', 'GET'));

  console.log('\n👨‍🏫 Teacher APIs...');
  logResult('GET /Teacher/1', await makeRequest('/Teacher/1', 'GET'));
  logResult('GET /Teacher/search?keyword=teacher', await makeRequest('/Teacher/search?keyword=teacher', 'GET'));

  console.log('\n💰 Invoice APIs...');
  logResult('GET /Invoice/student/1', await makeRequest('/Invoice/student/1', 'GET'));
  logResult('GET /Invoice/1', await makeRequest('/Invoice/1', 'GET'));
  logResult('POST /Invoice/1/pay', await makeRequest('/Invoice/1/pay', 'POST', { paymentMethod: 'BankTransfer' }));

  console.log('\n🍽️ Meal Evaluation APIs...');
  logResult('POST /daily-reports', await makeRequest('/daily-reports', 'POST', {
    studentId: 1, classId: 1, livingData: JSON.stringify({ mealType: 'Lunch', eatingLevel: 'All eaten' }),
    educationalData: '', status: 'Completed', createdBy: userInfo.userId || 0
  }));

  console.log('\n📅 Menu APIs...');
  logResult('GET /menus/by-class/1', await makeRequest('/menus/by-class/1', 'GET'));
  logResult('GET /menus/1', await makeRequest('/menus/1', 'GET'));
  logResult('POST /menus', await makeRequest('/menus', 'POST', {
    classId: 1, campusId: 1, startDate: new Date().toISOString(), endDate: new Date().toISOString(), meals: []
  }));
  logResult('PUT /menus/1', await makeRequest('/menus/1', 'PUT', { classId: 1 }));
  logResult('DELETE /menus/1', await makeRequest('/menus/1', 'DELETE'));

  console.log('\n🔔 Notification APIs...');
  logResult('GET /Notification', await makeRequest('/Notification', 'GET'));
  logResult('PATCH /Notification/1/read', await makeRequest('/Notification/1/read', 'PATCH'));
  logResult('DELETE /Notification/1', await makeRequest('/Notification/1', 'DELETE'));

  console.log('\n🔑 Password APIs...');
  logResult('POST /Password/change', await makeRequest('/Password/change', 'POST', {
    CurrentPassword: 'Admin@123', NewPassword: 'Admin@123', ConfirmPassword: 'Admin@123'
  }));

  console.log('\n👨‍🎓 Student APIs...');
  logResult('GET /Student/1', await makeRequest('/Student/1', 'GET'));
  logResult('GET /Student/parent/1', await makeRequest('/Student/parent/1', 'GET'));
  logResult('GET /StudentParent/parent/1', await makeRequest('/StudentParent/parent/1', 'GET'));
  logResult('GET /Student/class/1', await makeRequest('/Student/class/1', 'GET'));
  logResult('GET /ClassStudent/student/1', await makeRequest('/ClassStudent/student/1', 'GET'));

  console.log('\n⚙️ System Settings APIs...');
  logResult('GET /SystemSettings', await makeRequest('/SystemSettings', 'GET'));
}

async function main() {
  const start = Date.now();
  await runTests();
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(70));
  console.log('📊 KẾT QUẢ TEST - TEACHER');
  console.log('='.repeat(70));
  console.log(`User: ${userInfo.fullName || 'N/A'} (${userInfo.username || 'N/A'})`);
  console.log(`Role: ${userInfo.roles?.[0] || userInfo.role || 'N/A'}`);
  console.log(`Tổng: ${testResults.passed + testResults.failed} | ✅ ${testResults.passed} | ❌ ${testResults.failed}`);
  console.log(`Tỷ lệ: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  console.log(`Thời gian: ${duration}s`);
  console.log('='.repeat(70));

  require('fs').writeFileSync('./api_test_teacher_results.json', JSON.stringify(testResults, null, 2));
  console.log('\n📄 File: api_test_teacher_results.json');
}

main().catch(console.error);
