export interface Trilingual {
  mr: string;
  hi: string;
  en: string;
}

export type YwaLabelKey =
  | 'registerTitle'
  | 'institutionName'
  | 'forYear'
  | 'district'
  | 'srNo'
  | 'fullName'
  | 'dobYear'
  | 'aadhaar'
  | 'signatureThumb'
  | 'photo'
  | 'admissionDate'
  | 'officerSignature'
  | 'officerName'
  | 'officerDesignation'
  | 'remarks'
  | 'status'
  | 'statusDRAFT'
  | 'statusUNDER_REVIEW'
  | 'statusAPPROVED'
  | 'statusFINALIZED'
  | 'statusVOIDED'
  | 'entryNumber'
  | 'registerYear'
  | 'newEntry'
  | 'saveDraft'
  | 'submit'
  | 'approve'
  | 'finalize'
  | 'void'
  | 'edit'
  | 'auditHistory'
  | 'previousValue'
  | 'newValue'
  | 'reasonForChange'
  | 'search'
  | 'filterByYear'
  | 'filterByStatus'
  | 'listEmpty'
  | 'required'
  | 'correctionWorkflow'
  | 'duplicateWarning'
  | 'viewAadhaar'
  | 'aadhaarMasked'
  | 'residents'
  | 'createdAt'
  | 'submittedAt'
  | 'finalizedAt';

