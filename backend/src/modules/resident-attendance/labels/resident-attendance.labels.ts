export interface Trilingual {
  mr: string;
  hi: string;
  en: string;
}

export type AttLabelKey =
  | 'registerTitle'
  | 'institutionName'
  | 'district'
  | 'taluka'
  | 'attendanceDate'
  | 'srNo'
  | 'residentName'
  | 'residentId'
  | 'photo'
  | 'roomBed'
  | 'status'
  | 'reason'
  | 'present'
  | 'absent'
  | 'onLeave'
  | 'medical'
  | 'temporarilyOut'
  | 'other'
  | 'presentAll'
  | 'submit'
  | 'editAttendance'
  | 'correctionMode'
  | 'correctionReason'
  | 'submitSummary'
  | 'total'
  | 'marked'
  | 'unmarked'
  | 'confirmSubmit'
  | 'cancel'
  | 'confirm'
  | 'search'
  | 'filterStatus'
  | 'monthlyView'
  | 'dailyView'
  | 'month'
  | 'year'
  | 'attendancePercentage'
  | 'auditHistory'
  | 'originalStatus'
  | 'newStatus'
  | 'exportPdf'
  | 'exportCsv'
  | 'listEmpty'
  | 'missingStatuses'
  | 'summaryCounts';

const L = {
  registerTitle: { mr: 'निवासी हजेरी नोंदवही', hi: 'निवासी उपस्थिति रजिस्टर', en: 'RESIDENT ATTENDANCE REGISTER' },
  institutionName: { mr: 'संस्थेचे नाव', hi: 'संस्था का नाम', en: 'Institution Name:' },
  district: { mr: 'जिल्हा', hi: 'जिला', en: 'District:' },
  taluka: { mr: 'तालुका', hi: 'तहसील', en: 'Taluka:' },
  attendanceDate: { mr: 'हजेरी दिनांक', hi: 'उपस्थिति दिनांक', en: 'Attendance Date' },
  srNo: { mr: 'अ. क्र.', hi: 'क्रमांक', en: 'Sr. No.' },
  residentName: { mr: 'निवासी यांचे नाव', hi: 'निवासी का नाम', en: 'Resident Name' },
  residentId: { mr: 'निवासी क्र.', hi: 'निवासी क्र.', en: 'Resident ID' },
  photo: { mr: 'फोटो', hi: 'फोटो', en: 'Photo' },
  roomBed: { mr: 'खोली / बेड', hi: 'कक्ष / बिस्तर', en: 'Room / Bed' },
  status: { mr: 'स्थिती', hi: 'स्थिति', en: 'Status' },
  reason: { mr: 'कारण', hi: 'कारण', en: 'Reason' },
  present: { mr: 'उपस्थित', hi: 'उपस्थित', en: 'Present' },
  absent: { mr: 'अनुपस्थित', hi: 'अनुपस्थित', en: 'Absent' },
  onLeave: { mr: 'रजेवर', hi: 'छुट्टी पर', en: 'On Leave' },
  medical: { mr: 'वैद्यकीय / रुग्णालय', hi: 'चिकित्सकीय / अस्पताल', en: 'Medical / Hospital' },
  temporarilyOut: { mr: 'तात्पुरते बाहेर', hi: 'अस्थायी रूप से बाहर', en: 'Temporarily Out' },
  other: { mr: 'इतर', hi: 'अन्य', en: 'Other' },
  presentAll: { mr: 'सर्व उपस्थित', hi: 'सबको उपस्थित करें', en: 'Present All' },
  submit: { mr: 'सबमिट करा', hi: 'सबमिट करें', en: 'Submit' },
  editAttendance: { mr: 'हजेरी संपादित करा', hi: 'उपस्थिति संपादित करें', en: 'Edit Attendance' },
  correctionMode: { mr: 'दुरुस्ती मोड', hi: 'संशोधन मोड', en: 'Correction Mode' },
  correctionReason: { mr: 'दुरुस्तीचे कारण', hi: 'संशोधन का कारण', en: 'Reason for correction' },
  submitSummary: { mr: 'हजेरी सारांश', hi: 'उपस्थिति सारांश', en: 'Attendance Summary' },
  total: { mr: 'एकूण', hi: 'कुल', en: 'Total' },
  marked: { mr: 'नोंदवले', hi: 'चिह्नित', en: 'Marked' },
  unmarked: { mr: 'नोंदवले नाही', hi: 'अचिह्नित', en: 'Unmarked' },
  confirmSubmit: { mr: 'आजची हजेरी सबमिट करायची का?', hi: 'क्या आज की उपस्थिति सबमिट करें?', en: 'Are you sure you want to submit today\'s attendance?' },
  cancel: { mr: 'रद्द करा', hi: 'रद्द करें', en: 'Cancel' },
  confirm: { mr: 'पुष्टी करा', hi: 'पुष्टि करें', en: 'Confirm & Submit' },
  search: { mr: 'शोधा', hi: 'खोजें', en: 'Search' },
  filterStatus: { mr: 'स्थितीनुसार गाळा', hi: 'स्थिति अनुसार छांटें', en: 'Filter by Status' },
  monthlyView: { mr: 'मासिक दृश्य', hi: 'मासिक दृश्य', en: 'Monthly View' },
  dailyView: { mr: 'दैनिक दृश्य', hi: 'दैनिक दृश्य', en: 'Daily View' },
  month: { mr: 'महिना', hi: 'महीना', en: 'Month' },
  year: { mr: 'वर्ष', hi: 'वर्ष', en: 'Year' },
  attendancePercentage: { mr: 'उपस्थिती टक्के', hi: 'उपस्थिति प्रतिशत', en: 'Attendance %' },
  auditHistory: { mr: 'ऑडिट इतिहास', hi: 'ऑडिट इतिहास', en: 'Audit History' },
  originalStatus: { mr: 'मूळ स्थिती', hi: 'मूल स्थिति', en: 'Original Status' },
  newStatus: { mr: 'नवीन स्थिती', hi: 'नई स्थिति', en: 'New Status' },
  exportPdf: { mr: 'पीडीएफ करा', hi: 'पीडीएफ करें', en: 'Export PDF' },
  exportCsv: { mr: 'सीएसव्ही करा', hi: 'सीएसव्ही करें', en: 'Export CSV' },
  listEmpty: { mr: 'नोंदी नाहीत', hi: 'कोई प्रविष्टि नहीं', en: 'No records' },
  missingStatuses: { mr: 'हजेरी अपूर्ण आहे. खालील निवासी नोंदवलेले नाहीत:', hi: 'उपस्थिति अधूरी है। निम्न निवासी चिह्नित नहीं हैं:', en: 'Attendance is incomplete. The following residents have not been marked:' },
  summaryCounts: { mr: 'एकूण {total} | नोंदवले {marked} | उपस्थित {present} | अनुपस्थित {absent} | रजेवर {onLeave} | वैद्यकीय {medical} | तात्पुरते बाहेर {temporarilyOut} | इतर {other}', hi: 'कुल {total} | चिह्नित {marked} | उपस्थित {present} | अनुपस्थित {absent} | छुट्टी {onLeave} | चिकित्सा {medical} | अस्थायी बाहर {temporarilyOut} | अन्य {other}', en: 'Total {total} | Marked {marked} | Present {present} | Absent {absent} | Leave {onLeave} | Medical {medical} | Temp. Out {temporarilyOut} | Other {other}' },
} as const satisfies Record<AttLabelKey, Trilingual>;

export const ATT_LABELS: Record<AttLabelKey, Trilingual> = L;

export function attLabel(key: AttLabelKey): Trilingual {
  return L[key];
}