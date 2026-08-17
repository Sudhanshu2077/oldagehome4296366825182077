export interface Trilingual {
  mr: string;
  hi: string;
  en: string;
}

export type MedicalLabelKey =
  | 'registerTitle'
  | 'registerTitleLine2'
  | 'institutionName'
  | 'forYear'
  | 'sourceFlag'
  | 'srNo'
  | 'studentName'
  | 'diseaseNature'
  | 'illnessDate'
  | 'medicineParticulars'
  | 'medicineAllowances'
  | 'medicalOfficer'
  | 'remarks'
  | 'status'
  | 'statusDRAFT'
  | 'statusSUBMITTED'
  | 'statusFINALIZED'
  | 'entryNumber'
  | 'newEntry'
  | 'saveDraft'
  | 'submit'
  | 'finalize'
  | 'edit'
  | 'auditHistory'
  | 'previousValue'
  | 'newValue'
  | 'reasonForChange'
  | 'search'
  | 'filterByDate'
  | 'filterByPerson'
  | 'listEmpty'
  | 'required'
  | 'correctionWorkflow'
  | 'createdAt'
  | 'submittedAt'
  | 'finalizedAt';

const L = {
  registerTitle: { mr: 'वैद्यकीय तपासणी रजिस्टर', hi: 'चिकित्सा परीक्षण रजिस्टर', en: 'MEDICAL / वैद्यकीय REGISTER' },
  registerTitleLine2: { mr: 'वैद्यकीय / तपासणी रजिस्टर', hi: 'वैद्यकीय / परीक्षण रजिस्टर', en: 'वैद्यकीय / तपासणी रजिस्टर' },
  institutionName: { mr: 'संस्थेचे नाव', hi: 'संस्था का नाम', en: 'Institution Name:' },
  forYear: { mr: 'वर्ष', hi: 'वर्ष', en: 'Year:' },
  sourceFlag: {
    mr: 'स्तंभ 6 चे नेमके शब्द स्त्रोत प्रतिमेत अस्पष्ट आहेत; स्त्रोत दस्तऐवज पडताळणीनंतर अंतिम केले जाईल.',
    hi: 'स्तंभ 6 के सटीक शब्द स्रोत छवि में अस्पष्ट हैं; स्रोत दस्तावेज़ सत्यापन के बाद अंतिम किया जाएगा।',
    en: 'Column 6 wording is unclear in the source image; it will be finalized only after source-document verification.',
  },
  srNo: { mr: 'अ. क्र.', hi: 'क्रमांक', en: 'Sr. No.' },
  studentName: { mr: 'विद्यार्थ्याचे नांव', hi: 'विद्यार्थी का नाम', en: 'Student Name' },
  diseaseNature: { mr: 'आजाराचे स्वरूप', hi: 'बीमारी का स्वरूप', en: 'Whose are Disease / Nature of Disease' },
  illnessDate: { mr: 'आजारी पडल्याची तारीख', hi: 'बीमार पड़ने की तारीख', en: 'Disease of Date' },
  medicineParticulars: { mr: 'दिलेल्या औषधोपचाराचा तपशील', hi: 'दी गई औषधि/उपचार का विवरण', en: 'Medicine Particular' },
  medicineAllowances: { mr: 'औषध उपचारात सुरूवात', hi: 'औषधि उपचार प्रारंभ / संबंधित स्रोत-लेबलानुसार', en: 'Medicine Allowances' },
  medicalOfficer: { mr: 'औषध उपचाराचे वैद्यकीय अधिकारी यांचे नाव व स्वाक्षरी', hi: 'चिकित्सा अधिकारी का नाम एवं हस्ताक्षर', en: 'Medical Officer Name & Sign.' },
  remarks: { mr: 'शेरा', hi: 'टिप्पणी', en: 'Remarks' },
  status: { mr: 'स्थिती', hi: 'स्थिति', en: 'Status' },
  statusDRAFT: { mr: 'मसुदा', hi: 'ड्राफ्ट', en: 'Draft' },
  statusSUBMITTED: { mr: 'सादर केला', hi: 'प्रस्तुत', en: 'Submitted' },
  statusFINALIZED: { mr: 'अंतिम', hi: 'अंतिम', en: 'Finalized' },
  entryNumber: { mr: 'नोंद क्र.', hi: 'प्रविष्टि क्र.', en: 'Entry No.' },
  newEntry: { mr: 'नवीन नोंद', hi: 'नई प्रविष्टि', en: 'New Entry' },
  saveDraft: { mr: 'मसुदा जतन करा', hi: 'ड्राफ्ट सहेजें', en: 'Save Draft' },
  submit: { mr: 'सादर करा', hi: 'प्रस्तुत करें', en: 'Submit' },
  finalize: { mr: 'अंतिम करा', hi: 'अंतिम करें', en: 'Finalize' },
  edit: { mr: 'संपादन', hi: 'संपादित', en: 'Edit' },
  auditHistory: { mr: 'ऑडिट इतिहास', hi: 'ऑडिट इतिहास', en: 'Audit History' },
  previousValue: { mr: 'जुने मूल्य', hi: 'पिछला मान', en: 'Previous Value' },
  newValue: { mr: 'नवीन मूल्य', hi: 'नया मान', en: 'New Value' },
  reasonForChange: { mr: 'बदलाचे कारण', hi: 'परिवर्तन का कारण', en: 'Reason for Change' },
  search: { mr: 'शोधा', hi: 'खोजें', en: 'Search' },
  filterByDate: { mr: 'दिनांकानुसार गाळा', hi: 'दिनांक अनुसार छांटें', en: 'Filter by Date' },
  filterByPerson: { mr: 'विद्यार्थ्यानुसार गाळा', hi: 'विद्यार्थी अनुसार छांटें', en: 'Filter by Person' },
  listEmpty: { mr: 'अद्याप कोणतीही नोंद नाही', hi: 'अभी कोई प्रविष्टि नहीं', en: 'No entries yet' },
  required: { mr: 'आवश्यक', hi: 'आवश्यक', en: 'Required' },
  correctionWorkflow: { mr: 'अंतिम नोंदीमध्ये बदल नियंत्रित दुरुस्ती प्रक्रियेद्वारेच शक्य आहे.', hi: 'अंतिम प्रविष्टि में परिवर्तन नियंत्रित संशोधन प्रक्रिया से ही संभव है।', en: 'Finalized entries can only be altered through the controlled correction workflow.' },
  createdAt: { mr: 'नोंदणी वेळ', hi: 'निर्माण तिथि', en: 'Created Date' },
  submittedAt: { mr: 'सादर वेळ', hi: 'प्रस्तुत समय', en: 'Submitted At' },
  finalizedAt: { mr: 'अंतिम वेळ', hi: 'अंतिम समय', en: 'Finalized At' },
} as const satisfies Record<MedicalLabelKey, Trilingual>;

export const MEDICAL_LABELS: Record<MedicalLabelKey, Trilingual> = L;

export function medicalLabel(key: MedicalLabelKey): Trilingual {
  return L[key];
}
