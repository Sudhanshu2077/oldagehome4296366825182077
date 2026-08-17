export interface Trilingual {
  mr: string;
  hi: string;
  en: string;
}

export type DistributionLabelKey =
  | 'registerTitle'
  | 'institutionName'
  | 'forYear'
  | 'sourceFlag'
  | 'date'
  | 'personName'
  | 'className'
  | 'clothesWashingPowder'
  | 'clothesWashingSoap'
  | 'bathingSoap'
  | 'toothPowder'
  | 'paste'
  | 'brush'
  | 'sourceColumn10'
  | 'sourceColumn11'
  | 'distributionDate'
  | 'superintendentSignature'
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
  | 'review'
  | 'edit'
  | 'auditHistory'
  | 'createdBy'
  | 'createdAt'
  | 'submittedBy'
  | 'submittedAt'
  | 'finalizedBy'
  | 'finalizedAt'
  | 'previousValue'
  | 'newValue'
  | 'reasonForChange'
  | 'search'
  | 'filterByDate'
  | 'filterByPerson'
  | 'dailyView'
  | 'monthlyView'
  | 'personWise'
  | 'itemWise'
  | 'print'
  | 'pdfExport'
  | 'excelExport'
  | 'listEmpty'
  | 'required'
  | 'correctionWorkflow'
  | 'stockReduced'
  | 'insufficientStock'
  | 'overrideRequired';

