export interface Trilingual {
  mr: string;
  hi: string;
  en: string;
}

export type InOutLabelKey =
  | 'registerTitle'
  | 'registerTitleMr'
  | 'name'
  | 'forYear'
  | 'srNo'
  | 'date'
  | 'employeeName'
  | 'outTime'
  | 'place'
  | 'reason'
  | 'outSignature'
  | 'returnDate'
  | 'returnTime'
  | 'inSignature'
  | 'remarks'
  | 'status'
  | 'statusDRAFT'
  | 'statusOUT'
  | 'statusRETURNED'
  | 'activeOut'
  | 'newEntry'
  | 'saveDraft'
  | 'submitOut'
  | 'recordReturn'
  | 'finalize'
  | 'edit'
  | 'auditHistory'
  | 'createdBy'
  | 'outSubmittedBy'
  | 'outSubmittedAt'
  | 'returnSubmittedBy'
  | 'returnSubmittedAt'
  | 'search'
  | 'filterByEmployee'
  | 'filterByDate'
  | 'dailyView'
  | 'monthlyView'
  | 'employeeWise'
  | 'currentlyOut'
  | 'returned'
  | 'lateReturns'
  | 'print'
  | 'pdfExport'
  | 'excelExport'
  | 'listEmpty'
  | 'required'
  | 'noActiveOut'
  | 'selectEmployee'
  | 'correctionWorkflow';

