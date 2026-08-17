export interface Trilingual {
  mr: string;
  hi: string;
  en: string;
}

export type InwardLabelKey =
  | 'registerTitle'
  | 'officeOfThe'
  | 'forTheYear'
  | 'date'
  | 'month'
  | 'srNoFileNo'
  | 'fromWhomReceived'
  | 'letterNo'
  | 'subject'
  | 'toWhomIssued'
  | 'status'
  | 'statusDRAFT'
  | 'statusSUBMITTED'
  | 'statusFINALIZED'
  | 'entryNumber'
  | 'srNo'
  | 'fileNo'
  | 'sender'
  | 'receivedDate'
  | 'issuedTo'
  | 'newEntry'
  | 'saveDraft'
  | 'submit'
  | 'finalize'
  | 'review'
  | 'edit'
  | 'auditHistory'
  | 'createdBy'
  | 'createdDate'
  | 'attachments'
  | 'attachDocument'
  | 'verificationStatus'
  | 'uploadedAt'
  | 'uploadedBy'
  | 'previousValue'
  | 'newValue'
  | 'reasonForChange'
  | 'search'
  | 'filterByYear'
  | 'filterByMonth'
  | 'print'
  | 'pdfExport'
  | 'excelExport'
  | 'listEmpty'
  | 'required'
  | 'correctionWorkflow'
  | 'sourceTermFlag';

