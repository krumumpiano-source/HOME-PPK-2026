/**
 * ============================================================================
 *  HOME PPK 2026 — Seed Data Script
 *  วิธีใช้: เปิด admin-settings.html ในเบราว์เซอร์ → F12 → Console
 *           วางโค้ดทั้งหมดนี้แล้วกด Enter
 * ============================================================================
 */

(function () {

  // ── Helper ──────────────────────────────────────────────────────────────
  const coId = (n) => `COR-${String(n).padStart(3, '0')}`;
  const resId = (n) => `RES${String(n).padStart(3, '0')}`;
  const now = new Date().toISOString();

  // ============================================================
  //  1. HOUSING DATA
  // ============================================================
  const housing = [
    // บ้านพัก 1-12
    { id: 1,  type: 'house', number: '1',  displayNumber: 'บ้าน 1',  zone: '',  status: 'occupied',   note: '' },
    { id: 2,  type: 'house', number: '2',  displayNumber: 'บ้าน 2',  zone: '',  status: 'occupied',   note: '' },
    { id: 3,  type: 'house', number: '3',  displayNumber: 'บ้าน 3',  zone: '',  status: 'occupied',   note: '' },
    { id: 4,  type: 'house', number: '4',  displayNumber: 'บ้าน 4',  zone: '',  status: 'occupied',   note: '' },
    { id: 5,  type: 'house', number: '5',  displayNumber: 'บ้าน 5',  zone: '',  status: 'occupied',   note: '' },
    { id: 6,  type: 'house', number: '6',  displayNumber: 'บ้าน 6',  zone: '',  status: 'occupied',   note: '' },
    { id: 7,  type: 'house', number: '7',  displayNumber: 'บ้าน 7',  zone: '',  status: 'available',  note: 'พร้อมเข้าอยู่' },
    { id: 8,  type: 'house', number: '8',  displayNumber: 'บ้าน 8',  zone: '',  status: 'occupied',   note: '' },
    { id: 9,  type: 'house', number: '9',  displayNumber: 'บ้าน 9',  zone: '',  status: 'occupied',   note: '' },
    { id: 10, type: 'house', number: '10', displayNumber: 'บ้าน 10', zone: '',  status: 'occupied',   note: '' },
    { id: 11, type: 'house', number: '11', displayNumber: 'บ้าน 11', zone: '',  status: 'maintenance',note: 'ซ่อมหลังคา' },
    { id: 12, type: 'house', number: '12', displayNumber: 'บ้าน 12', zone: '',  status: 'occupied',   note: '' },
    // แฟลต 101-112
    { id: 21, type: 'flat',  number: '101', displayNumber: 'แฟลต 101', zone: 'A', status: 'occupied',   note: '' },
    { id: 22, type: 'flat',  number: '102', displayNumber: 'แฟลต 102', zone: 'A', status: 'occupied',   note: '' },
    { id: 23, type: 'flat',  number: '103', displayNumber: 'แฟลต 103', zone: 'A', status: 'available',  note: '' },
    { id: 24, type: 'flat',  number: '104', displayNumber: 'แฟลต 104', zone: 'A', status: 'occupied',   note: '' },
    { id: 25, type: 'flat',  number: '105', displayNumber: 'แฟลต 105', zone: 'B', status: 'occupied',   note: '' },
    { id: 26, type: 'flat',  number: '106', displayNumber: 'แฟลต 106', zone: 'B', status: 'occupied',   note: '' },
    { id: 27, type: 'flat',  number: '107', displayNumber: 'แฟลต 107', zone: 'B', status: 'maintenance',note: 'ระบบไฟขัดข้อง' },
    { id: 28, type: 'flat',  number: '108', displayNumber: 'แฟลต 108', zone: 'B', status: 'occupied',   note: '' },
  ];

  // ============================================================
  //  2. RESIDENTS DATA
  // ============================================================
  const residents = [

    // ── บ้าน 1 ──────────────────────────────────────────────
    {
      id: resId(1),
      prefix: 'นาง', firstname: 'สุดารัตน์', lastname: 'วงศ์คำ',
      house_number: 'บ้าน 1', residentType: 'staff',
      position: 'ครู', subject_group: 'ภาษาไทย',
      phone: '0812345601', email: 'sudarat.w@ppk.ac.th',
      birthdate: '2510-03-15', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([
        { id: coId(1), prefix: 'นาย', firstname: 'วิชาญ', lastname: 'วงศ์คำ',
          relation: 'สามี', phone: '0876543210', email: '',
          birthdate: '2507-07-22', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
        { id: coId(2), prefix: 'ด.ญ.', firstname: 'พลอยพิศ', lastname: 'วงศ์คำ',
          relation: 'บุตร', phone: '', email: '',
          birthdate: '2547-11-05', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
      ])
    },

    // ── บ้าน 2 ──────────────────────────────────────────────
    {
      id: resId(2),
      prefix: 'นาย', firstname: 'ประชา', lastname: 'ดีสม',
      house_number: 'บ้าน 2', residentType: 'staff',
      position: 'ครู ชำนาญการพิเศษ', subject_group: 'คณิตศาสตร์',
      phone: '0823456702', email: 'pracha.d@ppk.ac.th',
      birthdate: '2504-09-28', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([
        { id: coId(3), prefix: 'นาง', firstname: 'รัตนา', lastname: 'ดีสม',
          relation: 'ภรรยา', phone: '0898765432', email: '',
          birthdate: '2506-02-14', is_ppk_staff: true,
          position: 'ครู', subject_group: 'วิทยาศาสตร์', added_at: now },
        { id: coId(4), prefix: 'นาย', firstname: 'ณัฐพล', lastname: 'ดีสม',
          relation: 'บุตร', phone: '0611234567', email: 'nattaphon.d@gmail.com',
          birthdate: '2542-05-18', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
        { id: coId(5), prefix: 'ด.ช.', firstname: 'ปริญญา', lastname: 'ดีสม',
          relation: 'บุตร', phone: '', email: '',
          birthdate: '2551-08-30', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
      ])
    },

    // ── บ้าน 3 ──────────────────────────────────────────────
    {
      id: resId(3),
      prefix: 'นางสาว', firstname: 'กนกวรรณ', lastname: 'สุขใจ',
      house_number: 'บ้าน 3', residentType: 'staff',
      position: 'ครู', subject_group: 'ภาษาอังกฤษ',
      phone: '0834567803', email: 'kanokwan.s@ppk.ac.th',
      birthdate: '2518-12-03', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([
        { id: coId(6), prefix: 'นาง', firstname: 'สมศรี', lastname: 'สุขใจ',
          relation: 'มารดา', phone: '0856789012', email: '',
          birthdate: '2490-06-10', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
      ])
    },

    // ── บ้าน 4 ──────────────────────────────────────────────
    {
      id: resId(4),
      prefix: 'นาย', firstname: 'อนุชา', lastname: 'ทองดี',
      house_number: 'บ้าน 4', residentType: 'staff',
      position: 'ครู ชำนาญการ', subject_group: 'สังคมศึกษา',
      phone: '0845678904', email: 'anucha.t@ppk.ac.th',
      birthdate: '2515-04-20', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([
        { id: coId(7), prefix: 'นาง', firstname: 'ลลิตา', lastname: 'ทองดี',
          relation: 'ภรรยา', phone: '0867890123', email: '',
          birthdate: '2516-09-12', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
        { id: coId(8), prefix: 'ด.ญ.', firstname: 'ลักษณา', lastname: 'ทองดี',
          relation: 'บุตร', phone: '', email: '',
          birthdate: '2553-03-07', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
        { id: coId(9), prefix: 'ด.ช.', firstname: 'สรยุทธ', lastname: 'ทองดี',
          relation: 'บุตร', phone: '', email: '',
          birthdate: '2555-10-25', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
      ])
    },

    // ── บ้าน 5 ──────────────────────────────────────────────
    {
      id: resId(5),
      prefix: 'นาง', firstname: 'มาลี', lastname: 'เจริญสุข',
      house_number: 'บ้าน 5', residentType: 'staff',
      position: 'ครู ชำนาญการพิเศษ', subject_group: 'ศิลปะ',
      phone: '0856789005', email: 'malee.c@ppk.ac.th',
      birthdate: '2508-07-08', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([])
    },

    // ── บ้าน 6 ──────────────────────────────────────────────
    {
      id: resId(6),
      prefix: 'นาย', firstname: 'สุระชัย', lastname: 'มีดี',
      house_number: 'บ้าน 6', residentType: 'staff',
      position: 'ครู', subject_group: 'พลศึกษา',
      phone: '0867890106', email: 'surachai.m@ppk.ac.th',
      birthdate: '2520-01-30', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([
        { id: coId(10), prefix: 'นาง', firstname: 'จันทนา', lastname: 'มีดี',
          relation: 'ภรรยา', phone: '0812222333', email: '',
          birthdate: '2521-06-19', is_ppk_staff: true,
          position: 'เจ้าหน้าที่ธุรการ', subject_group: '', added_at: now },
      ])
    },

    // ── บ้าน 8 ──────────────────────────────────────────────
    {
      id: resId(7),
      prefix: 'นาง', firstname: 'วิภาดา', lastname: 'รุ่งเรือง',
      house_number: 'บ้าน 8', residentType: 'staff',
      position: 'ครู ชำนาญการ', subject_group: 'คอมพิวเตอร์',
      phone: '0878901207', email: 'wiphada.r@ppk.ac.th',
      birthdate: '2512-11-11', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([
        { id: coId(11), prefix: 'นาย', firstname: 'กิตติ', lastname: 'รุ่งเรือง',
          relation: 'สามี', phone: '0823333444', email: '',
          birthdate: '2510-08-04', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
        { id: coId(12), prefix: 'นาย', firstname: 'ดนัย', lastname: 'รุ่งเรือง',
          relation: 'บุตร', phone: '0634444555', email: 'danai.r@gmail.com',
          birthdate: '2540-03-26', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
      ])
    },

    // ── บ้าน 9 ──────────────────────────────────────────────
    {
      id: resId(8),
      prefix: 'นาย', firstname: 'ชาญชัย', lastname: 'แสงสว่าง',
      house_number: 'บ้าน 9', residentType: 'staff',
      position: 'ผู้ช่วยผู้อำนวยการ', subject_group: 'บริหาร',
      phone: '0889012308', email: 'chanchai.s@ppk.ac.th',
      birthdate: '2502-05-16', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([
        { id: coId(13), prefix: 'นาง', firstname: 'ปาริชาต', lastname: 'แสงสว่าง',
          relation: 'ภรรยา', phone: '0845555666', email: '',
          birthdate: '2504-12-22', is_ppk_staff: true,
          position: 'ครู ชำนาญการพิเศษ', subject_group: 'ภาษาไทย', added_at: now },
      ])
    },

    // ── บ้าน 10 ─────────────────────────────────────────────
    {
      id: resId(9),
      prefix: 'นางสาว', firstname: 'ปิยะนุช', lastname: 'หอมหวล',
      house_number: 'บ้าน 10', residentType: 'staff',
      position: 'ครู', subject_group: 'ดนตรี-นาฏศิลป์',
      phone: '0890123409', email: 'piyanuch.h@ppk.ac.th',
      birthdate: '2525-08-09', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([])
    },

    // ── บ้าน 12 ─────────────────────────────────────────────
    {
      id: resId(10),
      prefix: 'นาย', firstname: 'ธนพล', lastname: 'ศรีสุข',
      house_number: 'บ้าน 12', residentType: 'staff',
      position: 'ครู ชำนาญการ', subject_group: 'ฟิสิกส์',
      phone: '0801234510', email: 'tanapol.s@ppk.ac.th',
      birthdate: '2517-02-28', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([
        { id: coId(14), prefix: 'นาง', firstname: 'ชนิกา', lastname: 'ศรีสุข',
          relation: 'ภรรยา', phone: '0856666777', email: '',
          birthdate: '2518-10-15', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
        { id: coId(15), prefix: 'ด.ช.', firstname: 'ศุภวิช', lastname: 'ศรีสุข',
          relation: 'บุตร', phone: '', email: '',
          birthdate: '2550-01-20', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
      ])
    },

    // ── แฟลต 101 ────────────────────────────────────────────
    {
      id: resId(11),
      prefix: 'นาย', firstname: 'ศักดิ์ชัย', lastname: 'ใจดี',
      house_number: 'แฟลต 101', residentType: 'staff',
      position: 'ครู', subject_group: 'เคมี',
      phone: '0812345611', email: 'sakchai.j@ppk.ac.th',
      birthdate: '2530-06-12', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([
        { id: coId(16), prefix: 'นาง', firstname: 'สุภาวดี', lastname: 'ใจดี',
          relation: 'ภรรยา', phone: '0867777888', email: '',
          birthdate: '2531-04-03', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
      ])
    },

    // ── แฟลต 102 ────────────────────────────────────────────
    {
      id: resId(12),
      prefix: 'นางสาว', firstname: 'อรอนงค์', lastname: 'นาคะ',
      house_number: 'แฟลต 102', residentType: 'staff',
      position: 'ครู', subject_group: 'ชีววิทยา',
      phone: '0823456712', email: 'oranong.n@ppk.ac.th',
      birthdate: '2532-09-25', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([])
    },

    // ── แฟลต 104 ────────────────────────────────────────────
    {
      id: resId(13),
      prefix: 'นาย', firstname: 'วรพจน์', lastname: 'โชคดี',
      house_number: 'แฟลต 104', residentType: 'staff',
      position: 'ครู ชำนาญการ', subject_group: 'ประวัติศาสตร์',
      phone: '0834567813', email: 'worapot.c@ppk.ac.th',
      birthdate: '2522-11-17', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([
        { id: coId(17), prefix: 'นาง', firstname: 'กัญญา', lastname: 'โชคดี',
          relation: 'ภรรยา', phone: '0878888999', email: '',
          birthdate: '2524-07-08', is_ppk_staff: true,
          position: 'ครู', subject_group: 'ภูมิศาสตร์', added_at: now },
        { id: coId(18), prefix: 'ด.ญ.', firstname: 'พิชชา', lastname: 'โชคดี',
          relation: 'บุตร', phone: '', email: '',
          birthdate: '2554-02-14', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
      ])
    },

    // ── แฟลต 105 ────────────────────────────────────────────
    {
      id: resId(14),
      prefix: 'นาง', firstname: 'ชลธิชา', lastname: 'เพิ่มพูน',
      house_number: 'แฟลต 105', residentType: 'staff',
      position: 'ครู', subject_group: 'แนะแนว',
      phone: '0845678914', email: 'chonticha.p@ppk.ac.th',
      birthdate: '2527-03-03', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([
        { id: coId(19), prefix: 'นาย', firstname: 'ทวีศักดิ์', lastname: 'เพิ่มพูน',
          relation: 'สามี', phone: '0889999000', email: '',
          birthdate: '2525-12-30', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
      ])
    },

    // ── แฟลต 106 ────────────────────────────────────────────
    {
      id: resId(15),
      prefix: 'นาย', firstname: 'ภาณุพงศ์', lastname: 'จันทร์ดี',
      house_number: 'แฟลต 106', residentType: 'staff',
      position: 'ครู', subject_group: 'คณิตศาสตร์',
      phone: '0856789015', email: 'phanupong.j@ppk.ac.th',
      birthdate: '2535-05-22', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([])
    },

    // ── แฟลต 108 ────────────────────────────────────────────
    {
      id: resId(16),
      prefix: 'นางสาว', firstname: 'ธัญชนก', lastname: 'สุริยะ',
      house_number: 'แฟลต 108', residentType: 'staff',
      position: 'ครู', subject_group: 'ภาษาจีน',
      phone: '0867890116', email: 'thanchanok.s@ppk.ac.th',
      birthdate: '2536-10-08', status: 'active', added_at: now,
      cohabitantNames: JSON.stringify([
        { id: coId(20), prefix: 'นาง', firstname: 'วิไล', lastname: 'สุริยะ',
          relation: 'มารดา', phone: '0834444555', email: '',
          birthdate: '2495-04-18', is_ppk_staff: false,
          position: '', subject_group: '', added_at: now },
      ])
    },

  ];

  // ============================================================
  //  3. CLEAR + SAVE
  // ============================================================
  const KEYS = {
    housing:   'adminSettings_housing',
    residents: 'residentsData',
  };

  // ล้างข้อมูลเก่า
  localStorage.removeItem(KEYS.housing);
  localStorage.removeItem(KEYS.residents);
  console.log('%c[SEED] ล้างข้อมูลเก่าแล้ว ✓', 'color:#e53935');

  // บันทึกข้อมูลใหม่
  localStorage.setItem(KEYS.housing,   JSON.stringify(housing));
  localStorage.setItem(KEYS.residents, JSON.stringify(residents));
  console.log(`%c[SEED] บันทึกบ้าน/แฟลต ${housing.length} รายการ ✓`,   'color:#388e3c; font-weight:bold');
  console.log(`%c[SEED] บันทึกผู้พักอาศัย ${residents.length} คน ✓`,      'color:#388e3c; font-weight:bold');

  // สรุปจำนวนสมาชิกในครัวเรือน
  let totalCo = 0;
  residents.forEach(r => { try { totalCo += JSON.parse(r.cohabitantNames||'[]').length; } catch(e){} });
  console.log(`%c[SEED] ผู้ร่วมพัก (cohabitants) รวม ${totalCo} คน ✓`, 'color:#388e3c');

  // ============================================================
  //  4. RE-RENDER (ถ้าอยู่ในหน้า admin-settings)
  // ============================================================
  if (typeof renderManageHousingCards === 'function') renderManageHousingCards();
  if (typeof renderResidentTable      === 'function') renderResidentTable();
  if (typeof renderHouseCards         === 'function') renderHouseCards();

  console.log('%c[SEED] เสร็จสิ้น — รีเฟรชหน้าหรือสลับเมนูเพื่อดูผล ✓', 'color:#1565c0; font-size:14px; font-weight:bold');

  return {
    housing:   housing.length,
    residents: residents.length,
    cohabitants: totalCo
  };

})();
