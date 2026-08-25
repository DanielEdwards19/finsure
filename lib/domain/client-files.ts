/**
 * Client file documents for FIN-DEMO-0002 (Julie Smith).
 *
 * Fictional prototype data. Records simulate Infynity, broker file / SharePoint,
 * lender portal, Outlook and manual uploads.
 *
 * `attachmentNames` links a document to the filename used on an email
 * attachment, so the same record opens from either the file list or the thread.
 */

import { fileReference, type AssessmentState, type FileReference } from "./types";

export const DOCUMENT_BASE = "/files/julie-smith/";

/** The only client file with documents attached in the prototype dataset. */
const DOCUMENTED_REFERENCE = fileReference("FIN-DEMO-0002");

export interface ClientDocument {
  readonly id: string;
  /** Filename within `DOCUMENT_BASE`. */
  readonly file: string;
  readonly name: string;
  /** Simulated system of origin, e.g. `Infynity`, `Outlook`. */
  readonly source: string;
  readonly kind: string;
  readonly date: string;
  readonly size: string;
  readonly status: AssessmentState;
  readonly category: string;
  readonly summary: string;
  readonly detail: readonly string[];
  /** Email attachment filenames that resolve to this record. */
  readonly attachmentNames?: readonly string[];
  /** Restricted personal information — metadata visible, preview withheld. */
  readonly restricted?: boolean;
}