const L = {
  registerTitle: { mr: 'वर्षनिहाय प्रवेश रजिस्टर', hi: 'वर्षवार प्रवेश रजिस्टर', en: 'YEAR-WISE ADMISSION REGISTER' },
  institutionName: { mr: 'संस्थेचे नाव', hi: 'संस्था का नाम', en: 'Institution Name:' },
  forYear: { mr: 'वर्ष', hi: 'वर्ष', en: 'Year:' },
  district: { mr: 'जिल्हा', hi: 'जिला', en: 'District:' },
  srNo: { mr: 'अ. क्र.', hi: 'क्रमांक', en: 'Sr. No.' },
  fullName: { mr: 'वृद्धाचे संपूर्ण नाव', hi: 'वृद्ध व्यक्ति का पूरा नाम', en: 'Full Name of Elderly Person' },
  dobYear: { mr: 'जन्म दिनांक / वर्ष', hi: 'जन्म तिथि / वर्ष', en: 'Date of Birth / Year' },
  aadhaar: { mr: 'आधार प्रमाण क्रमांक', hi: 'आधार संख्या', en: 'Aadhaar Number' },
  signatureThumb: { mr: 'सही व अंगठा', hi: 'हस्ताक्षर / अंगूठे का निशान', en: 'Signature / Thumb Impression' },
  photo: { mr: 'फोटो', hi: 'फोटो / छायाचित्र', en: 'Photograph' },
  admissionDate: { mr: 'प्रवेश दिनांक', hi: 'प्रवेश दिनांक', en: 'Admission Date' },
  officerSignature: { mr: 'अधिकारी सही', hi: 'अधिकारी के हस्ताक्षर', en: 'Officer Signature' },
  officerName: { mr: 'अधिकारी यांचे नाव', hi: 'अधिकारी का नाम', en: 'Officer Name' },
  officerDesignation: { mr: 'अधिकारी पदनाम', hi: 'अधिकारी का पद', en: 'Officer Designation' },
  remarks: { mr: 'शेरा', hi: 'टिप्पणी', en: 'Remarks' },
  status: { mr: 'स्थिती', hi: 'स्थिति', en: 'Status' },
  statusDRAFT: { mr: 'मसुदा', hi: 'ड्राफ्ट', en: 'Draft' },
  statusUNDER_REVIEW: { mr: 'तपासणीत', hi: 'समीक्षा में', en: 'Under Review' },
  statusAPPROVED: { mr: 'मंजूर', hi: 'स्वीकृत', en: 'Approved' },
  statusFINALIZED: { mr: 'अंतिम', hi: 'अंतिम', en: 'Finalized' },
  statusVOIDED: { mr: 'रद्द', hi: 'रद्द', en: 'Voided' },
  entryNumber: { mr: 'नोंद क्र.', hi: 'प्रविष्टि क्र.', en: 'Entry No.' },
  registerYear: { mr: 'रजिस्टर वर्ष', hi: 'रजिस्टर वर्ष', en: 'Register Year' },
  newEntry: { mr: 'नवीन नोंद', hi: 'नई प्रविष्टि', en: 'New Entry' },
  saveDraft: { mr: 'मसुदा जतन करा', hi: 'ड्राफ्ट सहेजें', en: 'Save Draft' },
  submit: { mr: 'सादर करा', hi: 'प्रस्तुत करें', en: 'Submit' },
  approve: { mr: 'मंजूर करा', hi: 'स्वीकृत करें', en: 'Approve' },
  finalize: { mr: 'अंतिम करा', hi: 'अंतिम करें', en: 'Finalize' },
  void: { mr: 'रद्द करा', hi: 'रद्द करें', en: 'Void' },
  edit: { mr: 'संपादन', hi: 'संपादित', en: 'Edit' },
  auditHistory: { mr: 'ऑडिट इतिहास', hi: 'ऑडिट इतिहास', en: 'Audit History' },
  previousValue: { mr: 'जुने मूल्य', hi: 'पिछला मान', en: 'Previous Value' },
  newValue: { mr: 'नवीन मूल्य', hi: 'नया मान', en: 'New Value' },
  reasonForChange: { mr: 'बदलाचे कारण', hi: 'परिवर्तन का कारण', en: 'Reason for Change' },
  search: { mr: 'शोधा', hi: 'खोजें', en: 'Search' },
  filterByYear: { mr: 'वर्षानुसार गाळा', hi: 'वर्ष अनुसार छांटें', en: 'Filter by Year' },
  filterByStatus: { mr: 'स्थितीनुसार गाळा', hi: 'स्थिति अनुसार छांटें', en: 'Filter by Status' },
  listEmpty: { mr: 'अद्याप कोणतीही नोंद नाही', hi: 'अभी कोई प्रविष्टि नहीं', en: 'No entries yet' },
  required: { mr: 'आवश्यक', hi: 'आवश्यक', en: 'Required' },
  correctionWorkflow: { mr: 'अंतिम नोंदीमध्ये बदल नियंत्रित दुरुस्ती प्रक्रियेद्वारेच शक्य आहे.', hi: 'अंतिम प्रविष्टि में परिवर्तन नियंत्रित संशोधन प्रक्रिया से ही संभव है।', en: 'Finalized entries can only be altered through the controlled correction workflow.' },
  duplicateWarning: { mr: 'संभाव्य दुप्पट निवासी / प्रवेश नोंद आढळली.', hi: 'संभावित डुप्लिकेट निवासी / प्रवेश रिकॉर्ड मिला।', en: 'Possible duplicate resident/admission record found.' },
  viewAadhaar: { mr: 'आधार पहा', hi: 'आधार देखें', en: 'View Aadhaar' },
  aadhaarMasked: { mr: 'आधार संख्या संरक्षित आहे; केवळ अधिकृत व्यक्ती पूर्ण संख्या पाहू शकतात.', hi: 'आधार संख्या सुरक्षित है; केवल अधिकृत व्यक्ति ही पूर्ण संख्या देख सकते हैं।', en: 'Aadhaar is protected; only authorized users may view the full number.' },
  residents: { mr: 'निवासी', hi: 'निवासी', en: 'Residents' },
  createdAt: { mr: 'नोंदणी वेळ', hi: 'निर्माण तिथि', en: 'Created Date' },
  submittedAt: { mr: 'सादर वेळ', hi: 'प्रस्तुत समय', en: 'Submitted At' },
  finalizedAt: { mr: 'अंतिम वेळ', hi: 'अंतिम समय', en: 'Finalized At' },
} as const satisfies Record<YwaLabelKey, Trilingual>;

export const YWA_LABELS: Record<YwaLabelKey, Trilingual> = L;

export function ywaLabel(key: YwaLabelKey): Trilingual {
  return L[key];
}