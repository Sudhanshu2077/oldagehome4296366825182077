export interface Trilingual {
  mr: string;
  hi: string;
  en: string;
}

export type VisitBookLabelKey =
  | 'registerTitle'
  | 'office'
  | 'taluka'
  | 'district'
  | 'srNo'
  | 'date'
  | 'officerNamePost'
  | 'officerName'
  | 'officerPost'
  | 'remark'
  | 'status'
  | 'statusDRAFT'
  | 'statusSUBMITTED'
  | 'statusFINALIZED'
  | 'entryNumber'
  | 'newEntry'
  | 'saveDraft'
  | 'submit'
  | 'finalize'
  | 'review'
  | 'edit'
  | 'auditHistory'
  | 'createdBy'
  | 'createdAt'
  | 'modifiedBy'
  | 'modifiedAt'
  | 'submittedBy'
  | 'submittedAt'
  | 'finalizedBy'
  | 'finalizedAt'
  | 'previousValue'
  | 'newValue'
  | 'reasonForChange'
  | 'search'
  | 'filterByDate'
  | 'filterByOfficer'
  | 'print'
  | 'pdfExport'
  | 'excelExport'
  | 'listEmpty'
  | 'required'
  | 'printTitle'
  | 'visitBookHeading'
  | 'correctionWorkflow';

const L = {
  registerTitle: { mr: 'अभिप्राय बुक', hi: 'भेंट / अभिप्राय पुस्तिका', en: 'VISIT BOOK' },
  office: { mr: 'कार्यालयाचे नाव', hi: 'कार्यालय का नाम', en: 'Office' },
  taluka: { mr: 'ता.', hi: 'तहसील', en: 'Tq.' },
  district: { mr: 'जि.', hi: 'जिला', en: 'Dist.' },
  srNo: { mr: 'अ.क्र.', hi: 'क्रमांक', en: 'Sr. No.' },
  date: { mr: 'दिनांक', hi: 'दिनांक', en: 'Date' },
  officerNamePost: { mr: 'भेट देणाऱ्या अधिकाऱ्याचे नाव व हुद्दा', hi: 'भेंट देने वाले अधिकारी का नाम एवं पद', en: 'Visit Officer Name & Post' },
  officerName: { mr: 'अधिकाऱ्याचे नाव', hi: 'अधिकारी का नाम', en: 'Officer Name' },
  officerPost: { mr: 'हुद्दा', hi: 'पद', en: 'Officer Post' },
  remark: { mr: 'शेरा', hi: 'टिप्पणी', en: 'Remark' },
  status: { mr: 'स्थिती', hi: 'स्थिति', en: 'Status' },
  statusDRAFT: { mr: 'मसुदा', hi: 'ड्राफ्ट', en: 'Draft' },
  statusSUBMITTED: { mr: 'सादर केला', hi: 'प्रस्तुत', en: 'Submitted' },
  statusFINALIZED: { mr: 'अंतिम', hi: 'अंतिम', en: 'Finalized' },
  entryNumber: { mr: 'नोंद क्र.', hi: 'प्रविष्टि क्र.', en: 'Entry No.' },
  newEntry: { mr: 'नवीन नोंद', hi: 'नई प्रविष्टि', en: 'New Entry' },
  saveDraft: { mr: 'मसुदा जतन करा', hi: 'ड्राफ्ट सहेजें', en: 'Save Draft' },
  submit: { mr: 'सादर करा', hi: 'प्रस्तुत करें', en: 'Submit' },
  finalize: { mr: 'अंतिम करा', hi: 'अंतिम करें', en: 'Finalize' },
  review: { mr: 'पुनरावलोकन', hi: 'समीक्षा', en: 'Review' },
  edit: { mr: 'संपादन', hi: 'संपादित', en: 'Edit' },
  auditHistory: { mr: 'ऑडिट इतिहास', hi: 'ऑडिट इतिहास', en: 'Audit History' },
  createdBy: { mr: 'नोंदणी करणारे', hi: 'निर्माणकर्ता', en: 'Created By' },
  createdAt: { mr: 'नोंदणी वेळ', hi: 'निर्माण समय', en: 'Created At' },
  modifiedBy: { mr: 'सुधारणा करणारे', hi: 'संशोधनकर्ता', en: 'Modified By' },
  modifiedAt: { mr: 'सुधारणा वेळ', hi: 'संशोधन समय', en: 'Modified At' },
  submittedBy: { mr: 'सादर करणारे', hi: 'प्रस्तुतकर्ता', en: 'Submitted By' },
  submittedAt: { mr: 'सादर वेळ', hi: 'प्रस्तुत समय', en: 'Submitted At' },
  finalizedBy: { mr: 'अंतिम करणारे', hi: 'अंतिमकर्ता', en: 'Finalized By' },
  finalizedAt: { mr: 'अंतिम वेळ', hi: 'अंतिम समय', en: 'Finalized At' },
  previousValue: { mr: 'जुने मूल्य', hi: 'पिछला मान', en: 'Previous Value' },
  newValue: { mr: 'नवीन मूल्य', hi: 'नया मान', en: 'New Value' },
  reasonForChange: { mr: 'बदलाचे कारण', hi: 'परिवर्तन का कारण', en: 'Reason for Change' },
  search: { mr: 'शोधा', hi: 'खोजें', en: 'Search' },
  filterByDate: { mr: 'दिनांकानुसार गाळा', hi: 'दिनांक अनुसार छांटें', en: 'Filter by Date' },
  filterByOfficer: { mr: 'अधिकाऱ्यानुसार गाळा', hi: 'अधिकारी अनुसार छांटें', en: 'Filter by Officer' },
  print: { mr: 'प्रिंट', hi: 'प्रिंट', en: 'Print' },
  pdfExport: { mr: 'PDF निर्यात', hi: 'PDF निर्यात', en: 'PDF Export' },
  excelExport: { mr: 'Excel निर्यात', hi: 'Excel निर्यात', en: 'Excel Export' },
  listEmpty: { mr: 'अद्याप कोणतीही नोंद नाही', hi: 'अभी कोई प्रविष्टि नहीं', en: 'No entries yet' },
  required: { mr: 'आवश्यक', hi: 'आवश्यक', en: 'Required' },
  printTitle: { mr: 'अभिप्राय बुक', hi: 'भेंट / अभिप्राय पुस्तिका', en: 'VISIT BOOK' },
  visitBookHeading: {
    mr: 'संस्थेला भेट देणाऱ्या अधिकाऱ्यांच्या अभिप्रायांची नोंद',
    hi: 'संस्था में भेंट देने वाले अधिकारियों के अभिप्रायों की नोंद',
    en: 'Record of remarks of officers visiting the institution',
  },
  correctionWorkflow: { mr: 'अंतिम नोंदीमध्ये बदल नियंत्रित दुरुस्ती प्रक्रियेद्वारेच शक्य आहे.', hi: 'अंतिम प्रविष्टि में परिवर्तन नियंत्रित संशोधन प्रक्रिया से ही संभव है।', en: 'Finalized entries can only be altered through the controlled correction workflow.' },
} as const satisfies Record<VisitBookLabelKey, Trilingual>;

export const VISIT_BOOK_LABELS: Record<VisitBookLabelKey, Trilingual> = L;

export function visitBookLabel(key: VisitBookLabelKey): Trilingual {
  return L[key];
}
