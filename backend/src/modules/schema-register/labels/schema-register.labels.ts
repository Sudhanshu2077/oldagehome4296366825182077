export interface Trilingual {
  mr: string;
  hi: string;
  en: string;
}

export type SchemaRegisterLabelKey =
  | 'schemaPending'
  | 'configureSchema'
  | 'configured'
  | 'sourceField'
  | 'sourceVerificationRequired'
  | 'date'
  | 'month'
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
  | 'listEmpty'
  | 'required'
  | 'correctionWorkflow'
  | 'noEntries';

const L = {
  schemaPending: { mr: 'रजिस्टर स्तंभ अद्याप पुष्टीकरण बाकी आहेत', hi: 'रजिस्टर कॉलम अभी पुष्टि के जाने बाकी हैं', en: 'Register columns are not yet confirmed from the physical register' },
  configureSchema: { mr: 'स्तंभ संरचना कॉन्फिगर करा', hi: 'कॉलम संरचना कॉन्फ़िगर करें', en: 'Configure Column Schema' },
  configured: { mr: 'कॉन्फिगर केले', hi: 'कॉन्फ़िगर किया गया', en: 'Configured' },
  sourceField: { mr: 'स्रोत स्तंभ', hi: 'स्रोत स्तंभ', en: 'Source Field' },
  sourceVerificationRequired: { mr: 'स्रोत पडताळणी आवश्यक', hi: 'स्रोत सत्यापन आवश्यक', en: 'SOURCE VERIFICATION REQUIRED' },
  date: { mr: 'दिनांक', hi: 'दिनांक', en: 'Date' },
  month: { mr: 'महिना', hi: 'महीना', en: 'Month' },
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
  listEmpty: { mr: 'अद्याप कोणतीही नोंद नाही', hi: 'अभी कोई प्रविष्टि नहीं', en: 'No entries yet' },
  required: { mr: 'आवश्यक', hi: 'आवश्यक', en: 'Required' },
  correctionWorkflow: { mr: 'अंतिम नोंदीमध्ये बदल नियंत्रित दुरुस्ती प्रक्रियेद्वारेच शक्य आहे.', hi: 'अंतिम प्रविष्टि में परिवर्तन नियंत्रित संशोधन प्रक्रिया से ही संभव है।', en: 'Finalized entries can only be altered through the controlled correction workflow.' },
  noEntries: { mr: 'नोंदी उपलब्ध नाहीत', hi: 'प्रविष्टियां उपलब्ध नहीं', en: 'No entries available' },
} as const satisfies Record<SchemaRegisterLabelKey, Trilingual>;

export const SCHEMA_REGISTER_LABELS: Record<SchemaRegisterLabelKey, Trilingual> = L;

export function schemaRegisterLabel(key: SchemaRegisterLabelKey): Trilingual {
  return L[key];
}