export const DOCUMENTS: readonly ClientDocument[] = [
  { id:'d01', file:'01_Infynity_Client_Record.json', name:'Infynity client record',
    source:'Infynity', kind:'Application record', date:'5 Jun 2026', size:'4 KB',
    status:'EVIDENCE_FOUND', category:'Application data',
    summary:'Structured client, broker, application, employment and condition record exported from Infynity.',
    detail:[
      'Client: Julie Smith · single applicant, no dependants · Australian citizen',
      'Broker: Rachael Nguyen · Finsure Brisbane South',
      'Application: Owner-occupied purchase · $625,000 over 30 years, principal and interest',
      'Purchase price: $780,000 · estimated LVR 80.13%',
      'Lender / product: Westpac Flexi First Option Home Loan — Variable with Offset',
      'Security: 18 Wattlebird Crescent, Southport QLD 4215',
      'Contract 1 June 2026 · settlement 3 July 2026 · funds to complete $82,000',
      'Stage: Conditional approval · Status: Conditions outstanding',
      'Employment: Harbourlight Health Services Pty Ltd · Senior Operations Manager · permanent full-time from 15 February 2021',
    ] },
  { id:'d02', file:'02_Infynity_Application_Export.csv', name:'Infynity application export',
    source:'Infynity', kind:'Application record', date:'5 Jun 2026', size:'1 KB',
    status:'EVIDENCE_FOUND', category:'Application data',
    summary:'Flat field export of the application, including the one open lender condition.',
    detail:[
      'application_reference: FIN-DEMO-0002',
      'lender: Westpac · stage: Conditional approval · status: Conditions outstanding',
      'requested_loan_amount: 625000 · purchase_price: 780000 · funds_to_complete: 82000',
      'settlement_date: 2026-07-03',
      'open_condition: Evidence for $25,000 credit dated 28 May 2026',
    ] },
  { id:'d03', file:'03_Needs_and_Objectives_Assessment.docx', name:'Needs and objectives assessment',
    source:'Broker file / SharePoint', kind:'Needs and objectives record', date:'5 Jun 2026', size:'39 KB',
    status:'EVIDENCE_FOUND', category:'Needs and objectives',
    summary:'Records purpose, requested amount, repayment preferences, offset requirement, flexibility and timing.',
    detail:[
      'Recorded objectives: purchase as principal place of residence; keep repayments manageable if variable rates rise; use an offset for salary and emergency savings; make additional repayments without penalty; avoid LMI where reasonably achievable; settle by 3 July 2026.',
      'Preferences and trade-offs: variable preferred — Julie accepts repayment variability and values flexibility.',
      'Full offset requested for salary and emergency savings. Extra repayments required without penalty.',
      'Fixed rate considered but not preferred because it limits flexibility and may involve break costs.',
      'Lowest headline rate is not the sole priority; offset functionality, servicing fit and settlement confidence also matter.',
    ] },
  { id:'d04', file:'04_Broker_File_Notes.docx', name:'Broker file notes',
    source:'Broker file / SharePoint', kind:'Broker file note', date:'5 Jun 2026', size:'39 KB',
    status:'EVIDENCE_FOUND', category:'Record quality',
    summary:'Chronological record of advice, verification and application activity.',
    detail:[
      '20 May 2026, 10:00 — Initial discovery call. Purchase intent, deposit, income, liabilities, expected settlement and desired offset discussed. Broker process, privacy consent and the need to verify all financial information explained.',
      '22 May 2026, 14:30 — Needs assessment and product discussion. Variable principal-and-interest with full offset confirmed. Rate movement risk, repayment buffer, fixed-rate trade-offs and potential fees discussed. Julie confirmed no expected employment change and no undisclosed liabilities.',
      '25 May 2026, 11:15 — Employment verification. Permanent full-time employment verified with Megan Cole at Harbourlight Health Services. Role, commencement date and gross salary matched the application and payslips. No probation or pending change identified.',
      '27 May 2026, 16:00 — Recommendation meeting. Westpac, ANZ and Macquarie compared and the reasons for preferring Westpac explained. Julie understood the recommended product was not the lowest headline rate in every scenario.',
    ] },
  { id:'d05', file:'05_Employment_Verification_Record.docx', name:'Employment verification record',
    source:'Broker file / SharePoint', kind:'Employment verification', date:'25 May 2026', size:'39 KB',
    status:'EVIDENCE_FOUND', category:'Income and employment',
    summary:'Independent employer confirmation with the income evidence reviewed.',
    detail:[
      'Employer: Harbourlight Health Services Pty Ltd (ABN 88 000 111 222 — fictional prototype identifier)',
      'Role: Senior Operations Manager · permanent full-time · commenced 15 February 2021',
      'Gross salary: $138,000 per annum plus superannuation',
      'Verified by Megan Cole, People and Culture Manager, on 25 May 2026',
      'Method: telephone call to an independently located switchboard, transferred to People and Culture',
      'Evidence reviewed: payslips dated 8 May 2026 and 22 May 2026; salary credits in NAB transaction history; employer confirmation of role, basis, commencement and salary; client declaration that no employment change is expected before settlement.',
      'Outcome: Evidence found. The application, payslips, salary credits and employer confirmation were consistent at the time checked. This is a record of the verification performed, not a guarantee of future employment or income.',
      'Follow-up required: reconfirm if Julie advises of any change before settlement.',
    ] },
  { id:'d06', file:'06_Preliminary_Assessment.pdf', name:'Preliminary assessment',
    source:'Broker file / SharePoint', kind:'Preliminary assessment', date:'27 May 2026', size:'46 KB',
    status:'EVIDENCE_FOUND', category:'Assessment',
    summary:'Servicing and suitability assessment supporting the recommendation.',
    detail:[
      'Assesses the requested $625,000 against verified income, declared expenses, liabilities and the $82,000 funds to complete.',
      'Considers repayment buffer against variable-rate movement consistent with the recorded objectives.',
      'Prototype document — not a real credit assessment.',
    ] },
  { id:'d07', file:'07_Credit_Proposal_and_Product_Comparison.pdf', name:'Credit proposal and product comparison',
    source:'Broker file / SharePoint', kind:'Credit proposal', date:'27 May 2026', size:'46 KB',
    status:'EVIDENCE_FOUND', category:'Options and comparison',
    summary:'Compares Westpac, ANZ and Macquarie with reasons for the recommendation.',
    detail:[
      'Three lenders compared: Westpac, ANZ and Macquarie.',
      'Westpac is not presented as automatically best or cheapest.',
      'Recommendation reasoning ties offset functionality, servicing fit and settlement confidence to the recorded objectives.',
      'Prototype document — not a real credit proposal.',
    ] },
  { id:'d08', file:'08_Westpac_Conditional_Approval_PROTOTYPE.pdf', name:'Westpac conditional approval',
    source:'Lender portal simulation', kind:'Lender approval', date:'2 Jun 2026', size:'44 KB',
    status:'REQUIRES_REVIEW', category:'Lender conditions',
    summary:'Conditional approval with outstanding conditions, including verification of funds to complete.',
    detail:[
      'Conditional approval only — not a formal or unconditional approval.',
      'Outstanding conditions include an updated building insurance certificate and verification of the funds to complete.',
      'A follow-up question was raised about a $25,000 credit into the offset account on 28 May 2026.',
      'Prototype document — not a real lender decision.',
    ] },
  { id:'d09', file:'09_Building_Insurance_Certificate_PROTOTYPE.pdf', name:'Building insurance certificate',
    source:'Manual upload', kind:'Insurance certificate', date:'4 Jun 2026', size:'44 KB',
    status:'EVIDENCE_FOUND', category:'Lender conditions',
    summary:'Insurance certificate provided by the client and accepted by the broker.',
    detail:[
      'Provided by Julie by email on 4 June 2026 and forwarded to Westpac through the secure broker portal.',
      'Recorded by the broker as acceptable.',
      'Prototype document — not a real insurance certificate.',
    ],
    attachmentNames:['Building_Insurance_Certificate.pdf'] },
  { id:'d10', file:'10_Julie_Smith_NAB_Offset_Statement_PROTOTYPE.pdf', name:'NAB offset account statement',
    source:'Manual upload', kind:'Bank statement', date:'4 Jun 2026', size:'44 KB',
    status:'REQUIRES_REVIEW', category:'Source of funds',
    summary:'Shows the $82,000 held for settlement and the $25,000 credit dated 28 May 2026.',
    detail:[
      'Shows $82,000 available in the offset account for settlement.',
      'Includes a $25,000 credit dated 28 May 2026. The source, purpose and whether it is repayable are not established in the record.',
      'Emailed unredacted by the client; the broker asked that no further unredacted statements be emailed.',
      'Prototype document — not a real bank statement.',
    ],
    attachmentNames:['Julie_Smith_NAB_Offset_Statement.pdf'] },
  { id:'d11', file:'11_Source_of_Funds_Declaration_UNSIGNED.pdf', name:'Source of funds declaration (unsigned)',
    source:'Broker file / SharePoint', kind:'Declaration', date:'5 Jun 2026', size:'44 KB',
    status:'REQUIRES_REVIEW', category:'Source of funds',
    summary:'Declaration prepared but not signed — not evidence that the lender condition is met.',
    detail:[
      'Prepared to record the source of the $25,000 credit.',
      'Unsigned. An unsigned declaration is not evidence that the condition is satisfied.',
      'The record does not establish whether the amount is a gift, a loan or repayable.',
      'Prototype document — not a real declaration.',
    ] },
  { id:'d12', file:'12_Contract_of_Sale_Extract_PROTOTYPE.pdf', name:'Contract of sale extract',
    source:'Manual upload', kind:'Contract extract', date:'1 Jun 2026', size:'44 KB',
    status:'EVIDENCE_FOUND', category:'Legal / conveyancing',
    summary:'Contract extract relevant to the cooling-off question referred to the conveyancer.',
    detail:[
      'Security property: 18 Wattlebird Crescent, Southport QLD 4215. Contract date 1 June 2026.',
      'Cooling-off rights and special conditions are matters for the client\u2019s conveyancer, not the broker.',
      'Finance conditions are separate from rights under the sale contract.',
      'Prototype document — not a real contract.',
    ] },
  { id:'d13', file:'13_Identification_Checklist.docx', name:'Identification and verification checklist',
    source:'Broker file / SharePoint', kind:'Identification', date:'5 Jun 2026', size:'38 KB',
    status:'EVIDENCE_FOUND', category:'Identification',
    restricted:true,
    summary:'Evidence register only — identity images intentionally omitted.',
    detail:[
      'Australian passport sighted via secure portal — expiry 18 November 2031.',
      'Queensland driver licence sighted via secure portal — expiry 14 September 2029.',
      'Name, date of birth and residential address matched across the application and supporting records.',
      'Electronic verification completed — prototype record only.',
      'Access classification: Restricted personal information, stored in the secure broker document repository.',
      'Frontend behaviour: metadata visible, document preview restricted.',
    ] },
  { id:'d14', file:'14_Disclosure_and_Consent_Record_PROTOTYPE.pdf', name:'Disclosure and consent record',
    source:'Broker file / SharePoint', kind:'Disclosure record', date:'20 May 2026', size:'44 KB',
    status:'EVIDENCE_FOUND', category:'Disclosure and consent',
    summary:'Records privacy consent and the disclosures provided to the client.',
    detail:[
      'Privacy consent and the need to verify all financial information were explained at the initial discovery call.',
      'Authority recorded before copying the conveyancer into correspondence.',
      'Prototype document — not a real disclosure record.',
    ] },
  { id:'d15', file:'15_Julie_Smith_Email_Thread_Extract.txt', name:'Email thread extract (Outlook)',
    source:'Outlook', kind:'Email conversation', date:'5 Jun 2026', size:'4 KB',
    status:'EVIDENCE_FOUND', category:'Correspondence',
    summary:'Full thread: cooling-off referral, Westpac conditions and the source-of-funds follow-up.',
    detail:[
      'Five messages between Julie Smith, Rachael Nguyen and Priya Desai (Coastline Conveyancing), 3\u20135 June 2026.',
      'Cooling-off question referred to the conveyancer; finance conditions kept distinct from contract rights.',
      'Documents forwarded to Westpac through the secure broker portal, with a request not to email further unredacted statements.',
      'Westpac follow-up question raised about the $25,000 credit of 28 May 2026.',
    ] },
  { id:'d16', file:'16_Expected_Prototype_Findings.txt', name:'Expected prototype findings',
    source:'Prototype logic', kind:'Analysis reference', date:'5 Jun 2026', size:'2 KB',
    status:'EVIDENCE_FOUND', category:'Analysis reference',
    summary:'Reference set describing the findings the prototype should surface for this file.',
    detail:['Prototype logic reference, not part of the client record.'] },
  { id:'d17', file:'17_Document_Manifest.csv', name:'Document manifest',
    source:'Prototype package', kind:'Manifest', date:'5 Jun 2026', size:'2 KB',
    status:'EVIDENCE_FOUND', category:'Analysis reference',
    summary:'Index of every document in the package with its simulated source system.',
    detail:['17 records across Infynity, broker file / SharePoint, lender portal simulation, Outlook and manual upload.'] },
];

/** Documents on file for a client reference. Only FIN-DEMO-0002 has any. */
export const documentsForReference = (
  reference: FileReference,
): readonly ClientDocument[] =>
  reference === DOCUMENTED_REFERENCE ? DOCUMENTS : [];

export const findDocument = (id: string): ClientDocument | null =>
  DOCUMENTS.find((d) => d.id === id) ?? null;

export const findDocumentByFile = (file: string): ClientDocument | null =>
  DOCUMENTS.find((d) => d.file === file) ?? null;

/** Resolve an email attachment filename to its stored document record. */
export const findDocumentByAttachment = (
  attachmentName: string,
): ClientDocument | null => {
  const needle = attachmentName.toLowerCase();
  return (
    DOCUMENTS.find((d) =>
      (d.attachmentNames ?? []).some((a) => a.toLowerCase() === needle),
    ) ?? null
  );
};

/** Path to open or download a document. */
export const documentPath = (document: ClientDocument): string =>
  `${DOCUMENT_BASE}${document.file}`;
