export interface SampleRow {
  id: string;
  __sample: true;
  [key: string]: unknown;
}

function daysFromNow(days: number, iso = true): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return iso ? d.toISOString() : d.toISOString().slice(0, 10);
}

function dateOnly(days: number): string {
  return daysFromNow(days, false);
}

function s(id: string, data: Record<string, unknown>): SampleRow {
  return { id: `sample-${id}`, __sample: true, ...data };
}

const SAMPLE_DATA: Record<string, SampleRow[]> = {
  announcements: [
    s('ann1', { title: 'Monthly Staff Meeting', titleMr: 'मासिक कर्मचारी बैठक', body: 'Monthly staff meeting will be held in the office hall. Attendance is mandatory for all departments.', bodyMr: 'मासिक कर्मचारी बैठक ऑफिस हॉलमध्ये होणार आहे. सर्व विभागांसाठी उपस्थिती अनिवार्य आहे.', publishedAt: daysFromNow(-2) }),
    s('ann2', { title: 'Doctor Visit Schedule', titleMr: 'डॉक्टर भेटीचे वेळापत्रक', body: 'Visiting doctor will be available every Tuesday and Friday from 10 AM to 1 PM.', bodyMr: 'भेट देणारे डॉक्टर प्रत्येक मंगळवार आणि शुक्रवारी सकाळी 10 ते दुपारी 1 पर्यंत उपलब्ध असतील.', publishedAt: daysFromNow(-5) }),
    s('ann3', { title: 'Independence Day Celebrations', titleMr: 'स्वातंत्र्य दिन साजरा', body: 'Independence day celebrations will be organized on 15 August with cultural programmes and refreshments.', bodyMr: 'स्वातंत्र्य दिनाचा उत्सव 15 ऑगस्ट रोजी सांस्कृतिक कार्यक्रम आणि जेवणासह आयोजित केला जाईल.', publishedAt: daysFromNow(-9) }),
  ],

  events: [
    s('ev1', { title: 'Holi Celebration', titleMr: 'होळी उत्सव', description: 'Rang and cultural programme for all residents.', eventDate: daysFromNow(3), photos: [] }),
    s('ev2', { title: 'Health Check-up Camp', titleMr: 'आरोग्य तपासणी शिबिर', description: 'Free health check-up camp with visiting doctors.', eventDate: daysFromNow(6), photos: [] }),
    s('ev3', { title: 'Annual Day Function', titleMr: 'वार्षिक स्नेह संमेलन', description: 'Annual function with awards and performances.', eventDate: daysFromNow(14), photos: [] }),
  ],

  inquiries: [
    s('inq1', { name: 'Ramesh Patil', phone: '9876543210', email: 'ramesh.patil@example.com', subject: 'Admission enquiry', message: 'I would like to know about admission procedure and monthly charges for my mother.', status: 'open', createdAt: daysFromNow(-1) }),
    s('inq2', { name: 'Sunita Deshmukh', phone: '9123456780', email: 'sunita.d@example.com', subject: 'Volunteer visit', message: 'We are a group of volunteers who would like to visit the home next weekend.', status: 'in-progress', createdAt: daysFromNow(-3) }),
    s('inq3', { name: 'Vikram Shinde', phone: '9988776655', email: 'vikram.shinde@example.com', subject: 'Donation', message: 'I want to donate blankets and warm clothes for the winter season.', status: 'resolved', createdAt: daysFromNow(-6) }),
  ],

  health: [
    s('res1', { id: 'sample-res1', fullName: 'Anita Kulkarni', residentNumber: 'R-1001', gender: 'Female', age: 72 }),
    s('res2', { id: 'sample-res2', fullName: 'Madhavrao Joshi', residentNumber: 'R-1002', gender: 'Male', age: 78 }),
    s('res3', { id: 'sample-res3', fullName: 'Shalini Gokhale', residentNumber: 'R-1003', gender: 'Female', age: 69 }),
  ],

  'health.vitals': [
    s('v1', { residentId: 'sample-res1', temperature: 36.6, pulse: 74, bpSystolic: 122, bpDiastolic: 80, sugar: 110, weight: 58, recordedAt: daysFromNow(-1) }),
    s('v2', { residentId: 'sample-res2', temperature: 36.9, pulse: 78, bpSystolic: 138, bpDiastolic: 88, sugar: 132, weight: 64, recordedAt: daysFromNow(-2) }),
    s('v3', { residentId: 'sample-res3', temperature: 36.4, pulse: 70, bpSystolic: 118, bpDiastolic: 76, sugar: 98, weight: 52, recordedAt: daysFromNow(-3) }),
  ],

  'finance.income': [
    s('inc1', { amount: 25000, date: dateOnly(-1), source: 'Government Grant', category: 'Grant' }),
    s('inc2', { amount: 12000, date: dateOnly(-3), source: 'Monthly Donation', category: 'Donation' }),
    s('inc3', { amount: 8000, date: dateOnly(-6), source: 'Room Rent', category: 'Rent' }),
  ],

  'finance.expense': [
    s('exp1', { amount: 15000, date: dateOnly(-1), category: 'Groceries' }),
    s('exp2', { amount: 6000, date: dateOnly(-3), category: 'Medicines' }),
    s('exp3', { amount: 4000, date: dateOnly(-5), category: 'Electricity Bill' }),
  ],

  'finance.voucher': [
    s('vch1', { voucherNumber: 'VCH-2026-001', voucherDate: dateOnly(-1), voucherType: 'payment', amount: 15000, status: 'approved', narration: 'Monthly grocery purchase' }),
    s('vch2', { voucherNumber: 'VCH-2026-002', voucherDate: dateOnly(-2), voucherType: 'receipt', amount: 25000, status: 'approved', narration: 'Government grant received' }),
    s('vch3', { voucherNumber: 'VCH-2026-003', voucherDate: dateOnly(-4), voucherType: 'payment', amount: 6000, status: 'draft', narration: 'Medicine bill' }),
  ],

  'finance.donation': [
    s('don1', { donorName: 'Mr. Rajendra Agarwal', donationDate: dateOnly(-1), mode: 'bank-transfer', amount: 50000, donationType: 'General', receipt80GIssued: true, receiptNumber: 'R-8001' }),
    s('don2', { donorName: 'Smt. Meera Nair', donationDate: dateOnly(-3), mode: 'cheque', amount: 20000, donationType: 'Medical Fund', receipt80GIssued: false, receiptNumber: 'R-8002' }),
    s('don3', { donorName: 'Rotary Club', donationDate: dateOnly(-5), mode: 'upi', amount: 75000, donationType: 'Infrastructure', receipt80GIssued: true, receiptNumber: 'R-8003' }),
  ],

  'finance.budget': [
    s('bud1', { category: 'Kitchen & Food', department: 'Kitchen', financialYear: '2026-27', allocated: 1200000, spent: 650000, status: 'approved' }),
    s('bud2', { category: 'Medical Care', department: 'Doctor', financialYear: '2026-27', allocated: 800000, spent: 420000, status: 'approved' }),
    s('bud3', { category: 'Maintenance', department: 'Maintenance', financialYear: '2026-27', allocated: 300000, spent: 180000, status: 'draft' }),
  ],

  'finance.cash': [
    s('cash1', { date: dateOnly(-1), particulars: 'Opening balance', type: 'opening', amount: 45000, runningBalance: 45000 }),
    s('cash2', { date: dateOnly(-1), particulars: 'Cash received from donation', type: 'receipt', amount: 12000, runningBalance: 57000 }),
    s('cash3', { date: dateOnly(0), particulars: 'Vegetable purchase', type: 'payment', amount: 3500, runningBalance: 53500 }),
  ],

  'finance.bank': [
    s('bank1', { date: dateOnly(-1), particulars: 'Salary transfer', type: 'neft', amount: 150000, bankName: 'State Bank of India' }),
    s('bank2', { date: dateOnly(-2), particulars: 'Grant deposit', type: 'deposit', amount: 250000, bankName: 'State Bank of India' }),
    s('bank3', { date: dateOnly(-3), particulars: 'Vendor payment', type: 'withdrawal', amount: 30000, bankName: 'State Bank of India' }),
  ],

  'reports.admissions': [
    s('rpt1', { applicationNumber: 'APP-2026-001', name: 'Anita Kulkarni', age: 72, gender: 'Female', status: 'APPROVED', date: dateOnly(-4) }),
    s('rpt2', { applicationNumber: 'APP-2026-002', name: 'Madhavrao Joshi', age: 78, gender: 'Male', status: 'PENDING', date: dateOnly(-2) }),
    s('rpt3', { applicationNumber: 'APP-2026-003', name: 'Shalini Gokhale', age: 69, gender: 'Female', status: 'APPROVED', date: dateOnly(-1) }),
  ],

  'reports.medical': [
    s('rptm1', { date: dateOnly(-1), name: 'Anita Kulkarni', diagnosis: 'Hypertension', medicine: 'Amlodipine 5mg', doctor: 'Dr. Sharma' }),
    s('rptm2', { date: dateOnly(-2), name: 'Madhavrao Joshi', diagnosis: 'Diabetes Type 2', medicine: 'Metformin 500mg', doctor: 'Dr. Sharma' }),
    s('rptm3', { date: dateOnly(-3), name: 'Shalini Gokhale', diagnosis: 'Arthritis', medicine: 'Paracetamol', doctor: 'Dr. Kulkarni' }),
  ],

  'reports.attendance': [
    s('rpta1', { date: dateOnly(-1), present: 42, absent: 3, onLeave: 2, total: 47, percentage: 89 }),
    s('rpta2', { date: dateOnly(-2), present: 44, absent: 1, onLeave: 2, total: 47, percentage: 94 }),
    s('rpta3', { date: dateOnly(-3), present: 45, absent: 2, onLeave: 0, total: 47, percentage: 96 }),
  ],

  'reg.admission': [
    s('adm1', { applicationNumber: 'ADM-2026-001', status: 'APPROVED', name: 'Anita Kulkarni', currentAge: 72, createdAt: daysFromNow(-4) }),
    s('adm2', { applicationNumber: 'ADM-2026-002', status: 'SUBMITTED', name: 'Madhavrao Joshi', currentAge: 78, createdAt: daysFromNow(-2) }),
    s('adm3', { applicationNumber: 'ADM-2026-003', status: 'DRAFT', name: 'Shalini Gokhale', currentAge: 69, createdAt: daysFromNow(-1) }),
  ],

  'reg.visit': [
    s('vs1', { entryNumber: 'VB2026-000001', status: 'FINALIZED', entryDate: dateOnly(-2), officerName: 'S. R. Pawar', officerPost: 'Talathi', remark: 'Annual inspection visit completed.' }),
    s('vs2', { entryNumber: 'VB2026-000002', status: 'SUBMITTED', entryDate: dateOnly(-1), officerName: 'M. A. Kulkarni', officerPost: 'CDPO', remark: 'Reviewed kitchen and store records.' }),
    s('vs3', { entryNumber: 'VB2026-000003', status: 'DRAFT', entryDate: dateOnly(0), officerName: 'P. N. Desai', officerPost: 'District Officer', remark: 'Visit scheduled for verification.' }),
  ],

  'reg.inward': [
    s('in1', { entryNumber: 'INW2026-000001', status: 'FINALIZED', fileNo: 'F-12', senderName: 'Zilla Parishad Office', letterNo: 'ZP/ADM/2026/118', receivedDate: dateOnly(-3), subject: 'Sanction letter for grant release', issuedTo: 'Account Section' }),
    s('in2', { entryNumber: 'INW2026-000002', status: 'SUBMITTED', fileNo: 'F-13', senderName: 'Social Welfare Department', letterNo: 'SWD/2026/221', receivedDate: dateOnly(-1), subject: 'Guidelines for resident welfare fund', issuedTo: 'Office' }),
    s('in3', { entryNumber: 'INW2026-000003', status: 'DRAFT', fileNo: 'F-14', senderName: 'District Health Office', letterNo: 'DHO/CAMP/2026/56', receivedDate: dateOnly(0), subject: 'Health camp schedule for next month', issuedTo: 'Nursing Section' }),
  ],

  'reg.employeeInout': [
    s('eio1', { entryNumber: 'EIO2026-000001', status: 'FINALIZED', employeeCode: 'EMP-014', employeeName: 'Suresh More', outDate: dateOnly(-1), outTime: '10:30', place: 'District Bank', reason: 'Bank work', returnDate: dateOnly(-1), returnTime: '13:15', remarks: 'Submitted deposit slip.' }),
    s('eio2', { entryNumber: 'EIO2026-000002', status: 'SUBMITTED', employeeCode: 'EMP-021', employeeName: 'Kavita Jadhav', outDate: dateOnly(0), outTime: '11:00', place: 'Medical Store', reason: 'Medicine purchase', returnDate: dateOnly(0), returnTime: '15:00', remarks: 'Procured monthly medicines.' }),
    s('eio3', { entryNumber: 'EIO2026-000003', status: 'DRAFT', employeeCode: 'EMP-009', employeeName: 'Ravi Patil', outDate: dateOnly(0), outTime: '09:45', place: 'City', reason: 'Personal errand', returnDate: null, returnTime: '', remarks: '' }),
  ],

  'reg.distribution': [
    s('dis1', { date: dateOnly(-1), personName: 'Anita Kulkarni', className: 'General', clothesWashingPowder: 1, clothesWashingSoap: 2, bathingSoap: 2, toothPowder: 1, paste: 1, brush: 1, distributionDate: dateOnly(-1), remarks: 'Monthly kit delivered.' }),
    s('dis2', { date: dateOnly(-2), personName: 'Madhavrao Joshi', className: 'General', clothesWashingPowder: 1, clothesWashingSoap: 2, bathingSoap: 2, toothPowder: 1, paste: 1, brush: 1, distributionDate: dateOnly(-2), remarks: 'Monthly kit delivered.' }),
    s('dis3', { date: dateOnly(-3), personName: 'Shalini Gokhale', className: 'General', clothesWashingPowder: 1, clothesWashingSoap: 2, bathingSoap: 2, toothPowder: 1, paste: 1, brush: 1, distributionDate: dateOnly(-3), remarks: 'Monthly kit delivered.' }),
  ],

  'reg.medical': [
    s('md1', { entryNumber: 'MD2026-000001', status: 'FINALIZED', illnessDate: dateOnly(-1), personName: 'Anita Kulkarni', diseaseNature: 'Hypertension', medicineParticulars: 'Amlodipine 5mg, 1 tablet daily', medicineAllowances: '600', medicalOfficerName: 'Dr. S. Sharma', remarks: 'BP stable.' }),
    s('md2', { entryNumber: 'MD2026-000002', status: 'SUBMITTED', illnessDate: dateOnly(-2), personName: 'Madhavrao Joshi', diseaseNature: 'Diabetes Type 2', medicineParticulars: 'Metformin 500mg, 2 tablets daily', medicineAllowances: '900', medicalOfficerName: 'Dr. S. Sharma', remarks: 'Sugar under control.' }),
    s('md3', { entryNumber: 'MD2026-000003', status: 'DRAFT', illnessDate: dateOnly(0), personName: 'Shalini Gokhale', diseaseNature: 'Arthritis', medicineParticulars: 'Paracetamol as needed', medicineAllowances: '300', medicalOfficerName: 'Dr. V. Kulkarni', remarks: '' }),
  ],

  'reg.cashbook': [
    s('cb1', { entryNumber: 'CB2026-000001', status: 'FINALIZED', entryDate: dateOnly(-1), month: '01', vrNo: 'V-001', particulars: 'Opening balance', lfNo: '1', cashRupees: 45000, cashPaise: 0, bankRupees: 0, bankPaise: 0, remarks: '' }),
    s('cb2', { entryNumber: 'CB2026-000002', status: 'SUBMITTED', entryDate: dateOnly(-1), month: '01', vrNo: 'V-002', particulars: 'Donation received', lfNo: '1', cashRupees: 12000, cashPaise: 50, bankRupees: 0, bankPaise: 0, remarks: 'Receipt R-8001.' }),
    s('cb3', { entryNumber: 'CB2026-000003', status: 'DRAFT', entryDate: dateOnly(0), month: '01', vrNo: 'V-003', particulars: 'Vegetable purchase', lfNo: '2', cashRupees: 3500, cashPaise: 25, bankRupees: 0, bankPaise: 0, remarks: '' }),
  ],

  'reg.yearwise': [
    s('ywa1', { entryNumber: 'YWA2026-000001', status: 'APPROVED', fullName: 'Anita Kulkarni', birthYear: 1954, admissionDate: dateOnly(-30), aadhaarMasked: 'XXXX-XXXX-1234', aadhaar: '', aadhaarReadable: false, signatureType: 'Thumb', officerName: 'R. N. Deshpande', residentId: 'sample-res1', registerYear: '2026' }),
    s('ywa2', { entryNumber: 'YWA2026-000002', status: 'UNDER_REVIEW', fullName: 'Madhavrao Joshi', birthYear: 1948, admissionDate: dateOnly(-10), aadhaarMasked: 'XXXX-XXXX-5678', aadhaar: '', aadhaarReadable: false, signatureType: 'Thumb', officerName: 'R. N. Deshpande', residentId: 'sample-res2', registerYear: '2026' }),
    s('ywa3', { entryNumber: 'YWA2026-000003', status: 'DRAFT', fullName: 'Shalini Gokhale', birthYear: 1957, admissionDate: dateOnly(0), aadhaarMasked: 'XXXX-XXXX-9012', aadhaar: '', aadhaarReadable: false, signatureType: 'Thumb', officerName: '', residentId: null, registerYear: '2026' }),
  ],

  'reg.attendance': [
    s('att1', { sessionId: 'ATT-2026-01-18-000001', attendanceDate: dateOnly(-1), status: 'FINALIZED', entries: [1, 2, 3], corrections: [] }),
    s('att2', { sessionId: 'ATT-2026-01-17-000001', attendanceDate: dateOnly(-2), status: 'SUBMITTED', entries: [1, 2, 3], corrections: [] }),
    s('att3', { sessionId: 'ATT-2026-01-19-000001', attendanceDate: dateOnly(0), status: 'DRAFT', entries: [1, 2], corrections: [] }),
  ],
};