const L = {
  registerTitle: { mr: 'आवक रजिस्टर', hi: 'आवक रजिस्टर', en: 'INWARD REGISTER' },
  officeOfThe: { mr: 'कार्यालयाचे नाव', hi: 'कार्यालयाचे नाव', en: 'OFFICE OF THE' },
  forTheYear: { mr: 'इ. सन. / वर्ष', hi: 'इ. सन. / वर्ष', en: 'FOR THE YEAR' },
  date: { mr: 'दिनांक', hi: 'दिनांक', en: 'DATE' },
  month: { mr: 'माहे', hi: 'माह', en: 'MONTH' },
  srNoFileNo: { mr: 'अ.क्र. / फाईल नंबर', hi: 'क्रमांक / फाइल नंबर', en: 'Sr. No. & File No.' },
  fromWhomReceived: { mr: 'कोणाकडून वसूल होते', hi: 'किससे प्राप्त हुआ', en: 'From whom Received' },
  letterNo: { mr: 'पत्राचा क्रमांक', hi: 'पत्र क्रमांक', en: 'Letter No.' },
  subject: { mr: 'विषय', hi: 'विषय', en: 'Subject' },
  toWhomIssued: { mr: 'कोणास दिले', hi: 'किसे दिया गया', en: 'To whom issued' },
  status: { mr: 'स्थिती', hi: 'स्थिति', en: 'Status' },
  statusDRAFT: { mr: 'मसुदा', hi: 'ड्राफ्ट', en: 'Draft' },
  statusSUBMITTED: { mr: 'सादर केला', hi: 'प्रस्तुत', en: 'Submitted' },
  statusFINALIZED: { mr: 'अंतिम', hi: 'अंतिम', en: 'Finalized' },
  entryNumber: { mr: 'नोंद क्र.', hi: 'प्रविष्टि क्र.', en: 'Entry No.' },
  srNo: { mr: 'अ.क्र.', hi: 'क्रमांक', en: 'Sr. No.' },
  fileNo: { mr: 'फाईल नंबर', hi: 'फाइल नंबर', en: 'File No.' },
  sender: { mr: 'कोणाकडून वसूल होते', hi: 'किससे प्राप्त हुआ', en: 'From whom Received' },
  receivedDate: { mr: 'दिनांक', hi: 'दिनांक', en: 'Date' },
  issuedTo: { mr: 'कोणास दिले', hi: 'किसे दिया गया', en: 'To whom issued' },
  newEntry: { mr: 'नवीन नोंद', hi: 'नई प्रविष्टि', en: 'New Entry' },
  saveDraft: { mr: 'मसुदा जतन करा', hi: 'ड्राफ्ट सहेजें', en: 'Save Draft' },
  submit: { mr: 'सादर करा', hi: 'प्रस्तुत करें', en: 'Submit' },
  finalize: { mr: 'अंतिम करा', hi: 'अंतिम करें', en: 'Finalize' },
  review: { mr: 'पुनरावलोकन', hi: 'समीक्षा', en: 'Review' },
  edit: { mr: 'संपादन', hi: 'संपादित', en: 'Edit' },
  auditHistory: { mr: 'ऑडिट इतिहास', hi: 'ऑडिट इतिहास', en: 'Audit History' },
  createdBy: { mr: 'नोंदणी करणारे', hi: 'निर्माणकर्ता', en: 'Created By' },
  createdDate: { mr: 'नोंदणी वेळ', hi: 'निर्माण तिथि', en: 'Created Date' },
  attachments: { mr: 'दस्तऐवज संलग्न', hi: 'दस्तावेज़ संलग्न', en: 'Document Attachments' },
  attachDocument: { mr: 'दस्तऐवज जोडा', hi: 'दस्तावेज़ संलग्न करें', en: 'Attach Document' },
  verificationStatus: { mr: 'पडताळणी स्थिती', hi: 'सत्यापन स्थिति', en: 'Verification Status' },
  uploadedAt: { mr: 'अपलोड वेळ', hi: 'अपलोड समय', en: 'Uploaded At' },
  uploadedBy: { mr: 'अपलोड करणारे', hi: 'अपलोडकर्ता', en: 'Uploaded By' },
  previousValue: { mr: 'जुने मूल्य', hi: 'पिछला मान', en: 'Previous Value' },
  newValue: { mr: 'नवीन मूल्य', hi: 'नया मान', en: 'New Value' },
  reasonForChange: { mr: 'बदलाचे कारण', hi: 'परिवर्तन का कारण', en: 'Reason for Change' },
  search: { mr: 'शोधा', hi: 'खोजें', en: 'Search' },
  filterByYear: { mr: 'वर्षानुसार गाळा', hi: 'वर्ष अनुसार छांटें', en: 'Filter by Year' },
  filterByMonth: { mr: 'माहानुसार गाळा', hi: 'माह अनुसार छांटें', en: 'Filter by Month' },
  print: { mr: 'प्रिंट', hi: 'प्रिंट', en: 'Print' },
  pdfExport: { mr: 'PDF निर्यात', hi: 'PDF निर्यात', en: 'PDF Export' },
  excelExport: { mr: 'Excel निर्यात', hi: 'Excel निर्यात', en: 'Excel Export' },
  listEmpty: { mr: 'अद्याप कोणतीही नोंद नाही', hi: 'अभी कोई प्रविष्टि नहीं', en: 'No entries yet' },
  required: { mr: 'आवश्यक', hi: 'आवश्यक', en: 'Required' },
  correctionWorkflow: { mr: 'अंतिम नोंदीमध्ये बदल नियंत्रित दुरुस्ती प्रक्रियेद्वारेच शक्य आहे.', hi: 'अंतिम प्रविष्टि में परिवर्तन नियंत्रित संशोधन प्रक्रिया से ही संभव है।', en: 'Finalized entries can only be altered through the controlled correction workflow.' },
  sourceTermFlag: {
    mr: 'स्रोत दस्तऐवज पडताळणीसाठी चिन्हांकित केलेल्या संज्ञा. मूळ मजकूर प्रमाणित होईपर्यंत अनुवाद वापरला जातो.',
    hi: 'स्रोत दस्तावेज़ सत्यापन के लिए चिह्नित शब्द. मूल पाठ सत्यापित होने तक अनुवाद उपयोग में लाया जाता है.',
    en: 'Terms flagged for source-document verification. Translation used until the original text is confirmed.',
  },
} as const satisfies Record<InwardLabelKey, Trilingual>;

export const INWARD_LABELS: Record<InwardLabelKey, Trilingual> = L;

export function inwardLabel(key: InwardLabelKey): Trilingual {
  return L[key];
}
