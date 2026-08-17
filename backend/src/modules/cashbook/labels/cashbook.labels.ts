export interface Trilingual {
  mr: string;
  hi: string;
  en: string;
}

export type CashbookLabelKey =
  | 'registerTitle'
  | 'registerTitleLine2'
  | 'institutionName'
  | 'forYear'
  | 'sourceFlag'
  | 'srNo'
  | 'monthDate'
  | 'vrNo'
  | 'particulars'
  | 'lfNo'
  | 'cash'
  | 'bank'
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
  registerTitle: { mr: 'रोख रजिस्टर / CASH BOOK', hi: 'रोख रजिस्टर / CASH BOOK', en: 'CASH BOOK / रोख रजिस्टर' },
  registerTitleLine2: { mr: 'जमा / RECEIPT', hi: 'जमा / RECEIPT', en: 'RECEIPT / जमा' },
  institutionName: { mr: 'संस्थेचे नाव', hi: 'संस्था का नाम', en: 'Institution Name:' },
  forYear: { mr: 'वर्ष', hi: 'वर्ष', en: 'Year:' },
  sourceFlag: {
    mr: 'रक्कम पूर्णांक रुपये/पैसे म्हणून ठेवली जाते (कोणतीही दशांश गणना नाही). स्तंभांचे अर्थ स्रोत रजिस्टरप्रमाणेच ठेवले आहेत.',
    hi: 'रक्कम पूर्णांक रुपये/पैसे के रूप में रखी जाती है (कोई दशांश गणना नहीं). स्तंभों के अर्थ स्रोत रजिस्टर के अनुसार ही रखे गए हैं।',
    en: 'Monetary amounts are stored as integer rupees/paise (no floating-point arithmetic). Column meanings are kept as per the source register.',
  },
  srNo: { mr: 'अ. क्र.', hi: 'क्रमांक', en: 'Sr. No.' },
  monthDate: { mr: 'महिना / दिनांक', hi: 'महीना / दिनांक', en: 'Month / Date' },
  vrNo: { mr: 'प्रमाणक क्र.', hi: 'प्रमाणक क्र.', en: 'V.R. No.' },
  particulars: { mr: 'जमा तपशील', hi: 'जमा तपशील', en: 'Particulars' },
  lfNo: { mr: 'खाते पान क्र.', hi: 'खाता पान क्र.', en: 'L.F. No.' },
  cash: { mr: 'रोख रक्कम (रु./पै.)', hi: 'रोख रक्कम (रु./पै.)', en: 'CASH (Rs./Ps.)' },
  bank: { mr: 'बँक खाते रक्कम (रु./पै.)', hi: 'बैंक खाता रक्कम (रु./पै.)', en: 'BANK (Rs./Ps.)' },
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
  filterByPerson: { mr: 'नोंदीनुसार गाळा', hi: 'प्रविष्टि अनुसार छांटें', en: 'Filter by Entry' },
  listEmpty: { mr: 'अद्याप कोणतीही नोंद नाही', hi: 'अभी कोई प्रविष्टि नहीं', en: 'No entries yet' },
  required: { mr: 'आवश्यक', hi: 'आवश्यक', en: 'Required' },
  correctionWorkflow: { mr: 'अंतिम नोंदीमध्ये बदल नियंत्रित दुरुस्ती प्रक्रियेद्वारेच शक्य आहे.', hi: 'अंतिम प्रविष्टि में परिवर्तन नियंत्रित संशोधन प्रक्रिया से ही संभव है।', en: 'Finalized entries can only be altered through the controlled correction workflow.' },
  createdAt: { mr: 'नोंदणी वेळ', hi: 'निर्माण तिथि', en: 'Created Date' },
  submittedAt: { mr: 'सादर वेळ', hi: 'प्रस्तुत समय', en: 'Submitted At' },
  finalizedAt: { mr: 'अंतिम वेळ', hi: 'अंतिम समय', en: 'Finalized At' },
} as const satisfies Record<CashbookLabelKey, Trilingual>;

export const CASHBOOK_LABELS: Record<CashbookLabelKey, Trilingual> = L;

export function cashbookLabel(key: CashbookLabelKey): Trilingual {
  return L[key];
}