const L = {
  registerTitle: { mr: 'कर्मचारी हालचाल बुक', hi: 'कर्मचारी हालचाल बुक', en: 'EMPLOYEE IN OUT REGISTER' },
  registerTitleMr: { mr: 'कर्मचारी', hi: 'कर्मचारी', en: 'EMPLOYEE' },
  name: { mr: 'नांव:', hi: 'नाम:', en: 'Name:' },
  forYear: { mr: 'वर्ष', hi: 'वर्ष', en: 'FOR THE YEAR' },
  srNo: { mr: 'क्र. नं.', hi: 'क्रमांक', en: 'Sr. No.' },
  date: { mr: 'दिनांक', hi: 'दिनांक', en: 'Date' },
  employeeName: { mr: 'कर्मचाऱ्याचे नाव', hi: 'कर्मचारी का नाम', en: 'Name of Employee' },
  outTime: { mr: 'जाण्याची वेळ', hi: 'बाहर जाने का समय', en: 'Out Time' },
  place: { mr: 'जाण्याचे ठिकाण', hi: 'जाने का स्थान', en: 'Place to Visit' },
  reason: { mr: 'जाण्याचे कारण', hi: 'जाने का कारण', en: 'Reason' },
  outSignature: { mr: 'कर्मचाऱ्याची सही (जातेवेळी)', hi: 'कर्मचारी के हस्ताक्षर (जाते समय)', en: "Employee's Sign. (Out)" },
  returnDate: { mr: 'परत येते वेळेस दिनांक', hi: 'लौटने की तारीख', en: 'Return Date' },
  returnTime: { mr: 'वेळ', hi: 'आने का समय', en: 'Time (In)' },
  inSignature: { mr: 'सही', hi: 'हस्ताक्षर (आते समय)', en: 'Sign. (In)' },
  remarks: { mr: 'शेरा', hi: 'टिप्पणी', en: 'Remarks' },
  status: { mr: 'स्थिती', hi: 'स्थिति', en: 'Status' },
  statusDRAFT: { mr: 'मसुदा', hi: 'ड्राफ्ट', en: 'Draft' },
  statusOUT: { mr: 'बाहेर', hi: 'बाहर', en: 'OUT' },
  statusRETURNED: { mr: 'परत आला', hi: 'वापस आया', en: 'RETURNED' },
  activeOut: { mr: 'सध्या बाहेर', hi: 'वर्तमान में बाहर', en: 'ACTIVE OUT' },
  newEntry: { mr: 'नवीन नोंद', hi: 'नई प्रविष्टि', en: 'New Entry' },
  saveDraft: { mr: 'मसुदा जतन करा', hi: 'ड्राफ्ट सहेजें', en: 'Save Draft' },
  submitOut: { mr: 'बाहेर जाण्याची नोंद सादर करा', hi: 'बाहर जाने की प्रविष्टि प्रस्तुत करें', en: 'Submit Out Entry' },
  recordReturn: { mr: 'परतीची नोंद करा', hi: 'वापसी दर्ज करें', en: 'Record Return' },
  finalize: { mr: 'अंतिम करा', hi: 'अंतिम करें', en: 'Finalize' },
  edit: { mr: 'संपादन', hi: 'संपादित', en: 'Edit' },
  auditHistory: { mr: 'ऑडिट इतिहास', hi: 'ऑडिट इतिहास', en: 'Audit History' },
  createdBy: { mr: 'नोंदणी करणारे', hi: 'निर्माणकर्ता', en: 'Created By' },
  outSubmittedBy: { mr: 'बाहेर नोंदणी करणारे', hi: 'बाहर प्रस्तुतकर्ता', en: 'Out Submitted By' },
  outSubmittedAt: { mr: 'बाहेर नोंद वेळ', hi: 'बाहर प्रस्तुत समय', en: 'Out Submitted At' },
  returnSubmittedBy: { mr: 'परती नोंदणी करणारे', hi: 'वापसी प्रस्तुतकर्ता', en: 'Return Submitted By' },
  returnSubmittedAt: { mr: 'परती नोंद वेळ', hi: 'वापसी प्रस्तुत समय', en: 'Return Submitted At' },
  search: { mr: 'शोधा', hi: 'खोजें', en: 'Search' },
  filterByEmployee: { mr: 'कर्मचारीनुसार गाळा', hi: 'कर्मचारी अनुसार छांटें', en: 'Filter by Employee' },
  filterByDate: { mr: 'दिनांकानुसार गाळा', hi: 'दिनांक अनुसार छांटें', en: 'Filter by Date' },
  dailyView: { mr: 'दैनिक दृश्य', hi: 'दैनिक दृश्य', en: 'Daily View' },
  monthlyView: { mr: 'मासिक दृश्य', hi: 'मासिक दृश्य', en: 'Monthly View' },
  employeeWise: { mr: 'कर्मचारीनिहाय इतिहास', hi: 'कर्मचारी अनुसार इतिहास', en: 'Employee-wise' },
  currentlyOut: { mr: 'सध्या बाहेर असलेले', hi: 'वर्तमान में बाहर', en: 'Currently Out' },
  returned: { mr: 'परत आलेले', hi: 'वापस आए', en: 'Returned' },
  lateReturns: { mr: 'उशीरा परतलेले', hi: 'देर से लौटे', en: 'Late Returns' },
  print: { mr: 'प्रिंट', hi: 'प्रिंट', en: 'Print' },
  pdfExport: { mr: 'PDF निर्यात', hi: 'PDF निर्यात', en: 'PDF Export' },
  excelExport: { mr: 'Excel निर्यात', hi: 'Excel निर्यात', en: 'Excel Export' },
  listEmpty: { mr: 'अद्याप कोणतीही नोंद नाही', hi: 'अभी कोई प्रविष्टि नहीं', en: 'No entries yet' },
  required: { mr: 'आवश्यक', hi: 'आवश्यक', en: 'Required' },
  noActiveOut: { mr: 'सध्या कोणीही बाहेर नाही', hi: 'कोई भी बाहर नहीं है', en: 'No employee currently out' },
  selectEmployee: { mr: 'कर्मचारी निवडा', hi: 'कर्मचारी चुनें', en: 'Select Employee' },
  correctionWorkflow: { mr: 'अंतिम नोंदीमध्ये बदल नियंत्रित दुरुस्ती प्रक्रियेद्वारेच शक्य आहे.', hi: 'अंतिम प्रविष्टि में परिवर्तन नियंत्रित संशोधन प्रक्रिया से ही संभव है।', en: 'Finalized entries can only be altered through the controlled correction workflow.' },
} as const satisfies Record<InOutLabelKey, Trilingual>;

export const INOUT_LABELS: Record<InOutLabelKey, Trilingual> = L;

export function inoutLabel(key: InOutLabelKey): Trilingual {
  return L[key];
}