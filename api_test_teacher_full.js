/**
 * API Test with Teacher Credentials - ĐÚNG theo Backend Code
 * Hiển thị data thật từ API
 */

const BASE_URL = 'https://kms-api-gkexamccg9hfbza8.southeastasia-01.azurewebsites.net/api';

let authToken = null;
let userInfo = {};
let teacherId = null;

// Lưu trữ dữ liệu từ API để sử dụng cho các request tiếp theo
let apiData = {
  students: [],
  classes: [],
  activities: [],
  invoices: [],
  announcements: [],
  teachers: []
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

function printData(title, data) {
  console.log(`\n📦 ${title}:`);
  console.log(JSON.stringify(data, null, 2).substring(0, 1500));
  if (JSON.stringify(data).length > 1500) console.log('... (truncated)');
}

async function login() {
  console.log('🔐 Đăng nhập với teacher001...\n');
  const result = await makeRequest('/auth/login', 'POST', {
    username: 'teacher001',
    password: 'Admin@123'
  });
  
  if (result.ok && result.data?.data?.token) {
    authToken = result.data.data.token;
    userInfo = result.data.data.user;
    teacherId = userInfo.userId;
    console.log(`✅ Login thành công!`);
    console.log(`👤 UserID: ${userInfo.userId}, Name: ${userInfo.fullName}`);
    console.log(`🎭 Role: ${userInfo.roles?.[0] || userInfo.role}\n`);
    return true;
  }
  console.log('❌ Login thất bại:', result.data?.message);
  return false;
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║    KMS API TEST - TEACHER - HIỂN THỊ DATA THẬT                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  if (!await login()) return;

  // 1. Auth Profile
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('1️⃣  AUTH PROFILE');
  console.log('═══════════════════════════════════════════════════════════════════════');
  const profile = await makeRequest('/auth/profile', 'GET');
  printData('Profile Data', profile.data);

  // 2. Teacher APIs
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('2️⃣  TEACHER APIs');
  console.log('═══════════════════════════════════════════════════════════════════════');
  
  const teachers = await makeRequest('/Teacher', 'GET');
  printData('All Teachers', teachers.data);
  
  const activeTeachers = await makeRequest('/Teacher/active', 'GET');
  printData('Active Teachers', activeTeachers.data);
  
  const teacherDetail = await makeRequest('/Teacher/1', 'GET');
  printData('Teacher Detail (ID=1)', teacherDetail.data);

  // 3. Student APIs
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('3️⃣  STUDENT APIs');
  console.log('═══════════════════════════════════════════════════════════════════════');
  
  const allStudents = await makeRequest('/Student', 'GET');
  printData('All Students', allStudents.data);
  if (allStudents.data?.data) apiData.students = allStudents.data.data;
  
  const activeStudents = await makeRequest('/Student/active', 'GET');
  printData('Active Students', activeStudents.data);
  
  const studentDetail = await makeRequest('/Student/1', 'GET');
  printData('Student Detail (ID=1)', studentDetail.data);

  // 4. ClassStudent APIs - ĐÚNG endpoint từ backend
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('4️⃣  CLASS-STUDENT APIs (Đúng endpoint từ backend)');
  console.log('═══════════════════════════════════════════════════════════════════════');
  
  // Lấy students theo classId - endpoint đúng: GET /api/ClassStudent/class/{classId}
  const classStudents = await makeRequest('/ClassStudent/class/1', 'GET');
  printData('Students in Class 1', classStudents.data);
  
  // Lấy classes theo studentId
  const studentClasses = await makeRequest('/ClassStudent/student/1', 'GET');
  printData('Classes of Student 1', studentClasses.data);

  // 5. Attendance APIs - Teacher có quyền
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('5️⃣  ATTENDANCE APIs (Teacher có quyền)');
  console.log('═══════════════════════════════════════════════════════════════════════');
  
  const today = new Date().toISOString().split('T')[0];
  const attendanceSheet = await makeRequest(`/Attendance/class/1?date=${today}`, 'GET');
  printData(`Attendance Sheet Class 1 - ${today}`, attendanceSheet.data);
  
  const studentAttendance = await makeRequest('/Attendance/student/1', 'GET');
  printData('Attendance History Student 1', studentAttendance.data);

  // Submit attendance - ĐÚNG format từ backend
  console.log('\n📤 Submit Bulk Attendance...');
  const bulkAttendance = await makeRequest('/Attendance/bulk', 'POST', {
    classId: 1,
    date: new Date().toISOString(),
    records: [
      { studentId: 1, status: 'Present', notes: 'Đi học đúng giờ' },
      { studentId: 2, status: 'Present', notes: '' }
    ]
  });
  printData('Bulk Attendance Result', bulkAttendance.data);

  // 6. Class Activity APIs
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('6️⃣  CLASS ACTIVITY APIs');
  console.log('═══════════════════════════════════════════════════════════════════════');
  
  const activities = await makeRequest('/ClassActivities/class/1', 'GET');
  printData('Activities in Class 1', activities.data);
  if (activities.data) apiData.activities = activities.data;
  
  const activityDetail = await makeRequest('/ClassActivities/1', 'GET');
  printData('Activity Detail (ID=1)', activityDetail.data);
  
  const activityMedia = await makeRequest('/activity-media/activity/1', 'GET');
  printData('Media for Activity 1', activityMedia.data);

  // Create Activity - ĐÚNG format
  console.log('\n📤 Create Class Activity...');
  const createActivity = await makeRequest('/ClassActivities', 'POST', {
    ClassId: 1,
    Title: 'Hoạt động test ' + new Date().toLocaleString(),
    Content: 'Nội dung hoạt động test',
    ActivityDate: new Date().toISOString()
  });
  printData('Create Activity Result', createActivity.data);

  // 7. Menu APIs
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('7️⃣  MENU APIs');
  console.log('═══════════════════════════════════════════════════════════════════════');
  
  const menus = await makeRequest('/menus', 'GET');
  printData('All Menus', menus.data);
  
  const menuByClass = await makeRequest('/menus/by-class/1', 'GET');
  printData('Menu for Class 1', menuByClass.data);
  
  const menuDetail = await makeRequest('/menus/1', 'GET');
  printData('Menu Detail (ID=1)', menuDetail.data);

  // 8. Daily Report APIs
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('8️⃣  DAILY REPORT APIs');
  console.log('═══════════════════════════════════════════════════════════════════════');
  
  const dailyReports = await makeRequest('/daily-reports', 'GET');
  printData('All Daily Reports', dailyReports.data);
  
  const reportDetail = await makeRequest('/daily-reports/1', 'GET');
  printData('Daily Report Detail (ID=1)', reportDetail.data);

  // Create Daily Report - ĐÚNG format từ backend
  console.log('\n📤 Create Daily Report...');
  const createReport = await makeRequest('/daily-reports', 'POST', {
    studentId: 1,
    classId: 1,
    livingData: JSON.stringify({ 
      mealType: 'Lunch', 
      eatingLevel: 'All eaten',
      notes: 'Ăn hết, ngủ đúng giờ'
    }),
    educationalData: JSON.stringify({
      activity: 'Vẽ tranh',
      participation: 'Tích cực'
    }),
    status: 'Completed',
    createdBy: teacherId
  });
  printData('Create Daily Report Result', createReport.data);

  // 9. Invoice APIs
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('9️⃣  INVOICE APIs');
  console.log('═══════════════════════════════════════════════════════════════════════');
  
  const invoices = await makeRequest('/Invoice', 'GET');
  printData('All Invoices', invoices.data);
  
  const invoicesByStudent = await makeRequest('/Invoice/student/1', 'GET');
  printData('Invoices for Student 1', invoicesByStudent.data);
  
  const invoiceDetail = await makeRequest('/Invoice/1', 'GET');
  printData('Invoice Detail (ID=1)', invoiceDetail.data);
  
  const invoiceSummary = await makeRequest('/Invoice/student/1/summary', 'GET');
  printData('Invoice Summary Student 1', invoiceSummary.data);

  // 10. Announcement APIs
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('🔟  ANNOUNCEMENT APIs');
  console.log('═══════════════════════════════════════════════════════════════════════');
  
  const announcements = await makeRequest('/Announcements', 'GET');
  printData('All Announcements', announcements.data);
  
  const announcementDetail = await makeRequest('/Announcements/1', 'GET');
  printData('Announcement Detail (ID=1)', announcementDetail.data);

  // Create Announcement
  console.log('\n📤 Create Announcement...');
  const createAnnouncement = await makeRequest('/Announcements', 'POST', {
    Title: 'Thông báo test ' + new Date().toLocaleString(),
    Content: 'Nội dung thông báo test từ teacher',
    TargetAudience: 'All',
    TargetClassId: null,
    Priority: 'Normal',
    IsPublished: true
  });
  printData('Create Announcement Result', createAnnouncement.data);

  // 11. Notification APIs
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('1️⃣1️⃣  NOTIFICATION APIs');
  console.log('═══════════════════════════════════════════════════════════════════════');
  
  const notifications = await makeRequest('/Notification', 'GET');
  printData('My Notifications', notifications.data);

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`User: ${userInfo.fullName} (${userInfo.username})`);
  console.log(`Role: ${userInfo.roles?.[0] || userInfo.role}`);
  console.log(`Teacher ID: ${teacherId}`);
  console.log('\n✅ Tất cả API đã được test với dữ liệu thật!');
}

runAllTests().catch(console.error);