const FALLBACK_SAMPLE: SampleRow[] = [
  s('f1', { name: 'Sample Record One', date: dateOnly(-1), status: 'active', amount: 5000 }),
  s('f2', { name: 'Sample Record Two', date: dateOnly(-2), status: 'active', amount: 2500 }),
  s('f3', { name: 'Sample Record Three', date: dateOnly(-3), status: 'pending', amount: 1200 }),
];

export function sampleRowsFor(key: string): SampleRow[] {
  return SAMPLE_DATA[key] ?? FALLBACK_SAMPLE;
}

export function sampleVitalsFor(): SampleRow[] {
  return SAMPLE_DATA['health.vitals'] ?? [];
}

export function sampleRowsForModule(code: string, fields: { key: string; type: string; enum: string[] | null }[]): SampleRow[] {
  const names = ['Anita Kulkarni', 'Madhavrao Joshi', 'Shalini Gokhale'];
  const rows: SampleRow[] = [];
  for (let i = 0; i < 3; i += 1) {
    const row: Record<string, unknown> = {};
    for (const f of fields) {
      const k = f.key.toLowerCase();
      if (/name/.test(k)) row[f.key] = names[i];
      else if (f.type === 'number' || /amount|qty|price|count|age|total|quantity/.test(k)) row[f.key] = 1000 + i * 250;
      else if (f.type === 'date' || /date|on$|at$/.test(k)) row[f.key] = dateOnly(-i - 1);
      else if (f.enum && f.enum.length > 0) row[f.key] = f.enum[Math.min(i, f.enum.length - 1)];
      else if (/status/.test(k)) row[f.key] = 'active';
      else if (/note|remark|desc|message|detail/.test(k)) row[f.key] = `Sample entry ${i + 1} for ${code}`;
      else row[f.key] = `Sample ${i + 1}`;
    }
    rows.push(s(`${code}-${i}`, row));
  }
  return rows;
}