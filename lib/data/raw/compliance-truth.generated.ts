/**
 * Curated compliance review set — the findings a reviewer has anchored to
 * specific passages in the email archive.
 *
 * Transcribed verbatim from the prototype. Each `ev` entry is a fragment of a
 * real message body in the thread archive; `lib/domain/compliance.ts` resolves
 * it to the message that contains it, so every finding stays traceable to its
 * source. An anchor that no longer resolves is a data error, and the test suite
 * fails on it rather than rendering a finding with no evidence behind it.
 *
 * This is distinct from `lib/domain/email-scan.ts`, which derives observations
 * from patterns rather than curation.
 */

import type {
  AssessmentState,
  Confidence,
  FindingSeverity,
} from "@/lib/domain/types";

export type ReviewFramework =
  | "RG_273"
  | "RG_273_AND_RESPONSIBLE_LENDING_RELATED"
  | "PRIVACY_OR_INTERNAL_POLICY";

/** Overall position recorded for an application under review. */
export type ReviewState =
  | "CLEAR"
  | "CLEAR_IN_PROGRESS"
  | "CLEAR_OPEN_CONDITION"
  | "CRITICAL_REVIEW"
  | "HIGH_REVIEW"
  | "MEDIUM_REVIEW";

export interface RawFinding {
  /** Distinguishes findings within one application. */
  readonly key: string;
  readonly status: AssessmentState;
  readonly severity: FindingSeverity;
  readonly confidence: Confidence;
  readonly framework: ReviewFramework;
  /** Review rule identifiers, e.g. `RES-04`. */
  readonly rules: readonly string[];
  readonly headline: string;
  readonly explanation: string;
  readonly action: string;
  /** Verbatim message fragments anchoring the finding to the archive. */
  readonly ev: readonly string[];
  /** Filenames of supporting documents on file. */
  readonly docs?: readonly string[];
}

export interface RawReviewedApplication {
  readonly ref: string;
  readonly state: ReviewState;
  readonly findings: readonly RawFinding[];
}

