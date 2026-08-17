export interface Trilingual {
  mr: string;
  hi: string;
  en: string;
}

export type AdmissionLabelKey =
  | 'applicationNumber'
  | 'status'
  | 'sectionPersonal'
  | 'sectionIdentity'
  | 'sectionOccupation'
  | 'sectionRelatives'
  | 'sectionFinancial'
  | 'sectionDeclarations'
  | 'sectionPhotoSignature'
  | 'sectionFinalDeclaration'
  | 'sectionCommittee'
  | 'name'
  | 'gender'
  | 'male'
  | 'female'
  | 'other'
  | 'fatherName'
  | 'spouseName'
  | 'surname'
  | 'caste'
  | 'religion'
  | 'address'
  | 'village'
  | 'taluka'
  | 'district'
  | 'admissionDate'
  | 'currentAge'
  | 'currentAgeFull'
  | 'idProofNumber'
  | 'aadhaar'
  | 'occupationStatus'
  | 'occupationGovernment'
  | 'occupationPrivate'
  | 'occupationHomemaker'
  | 'occupationUnmarried'
  | 'relativesHeading'
  | 'husband'
  | 'wife'
  | 'sonDaughter'
  | 'brother'
  | 'relativeName'
  | 'relativeAge'
  | 'relativeRelation'
  | 'relativePhone'
  | 'addRelative'
  | 'annualIncome'
  | 'freeAdmissionRequested'
  | 'paidAdmission'
  | 'monthlyFeeAcceptance'
  | 'declarationDailyActivities'
  | 'declarationDisease'
  | 'declarationRules'
  | 'declarationSubstance'
  | 'govRuleReference'
  | 'recreationalActivities'
  | 'femaleRoomAvailable'
  | 'photograph'
  | 'photoVerificationStatus'
  | 'signature'
  | 'signatureMethod'
  | 'thumbImpression'
  | 'finalDeclaration'
  | 'finalDeclarationAcknowledge'
  | 'committeeRecommendation'
  | 'recommended'
  | 'notRecommended'
  | 'admissionCategory'
  | 'free'
  | 'paid'
  | 'committeeRemarks'
  | 'decisionDate'
  | 'saveDraft'
  | 'submit'
  | 'submitApplication'
  | 'preview'
  | 'continueLater'
  | 'applicationSubmitted'
  | 'committeeDecision';