const L = {
  registerTitle: { mr: 'साबण, निरमा वस्तू वाटप रजिस्टर', hi: 'साबुन, निरमा वस्तु वितरण रजिस्टर', en: 'SOAP, CLEANING GOODS / DISTRIBUTION REGISTER' },
  institutionName: { mr: 'संस्थेचे नाव', hi: 'संस्था का नाम', en: 'Institution Name:' },
  forYear: { mr: 'वर्ष', hi: 'वर्ष', en: 'Year:' },
  sourceFlag: {
    mr: 'स्रोत फोटोमधील स्तंभ 10 व 11 अस्पष्ट आहेत; ही फील्डे स्त्रोत दस्तऐवज पडताळणीनंतरच अंतिम केली जातील.',
    hi: 'स्रोत फोटो के स्तंभ 10 व 11 अस्पष्ट हैं; ये फील्ड स्रोत दस्तावेज़ सत्यापन के बाद ही अंतिम होंगी।',
    en: 'Source-image columns 10 & 11 are unclear; these fields are flagged for source-document verification and will be finalized only after confirmation.',
  },
  date: { mr: 'दिनांक', hi: 'दिनांक', en: 'Date' },
  personName: { mr: 'विद्यार्थ्याचे नाव', hi: 'विद्यार्थी का नाम', en: 'Student Name' },
  className: { mr: 'वर्ग', hi: 'कक्षा', en: 'Class' },
  clothesWashingPowder: { mr: 'कपड्याची पावडर', hi: 'कपड़े धोने का पाउडर', en: 'Clothes Washing Powder' },
  clothesWashingSoap: { mr: 'कपड्याचा साबण', hi: 'कपड़े धोने का साबुन', en: 'Clothes Washing Soap' },
  bathingSoap: { mr: 'अंघोळीचा साबण', hi: 'नहाने का साबुन', en: 'Bathing Soap' },
  toothPowder: { mr: 'दंत मंजन', hi: 'दंत मंजन', en: 'Tooth Powder' },
  paste: { mr: 'पेस्ट', hi: 'टूथपेस्ट', en: 'Toothpaste' },
  brush: { mr: 'ब्रश', hi: 'टूथब्रश', en: 'Toothbrush' },
  sourceColumn10: { mr: 'स्तंभ 10 (अस्पष्ट)', hi: 'स्तंभ 10 (अस्पष्ट)', en: 'Source Column 10' },
  sourceColumn11: { mr: 'स्तंभ 11 (अस्पष्ट)', hi: 'स्तंभ 11 (अस्पष्ट)', en: 'Source Column 11' },
  distributionDate: { mr: 'वाटप दिनांक', hi: 'वितरण दिनांक', en: 'Distribution Date' },
  superintendentSignature: { mr: 'अधीक्षक सही', hi: 'अधीक्षक के हस्ताक्षर', en: "Superintendent's Signature" },
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
  review: { mr: 'पुनरावलोकन', hi: 'समीक्षा', en: 'Review' },
  edit: { mr: 'संपादन', hi: 'संपादित', en: 'Edit' },
  auditHistory: { mr: 'ऑडिट इतिहास', hi: 'ऑडिट इतिहास', en: 'Audit History' },
  createdBy: { mr: 'नोंदणी करणारे', hi: 'निर्माणकर्ता', en: 'Created By' },
  createdAt: { mr: 'नोंदणी वेळ', hi: 'निर्माण तिथि', en: 'Created Date' },
  submittedBy: { mr: 'सादर करणारे', hi: 'प्रस्तुतकर्ता', en: 'Submitted By' },
  submittedAt: { mr: 'सादर वेळ', hi: 'प्रस्तुत समय', en: 'Submitted At' },
  finalizedBy: { mr: 'अंतिम करणारे', hi: 'अंतिमकर्ता', en: 'Finalized By' },
  finalizedAt: { mr: 'अंतिम वेळ', hi: 'अंतिम समय', en: 'Finalized At' },
  previousValue: { mr: 'जुने मूल्य', hi: 'पिछला मान', en: 'Previous Value' },
  newValue: { mr: 'नवीन मूल्य', hi: 'नया मान', en: 'New Value' },
  reasonForChange: { mr: 'बदलाचे कारण', hi: 'परिवर्तन का कारण', en: 'Reason for Change' },
  search: { mr: 'शोधा', hi: 'खोजें', en: 'Search' },
  filterByDate: { mr: 'दिनांकानुसार गाळा', hi: 'दिनांक अनुसार छांटें', en: 'Filter by Date' },
  filterByPerson: { mr: 'विद्यार्थ्यानुसार गाळा', hi: 'विद्यार्थी अनुसार छांटें', en: 'Filter by Person' },
  dailyView: { mr: 'दैनिक वाटप', hi: 'दैनिक वितरण', en: 'Daily Distribution' },
  monthlyView: { mr: 'मासिक अहवाल', hi: 'मासिक रिपोर्ट', en: 'Monthly Report' },
  personWise: { mr: 'विद्यार्थीनिहाय', hi: 'विद्यार्थी अनुसार', en: 'Person-wise' },
  itemWise: { mr: 'वस्तुनिहाय', hi: 'वस्तु अनुसार', en: 'Item-wise' },
  print: { mr: 'प्रिंट', hi: 'प्रिंट', en: 'Print' },
  pdfExport: { mr: 'PDF निर्यात', hi: 'PDF निर्यात', en: 'PDF Export' },
  excelExport: { mr: 'Excel निर्यात', hi: 'Excel निर्यात', en: 'Excel Export' },
  listEmpty: { mr: 'अद्याप कोणतीही नोंद नाही', hi: 'अभी कोई प्रविष्टि नहीं', en: 'No entries yet' },
  required: { mr: 'आवश्यक', hi: 'आवश्यक', en: 'Required' },
  correctionWorkflow: { mr: 'अंतिम नोंदीमध्ये बदल नियंत्रित दुरुस्ती प्रक्रियेद्वारेच शक्य आहे.', hi: 'अंतिम प्रविष्टि में परिवर्तन नियंत्रित संशोधन प्रक्रिया से ही संभव है।', en: 'Finalized entries can only be altered through the controlled correction workflow.' },
  stockReduced: { mr: 'साठ्यातून कपात केली', hi: 'स्टॉक से घटाया गया', en: 'Stock Reduced' },
  insufficientStock: { mr: 'अपुरा साठा', hi: 'अपर्याप्त स्टॉक', en: 'Insufficient Stock' },
  overrideRequired: { mr: 'ओव्हरराईड आवश्यक', hi: 'ओव्हरराइड आवश्यक', en: 'Override Required' },
} as const satisfies Record<DistributionLabelKey, Trilingual>;

export const DISTRIBUTION_LABELS: Record<DistributionLabelKey, Trilingual> = L;

export function distributionLabel(key: DistributionLabelKey): Trilingual {
  return L[key];
}