export const TRUTH: readonly RawReviewedApplication[] = [
 { ref:'FIN-DEMO-0001', state:'CLEAR', findings:[
   { key:'A', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-02','RES-03','RES-04'],
     headline:'Reduced income and parental leave were clarified before submission',
     explanation:'The client disclosed a permanent salary reduction. The broker paused submission, sought further detail, updated the servicing assessment and recorded that the earlier figure would not be relied on.',
     action:'No action suggested. Retain as supporting evidence of change handling.',
     ev:['My base is now $94,400, not $118,000.','I\u2019ve paused submission while I update the servicing assessment.','The verification note is now on your file.'] },
   { key:'B', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-05','RES-06','RES-07','RES-10'],
     headline:'Updated options and costs were presented after circumstances changed',
     explanation:'Three options were compared with rates, estimated repayments, features, fees and total cost, and the clients were invited to review the revised credit proposal.',
     action:'No action suggested. Retain as supporting evidence of comparison and disclosure.',
     ev:['I\u2019ve attached an updated comparison of the three options we discussed, including rates, estimated repayments, offset/redraw features, fees and the total cost over the comparison period.'] },
 ]},
 { ref:'FIN-DEMO-0002', state:'CLEAR_OPEN_CONDITION', findings:[
   { key:'A', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-01','RES-02','RES-10'],
     headline:'Information gathering and objectives were recorded',
     explanation:'The needs and objectives record captures purpose, requested amount, repayment preferences, offset requirement, flexibility and timing.',
     action:'No action suggested. Retain as supporting evidence of information gathering.',
     ev:[], docs:['03_Needs_and_Objectives_Assessment.docx','04_Broker_File_Notes.docx'] },
   { key:'B', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-05','RES-06'],
     headline:'Alternatives were compared and the recommendation reasoned',
     explanation:'Westpac, ANZ and Macquarie options are compared. Westpac is not presented as automatically best or cheapest.',
     action:'No action suggested. Retain as supporting evidence of comparison and recommendation reasoning.',
     ev:[], docs:['07_Credit_Proposal_and_Product_Comparison.pdf','06_Preliminary_Assessment.pdf'] },
   { key:'C', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-02','RES-04'],
     headline:'Employment and income were independently verified',
     explanation:'The application, payslips, salary credits and employer confirmation were recorded as consistent when reviewed.',
     action:'No action suggested. Reconfirm if the client advises any change before settlement.',
     ev:[], docs:['05_Employment_Verification_Record.docx'] },
   { key:'D', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-11'],
     headline:'Contract question was referred to the client\u2019s conveyancer',
     explanation:'The broker declined to provide a potentially incorrect cooling-off deadline and referred the question to the conveyancer, keeping finance conditions distinct from rights under the sale contract.',
     action:'No action suggested. Retain as supporting evidence of professional boundaries.',
     ev:['The contract terms and cooling-off rights need to be confirmed by your conveyancer or solicitor','Those finance conditions are separate from your rights under the sale contract.'],
     docs:['12_Contract_of_Sale_Extract_PROTOTYPE.pdf','15_Julie_Smith_Email_Thread_Extract.txt'] },
   { key:'E', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'PRIVACY_OR_INTERNAL_POLICY',
     rules:['RES-12'],
     headline:'Privacy-aware document handling',
     explanation:'Documents were sent to the lender through the secure broker portal and the client was asked not to email further unredacted bank statements.',
     action:'No action suggested. Retain as supporting evidence of secure handling.',
     ev:['sent them to Westpac through the secure broker portal','Please don\u2019t email any further unredacted statements unless I specifically ask for them.'],
     docs:['14_Disclosure_and_Consent_Record_PROTOTYPE.pdf'] },
   { key:'F', status:'REQUIRES_REVIEW', severity:'MEDIUM', confidence:'HIGH', framework:'RG_273_AND_RESPONSIBLE_LENDING_RELATED',
     rules:['RES-02','RES-04','RES-14'],
     headline:'Source of settlement funds is not established',
     explanation:'A $25,000 credit appears in the offset account on 28 May 2026. The source, purpose and whether it is repayable are not established in the analysed record. The unsigned declaration is not evidence that the lender condition is met.',
     action:'Obtain and assess source evidence, update the application accurately and satisfy current lender requirements. Do not infer a gift from a sender label alone.',
     ev:['Westpac has asked one follow-up question about a $25,000 credit into the offset account on 28 May.','If it was a gift, we\u2019ll need to record that accurately and check whether the lender requires a gift declaration.'],
     docs:['10_Julie_Smith_NAB_Offset_Statement_PROTOTYPE.pdf','11_Source_of_Funds_Declaration_UNSIGNED.pdf','08_Westpac_Conditional_Approval_PROTOTYPE.pdf'] },
 ]},
 { ref:'FIN-DEMO-0003', state:'CLEAR', findings:[
   { key:'A', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-01','RES-05','RES-06','RES-07'],
     headline:'Recommendation was tied to recorded objectives and alternatives',
     explanation:'Three lenders were compared against the objectives the clients confirmed, and the broker explained why the cheapest headline rate was not preferred.',
     action:'No action suggested. Retain as supporting evidence of individual assessment.',
     ev:['I\u2019ve compared products from ubank, ING and NAB against the objectives you confirmed','It is not the cheapest headline rate.','The lower-rate alternative does not include the offset arrangement you said was important.'] },
   { key:'B', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-07','RES-08','RES-11'],
     headline:'Offset and redraw differences were explained before instruction',
     explanation:'The broker explained feature limits and uncertainty, referred tax treatment to an adviser, and received a written instruction to proceed.',
     action:'No action suggested. Retain as supporting evidence of informed instruction.',
     ev:['Additional repayments placed into the loan may become available as redraw, subject to the lender\u2019s terms, transaction limits and continuing availability.','please obtain tax advice before choosing where to hold the funds','Please proceed with the ubank split option shown in the proposal, including the offset account.'] },
 ]},
 { ref:'FIN-DEMO-0004', state:'CRITICAL_REVIEW', findings:[
   { key:'A', status:'REQUIRES_REVIEW', severity:'CRITICAL', confidence:'HIGH', framework:'RG_273_AND_RESPONSIBLE_LENDING_RELATED',
     rules:['RES-02','RES-04','RES-05','RES-07','RES-13','RES-14'],
     headline:'Unsupported property value appears to be used without verification',
     explanation:'The email indicates an expected sale price is being relied on in place of a formal valuation. The expected sale value materially affects end debt and bridging risk.',
     action:'Pause progression, verify the valuation basis and review the full assessment.',
     ev:['If anyone asks, we\u2019re using the $1.2 million expected sale price','We can sort out a formal valuation later.'] },
   { key:'B', status:'REQUIRES_REVIEW', severity:'HIGH', confidence:'HIGH', framework:'RG_273',
     rules:['RES-07','RES-13','RES-14'],
     headline:'Bridging risks and uncertainty may have been understated',
     explanation:'Reassuring language about timing and repayments appears without a balanced explanation of term, capitalised interest, sale-price risk or fallback options.',
     action:'Review whether term, capitalised interest, sale-price risk, repayment exposure and fallback options were accurately and fully explained.',
     ev:['there should be plenty of time','you won\u2019t have to make normal repayments until the old property sells'] },
 ]},
 { ref:'FIN-DEMO-0005', state:'CRITICAL_REVIEW', findings:[
   { key:'A', status:'REQUIRES_REVIEW', severity:'CRITICAL', confidence:'HIGH', framework:'RG_273_AND_RESPONSIBLE_LENDING_RELATED',
     rules:['RES-02','RES-04'],
     headline:'Broker appears to instruct the client not to disclose liabilities',
     explanation:'The client disclosed buy-now-pay-later balances and repayments. The email indicates they need not be raised if absent from the credit report, and that benchmark expenses were entered in place of disclosed commitments.',
     action:'Escalate for compliance review, correct the application data and reassess the client\u2019s commitments before proceeding.',
     ev:['If they don\u2019t appear on the credit report we don\u2019t need to draw attention to them.','I\u2019ve already entered your expenses at the benchmark amount'] },
 ]},
 { ref:'FIN-DEMO-0011', state:'CLEAR', findings:[
   { key:'A', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-02','RES-03','RES-04','RES-14'],
     headline:'Gift status and construction-cost risk were clarified',
     explanation:'The broker declined to describe a family contribution as an unconditional gift until the arrangement was confirmed, and sought variation terms so a contingency could be included.',
     action:'No action suggested. Retain as supporting evidence of source-of-funds and cost-risk enquiry.',
     ev:['We should not describe the $80,000 as an unconditional gift until your parents confirm the arrangement.','Do not ask them to sign a standard gift declaration yet.','The current funding plan includes a $90,000 contingency for the identified variation risks.'] },
   { key:'B', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-05','RES-06','RES-08','RES-10'],
     headline:'Revised funding position and comparison were provided before authority',
     explanation:'Revised funds-to-complete and product comparison documents were provided, and the client was asked to identify any missing costs before authorising submission.',
     action:'No action suggested. Retain as supporting evidence of informed authority.',
     ev:['Attached is the revised funds-to-complete calculation and the product comparison we discussed.','Please check the figures and tell me if any other expected costs are missing before you authorise submission.'] },
 ]},
 { ref:'FIN-DEMO-0019', state:'CRITICAL_REVIEW', findings:[
   { key:'A', status:'REQUIRES_REVIEW', severity:'CRITICAL', confidence:'HIGH', framework:'RG_273_AND_RESPONSIBLE_LENDING_RELATED',
     rules:['RES-04'],
     headline:'Broker appears to propose misrepresenting the loan purpose',
     explanation:'The email indicates a loan purpose would be recorded differently from the purposes the client described.',
     action:'Stop the application, preserve the evidence and escalate for review.',
     ev:['it will be easier if we put the purpose down as home improvements and personal investment'] },
   { key:'B', status:'REQUIRES_REVIEW', severity:'CRITICAL', confidence:'HIGH', framework:'RG_273_AND_RESPONSIBLE_LENDING_RELATED',
     rules:['RES-03','RES-04'],
     headline:'Broker appears to instruct the client to conceal a resignation',
     explanation:'The email indicates submission would be timed ahead of a final payslip and that a resignation should not be volunteered to the lender.',
     action:'Stop submission, correct the employment information and reassess suitability and servicing.',
     ev:['Let\u2019s lodge it before the final payslip','Please don\u2019t volunteer the resignation unless they ask directly.'] },
   { key:'C', status:'REQUIRES_REVIEW', severity:'HIGH', confidence:'MEDIUM', framework:'RG_273',
     rules:['RES-01','RES-02'],
     headline:'Mixed business and personal purposes require scope review',
     explanation:'The client described funding a new business, clearing personal cards and assisting a family member. Mixed purposes affect which regulatory and lender framework applies.',
     action:'Confirm the true purposes and determine the correct regulatory and lender framework before relying on the residential ruleset.',
     ev:['Around $250,000 will go into my new cafe and the rest will clear cards and help my son with his deposit.'] },
 ]},
 { ref:'FIN-DEMO-0020', state:'CLEAR', findings:[
   { key:'A', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-02','RES-03','RES-07','RES-14'],
     headline:'Construction variation was reassessed before further commitment',
     explanation:'The broker sought the signed variation and evidence of funds, updated the valuation and funding position, warned that finance was not guaranteed and communicated the resulting funding gap.',
     action:'No action suggested. Retain as supporting evidence of change handling and cost disclosure.',
     ev:['Please upload the signed variation and evidence of the $35,000.','Until that is confirmed, please don\u2019t commit to any further variations on the assumption they can be financed.','there is a funding gap of approximately $42,000 after your stated contribution and contingency'] },
 ]},
 { ref:'FIN-DEMO-0023', state:'CRITICAL_REVIEW', findings:[
   { key:'A', status:'REQUIRES_REVIEW', severity:'CRITICAL', confidence:'HIGH', framework:'RG_273_AND_RESPONSIBLE_LENDING_RELATED',
     rules:['RES-04','RES-08','RES-13'],
     headline:'Client was told to sign incomplete and potentially inaccurate forms',
     explanation:'The email indicates material fields would be completed after signature and that a single stated purpose would be recorded for convenience.',
     action:'Stop progression, obtain corrected documents and escalate the conduct for review.',
     ev:['Leave any blank purpose or account fields for me and I\u2019ll fill them in after.','It\u2019s cleaner as one purpose','Sign it and I\u2019ll explain if they raise it.'] },
 ]},
 { ref:'FIN-DEMO-0024', state:'CRITICAL_REVIEW', findings:[
   { key:'A', status:'REQUIRES_REVIEW', severity:'CRITICAL', confidence:'HIGH', framework:'RG_273_AND_RESPONSIBLE_LENDING_RELATED',
     rules:['RES-03','RES-04'],
     headline:'Broker appears to instruct the client to conceal a new job',
     explanation:'The email indicates a changed employment position would be kept out of written correspondence and raised with the lender only if asked.',
     action:'Escalate, confirm lender requirements and reassess the changed employment position before any drawdown or further progression.',
     ev:['Keep the new contract off email','we\u2019ll deal with it only if BOQ asks for another payslip'] },
 ]},
 { ref:'FIN-DEMO-0027', state:'CLEAR', findings:[
   { key:'A', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-02','RES-03','RES-04','RES-05'],
     headline:'Decline and corrected income were investigated before another application',
     explanation:'The broker declined to conceal a previous decline, corrected commission and liability information, and recommended against a further submission at the requested amount.',
     action:'No action suggested. Retain as supporting evidence of accuracy and individual assessment.',
     ev:['I will not submit the application elsewhere until we have reviewed the reason','any application must answer the lender\u2019s questions accurately, including questions about previous applications or declines','My recommendation is not to submit another application at the requested amount at this time.'] },
   { key:'B', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-06','RES-07','RES-11'],
     headline:'Alternatives and contractual boundaries were explained',
     explanation:'Alternative paths were documented and the land-contract question was referred to the clients\u2019 solicitor.',
     action:'No action suggested. Retain as supporting evidence of comparison and referral.',
     ev:['Please speak with your solicitor today about the finance date and your options under the land contract.','The attached note explains the assessment and the alternatives we discussed, including reducing the build budget, increasing your contribution or waiting for a longer income history.'] },
 ]},
 { ref:'FIN-DEMO-0034', state:'CLEAR_IN_PROGRESS', findings:[
   { key:'A', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-02','RES-03','RES-07','RES-14'],
     headline:'Additional liabilities and affordability indicators were investigated',
     explanation:'The broker sought complete liability, expense and recent-statement evidence, noted affordability indicators in the statements and added a newly disclosed facility.',
     action:'No action suggested. Assessment remains in progress.',
     ev:['The bank statements show recurring gambling transactions and several dishonour fees','I\u2019ve added the Latitude facility and will use the verified commitments in the assessment.'] },
   { key:'B', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-05','RES-06','RES-07'],
     headline:'Debt-consolidation costs and long-term risks will be compared',
     explanation:'The broker explained that reduced monthly repayments may increase total interest and place the home at risk, and set out the comparison to be completed before any recommendation.',
     action:'No action suggested. Confirm the comparison is completed before recommendation.',
     ev:['extending short-term debt over a home-loan term may increase the total interest paid and puts the home at risk','No application will be submitted until you have reviewed the comparison and confirmed the information is accurate.'] },
 ]},
 { ref:'FIN-DEMO-0037', state:'HIGH_REVIEW', findings:[
   { key:'A', status:'REQUIRES_REVIEW', severity:'HIGH', confidence:'HIGH', framework:'RG_273',
     rules:['RES-02','RES-07','RES-11','RES-13','RES-14'],
     headline:'Guarantor risks may have been materially understated',
     explanation:'Guarantor exposure was described reassuringly and independent legal advice as a formality. The guarantors\u2019 age, retirement position and existing mortgage do not appear to have been assessed in the correspondence.',
     action:'Review the proposed guarantee structure, ensure risks are accurately explained and require appropriate independent advice.',
     ev:['there\u2019s nothing for them to worry about','mainly a formality'] },
 ]},
 { ref:'FIN-DEMO-0038', state:'HIGH_REVIEW', findings:[
   { key:'A', status:'REQUIRES_REVIEW', severity:'HIGH', confidence:'HIGH', framework:'RG_273',
     rules:['RES-05','RES-07','RES-08','RES-13','RES-14'],
     headline:'Recommendation relies on headline cash flow without balanced total cost',
     explanation:'The recommendation is presented through monthly saving and minimised fees. The client asked about repaying consolidated debt over a 30-year term and no quantified answer is visible in the archive.',
     action:'Review the comparison, total interest, fees, loan term and client understanding.',
     ev:['It\u2019s a no-brainer','Fees are only a couple of grand and get added to the loan, so you don\u2019t feel them.'] },
   { key:'B', status:'REQUIRES_REVIEW', severity:'HIGH', confidence:'HIGH', framework:'RG_273_AND_RESPONSIBLE_LENDING_RELATED',
     rules:['RES-02','RES-03','RES-04'],
     headline:'Undisclosed card limit was dismissed after signature and submission',
     explanation:'A newly disclosed credit-card limit was treated as immaterial because the balance was nil, after documents were signed and the application submitted.',
     action:'Confirm lender treatment, correct the application if required and reassess.',
     ev:['Zero balance means it doesn\u2019t count'] },
 ]},
 { ref:'FIN-DEMO-0039', state:'CLEAR', findings:[
   { key:'A', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-01','RES-03','RES-05','RES-06','RES-07'],
     headline:'Recommendation changed to reflect the client\u2019s planned sale',
     explanation:'Three options were compared with costs and features. After learning of a planned sale, the broker explained possible break costs and revised the recommendation.',
     action:'No action suggested. Retain as supporting evidence of individual assessment.',
     ev:['I\u2019ve attached a comparison of: - remaining with your current lender; - refinancing to AMP\u2019s variable investor loan; and - fixing part of the balance for two years.','That makes the two-year fixed option less aligned with your stated plan to sell in approximately 18 months.'] },
   { key:'B', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-08','RES-11'],
     headline:'Client instruction and specialist tax boundary were recorded',
     explanation:'Tax matters were referred to an adviser and a written instruction to proceed with the variable option was received.',
     action:'No action suggested. Retain as supporting evidence of informed instruction.',
     ev:['I can explain the loan features but cannot provide tax advice.','Please proceed with the AMP variable option.'] },
 ]},
 { ref:'FIN-DEMO-0040', state:'CRITICAL_REVIEW', findings:[
   { key:'A', status:'REQUIRES_REVIEW', severity:'CRITICAL', confidence:'HIGH', framework:'PRIVACY_OR_INTERNAL_POLICY',
     rules:['RES-12'],
     headline:'Sensitive loan information was sent to unauthorised recipients',
     explanation:'The client advised that a copied address was not hers and that a third party was not authorised to receive the documents. The correspondence also discloses that the document password was the client\u2019s date of birth.',
     action:'Escalate immediately under the organisation\u2019s privacy and data-breach response process. Preserve the record. Do not present this as an RG 273 conclusion.',
     ev:['that Gmail address isn\u2019t mine','the password is your date of birth'] },
 ]},
 { ref:'FIN-DEMO-0007', state:'CRITICAL_REVIEW', findings:[
   { key:'A', status:'REQUIRES_REVIEW', severity:'CRITICAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-05','RES-06','RES-09'],
     headline:'Lender campaign may have influenced the recommendation',
     explanation:'Lender selection is linked to convenience, an assessor relationship and a broker campaign. The client requested a comparison with another lender and the correspondence indicates it was not provided.',
     action:'Review the lender campaign, remuneration and product-selection rationale. Provide a consumer-specific comparison and record how the client\u2019s interests were prioritised.',
     ev:['Suncorp is easier and I know their assessor','running a broker campaign this month'] },
 ]},
 { ref:'FIN-DEMO-0031', state:'CLEAR', findings:[
   { key:'A', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-02','RES-03','RES-04','RES-14'],
     headline:'Proposed new debt was assessed before action',
     explanation:'The broker explained that conditional approval was not final, assessed the proposed credit card and family-loan scenarios, and contacted the lender with the client\u2019s authority.',
     action:'No action suggested. Retain as supporting evidence of change handling.',
     ev:['Please do not apply for the card until I have updated the servicing assessment and checked the position with BOQ.','A family loan with regular repayments is still a commitment and needs to be included.','I\u2019ve sent the lender a factual summary with your authority'] },
   { key:'B', status:'EVIDENCE_FOUND', severity:'INFORMATIONAL', confidence:'HIGH', framework:'RG_273',
     rules:['RES-08','RES-10'],
     headline:'Client instruction and lender response were recorded',
     explanation:'The client\u2019s decision to postpone the repair was recorded, along with the lender\u2019s reassessment position and a request to report any further change.',
     action:'No action suggested. Retain as supporting evidence of record quality.',
     ev:['You confirmed by phone that you will postpone the repair and use public transport until after settlement.','The approval remains subject to BOQ\u2019s conditions and final verification.'] },
 ]},
];