const L = {
  applicationNumber: { mr: 'अर्ज क्रमांक', hi: 'आवेदन संख्या', en: 'Application Number' },
  status: { mr: 'स्थिती', hi: 'स्थिति', en: 'Status' },
  sectionPersonal: { mr: 'अ वैयक्तिक माहिती', hi: 'क व्यक्तिगत जानकारी', en: 'A. Personal Information' },
  sectionIdentity: { mr: 'ब वय व ओळख', hi: 'ख आयु और पहचान', en: 'B. Age & Identity' },
  sectionOccupation: { mr: 'क मागील व्यवसाय / स्थिती', hi: 'ग पिछला व्यवसाय / स्थिति', en: 'C. Previous Occupation / Status' },
  sectionRelatives: { mr: 'ड जवळचे नातेवाईक', hi: 'घ निकट संबंधी', en: 'D. Close Relatives' },
  sectionFinancial: { mr: 'इ आर्थिक पात्रता', hi: 'ङ आर्थिक पात्रता', en: 'E. Financial Eligibility' },
  sectionDeclarations: { mr: 'फ अर्जदाराचे घोषणापत्र', hi: 'च आवेदक की घोषणाएँ', en: 'F. Applicant Declarations' },
  sectionPhotoSignature: { mr: 'ग फोटो व सही', hi: 'छ फोटो और हस्ताक्षर', en: 'G. Photograph & Signature' },
  sectionFinalDeclaration: { mr: 'ह अंतिम सत्य घोषणा', hi: 'ज अंतिम सत्य घोषणा', en: 'H. Final Truth Declaration' },
  sectionCommittee: { mr: 'प्रवेश समिती निर्णय', hi: 'प्रवेश समिति निर्णय', en: 'Admission Committee Decision' },
  name: { mr: 'नाव', hi: 'नाम', en: 'Name' },
  gender: { mr: 'लिंग', hi: 'लिंग', en: 'Gender' },
  male: { mr: 'पुरुष', hi: 'पुरुष', en: 'Male' },
  female: { mr: 'स्त्री', hi: 'महिला', en: 'Female' },
  other: { mr: 'इतर', hi: 'अन्य', en: 'Other' },
  fatherName: { mr: 'वडिलांचे नाव', hi: 'पिता का नाम', en: "Father's Name" },
  spouseName: { mr: 'पती / पत्नीचे नाव', hi: 'पति / पत्नी का नाम', en: "Husband/Wife's Name" },
  surname: { mr: 'आडनाव', hi: 'उपनाम', en: 'Surname' },
  caste: { mr: 'जात', hi: 'जाति', en: 'Caste' },
  religion: { mr: 'धर्म', hi: 'धर्म', en: 'Religion' },
  address: { mr: 'राहण्याचा पत्ता', hi: 'निवास का पता', en: 'Residence / Address' },
  village: { mr: 'गाव', hi: 'गांव', en: 'Village' },
  taluka: { mr: 'तालुका', hi: 'तहसील', en: 'Taluka' },
  district: { mr: 'जिल्हा', hi: 'जिला', en: 'District' },
  admissionDate: { mr: 'प्रवेश तारीख', hi: 'प्रवेश तिथि', en: 'Admission Date' },
  currentAge: { mr: 'सध्याचे वय', hi: 'वर्तमान आयु', en: 'Current Age' },
  currentAgeFull: {
    mr: 'माझे सध्याचे वय ____ वर्षांचे आहे.',
    hi: 'मेरी वर्तमान आयु ____ वर्ष है।',
    en: 'My current age is ____ years.',
  },
  idProofNumber: { mr: 'ओळखपत्र क्रमांक / शासकीय पुरावा', hi: 'पहचान पत्र संख्या / सरकारी प्रमाण', en: 'Government ID / Proof Number' },
  aadhaar: { mr: 'आधार क्रमांक', hi: 'आधार संख्या', en: 'Aadhaar Number' },
  occupationStatus: { mr: 'मागील व्यवसाय / स्थिती', hi: 'पिछला व्यवसाय / स्थिति', en: 'Previous Occupation / Status' },
  occupationGovernment: { mr: 'शासकीय', hi: 'सरकारी', en: 'Government' },
  occupationPrivate: { mr: 'खाजगी', hi: 'निजी', en: 'Private' },
  occupationHomemaker: { mr: 'गृहिणी', hi: 'गृहिणी', en: 'Homemaker' },
  occupationUnmarried: { mr: 'अविवाहित', hi: 'अविवाहित', en: 'Unmarried' },
  relativesHeading: {
    mr: 'माझे जवळचे नातेवाईक (नावासह तपशील द्यावा)',
    hi: 'मेरे निकट संबंधियों का विवरण (नाम सहित)',
    en: 'Details of my close relatives (including name)',
  },
  husband: { mr: 'पती', hi: 'पति', en: 'Husband' },
  wife: { mr: 'पत्नी', hi: 'पत्नी', en: 'Wife' },
  sonDaughter: { mr: 'मुलगा / मुलगी', hi: 'पुत्र / पुत्री', en: 'Son / Daughter' },
  brother: { mr: 'भाऊ', hi: 'भाई', en: 'Brother' },
  relativeName: { mr: 'नाव', hi: 'नाम', en: 'Name' },
  relativeAge: { mr: 'वय', hi: 'आयु', en: 'Age' },
  relativeRelation: { mr: 'नाते', hi: 'संबंध', en: 'Relationship' },
  relativePhone: { mr: 'दूरध्वनी / मोबाईल क्रमांक', hi: 'टेलीफोन / मोबाइल संख्या', en: 'Telephone / Mobile Number' },
  addRelative: { mr: 'नातेवाईक जोडा', hi: 'संबंधी जोड़ें', en: 'Add Relative' },
  annualIncome: { mr: 'वार्षिक उत्पन्न', hi: 'वार्षिक आय', en: 'Annual Income' },
  freeAdmissionRequested: {
    mr: 'माझे वार्षिक उत्पन्न रु. १२,०००/- च्या आत असल्यामुळे मला संस्थेत विनाशुल्क म्हणून प्रवेश द्यावा.',
    hi: 'मेरी वार्षिक आय रु. १२,०००/- के भीतर होने के कारण मुझे संस्था में निःशुल्क प्रवेश दिया जाए।',
    en: 'My annual income is within Rs. 12,000/-, so I request free admission to the institution.',
  },
  paidAdmission: {
    mr: 'माझे वार्षिक उत्पन्न रु. १२,०००/- पेक्षा जास्त असल्यामुळे मला संस्थेत शुल्क म्हणून प्रवेश देण्यात यावा आणि मी नियमानुसार रु. ५००/- मासिक शुल्क भरण्यास तयार आहे.',
    hi: 'मेरी वार्षिक आय रु. १२,०००/- से अधिक होने के कारण मुझे संस्था में शुल्क सहित प्रवेश दिया जाए और मैं नियमानुसार रु. ५००/- मासिक शुल्क देने को तैयार हूँ।',
    en: 'My annual income is above Rs. 12,000/-, so I should be admitted on payment, and I am ready to pay the monthly fee of Rs. 500/- as per rules.',
  },
  monthlyFeeAcceptance: { mr: 'मासिक शुल्क भरण्यास तयार आहे', hi: 'मासिक शुल्क देने को तैयार हूँ', en: 'Ready to pay monthly fee' },
  declarationDailyActivities: {
    mr: 'मी माझे दैनंदिन कामे स्वतः करू शकतो.',
    hi: 'मैं अपने दैनिक कार्य स्वयं कर सकता हूँ।',
    en: 'I can perform my daily activities by myself.',
  },
  declarationDisease: {
    mr: 'मला कोणताही संसर्गिक अगर असाध्य रोग झालेला नाही.',
    hi: 'मुझे कोई संक्रामक अथवा असाध्य रोग नहीं है।',
    en: 'I do not have any infectious or incurable disease.',
  },
  declarationRules: {
    mr: 'वृद्धाश्रमाचे सर्व नियम व अटी मला पूर्णपणे मान्य आहेत आणि ते मी सर्व पाळीन.',
    hi: 'मुझे वृद्धाश्रम के सभी नियम और शर्तें पूरी तरह स्वीकार हैं और मैं उनका पालन करूँगा।',
    en: 'I fully accept all the rules and conditions of the old age home and agree to follow them.',
  },
  declarationSubstance: {
    mr: 'मला दारू, ताडी, गांजा, भांग, चरस किंवा अन्य मादक पदार्थांचे व्यसन नाही.',
    hi: 'मुझे शराब, ताड़ी, गांजा, भांग, चरस या अन्य मादक पदार्थों की लत नहीं है।',
    en: 'I have no addiction to liquor, toddy, ganja, bhang, charas or other intoxicants.',
  },
  govRuleReference: {
    mr: 'वृद्धाश्रमांना मान्यता व अनुदान देण्याची नियमावली १९९७ (शासकीय संदर्भ)',
    hi: 'वृद्धाश्रमों को मान्यता और अनुदान देने की नियमावली १९९७ (सरकारी संदर्भ)',
    en: 'Rules for granting recognition and grants to old age homes, 1997 (Government rule reference)',
  },
  recreationalActivities: {
    mr: 'वृद्धांच्या मनोरंजनाचे खेळ इत्यादीचा उल्लेख करण्यात यावा.',
    hi: 'वृद्धों के मनोरंजन के खेल आदि का उल्लेख किया जाना चाहिए।',
    en: 'Details of games and other recreational activities for elderly residents should be mentioned.',
  },
  femaleRoomAvailable: {
    mr: 'वृद्ध महिला प्रवेशितांकरिता स्वतंत्र कक्ष आहे',
    hi: 'वृद्ध महिला प्रवेशियों के लिए पृथक कक्ष है',
    en: 'Separate room available for female residents',
  },
  photograph: { mr: 'अलीकडचा फोटो (पासपोर्ट साईज)', hi: 'नवीनतम फोटो (पासपोर्ट आकार)', en: 'Recent photograph (passport size)' },
  photoVerificationStatus: { mr: 'फोटो पडताळणी स्थिती', hi: 'फोटो सत्यापन स्थिति', en: 'Photograph verification status' },
  signature: { mr: 'अर्जदाराची सही', hi: 'आवेदक के हस्ताक्षर', en: 'Applicant Signature' },
  signatureMethod: { mr: 'सही पद्धत', hi: 'हस्ताक्षर विधि', en: 'Signature Method' },
  thumbImpression: { mr: 'अंगठ्याचा ठसा', hi: 'अंगूठे का निशान', en: 'Thumb Impression' },
  finalDeclaration: {
    mr: 'मी दिलेली सर्व माहिती सत्य आहे आणि ती खोटी आढळल्यास त्याचे परिणाम मी सहन करीन.',
    hi: 'मैंने दी गई सभी जानकारी सत्य है और यदि वह असत्य पाई जाए तो उसके परिणाम मैं सहन करूँगा।',
    en: 'I declare that all the information given above is true, and I accept the consequences if it is found false.',
  },
  finalDeclarationAcknowledge: { mr: 'मी उपरोक्त सत्य घोषणा मान्य करतो.', hi: 'मैं उपरोक्त सत्य घोषणा स्वीकार करता हूँ।', en: 'I acknowledge the above truth declaration.' },
  committeeRecommendation: { mr: 'प्रवेश शिफारस', hi: 'प्रवेश सिफारिश', en: 'Admission Recommendation' },
  recommended: { mr: 'शिफारस केली', hi: 'अनुशंसित', en: 'Recommended' },
  notRecommended: { mr: 'शिफारस केली नाही', hi: 'अनुशंसित नहीं', en: 'Not Recommended' },
  admissionCategory: { mr: 'प्रवेश श्रेणी', hi: 'प्रवेश श्रेणी', en: 'Admission Category' },
  free: { mr: 'विनाशुल्क', hi: 'निःशुल्क', en: 'Free' },
  paid: { mr: 'सशुल्क', hi: 'सशुल्क', en: 'Paid' },
  committeeRemarks: { mr: 'समिती शेरा', hi: 'समिति टिप्पणी', en: 'Committee Remarks' },
  decisionDate: { mr: 'निर्णय तारीख', hi: 'निर्णय तिथि', en: 'Decision Date' },
  saveDraft: { mr: 'मसुदा जतन करा', hi: 'ड्राफ्ट सहेजें', en: 'Save Draft' },
  submit: { mr: 'सादर करा', hi: 'जमा करें', en: 'Submit' },
  submitApplication: { mr: 'अर्ज सादर करा', hi: 'आवेदन जमा करें', en: 'Submit Application' },
  preview: { mr: 'पूर्वावलोकन', hi: 'पूर्वावलोकन', en: 'Preview' },
  continueLater: { mr: 'नंतर सुरू ठेवा', hi: 'बाद में जारी रखें', en: 'Continue Later' },
  applicationSubmitted: { mr: 'अर्ज सादर झाला आहे', hi: 'आवेदन जमा हो गया है', en: 'Application submitted' },
  committeeDecision: { mr: 'समितीचा निर्णय', hi: 'समिति का निर्णय', en: 'Committee Decision' },
} as const satisfies Record<AdmissionLabelKey, Trilingual>;

export const ADMISSION_LABELS: Record<AdmissionLabelKey, Trilingual> = L;

export function admissionLabel(key: AdmissionLabelKey): Trilingual {
  return L[key];
}
