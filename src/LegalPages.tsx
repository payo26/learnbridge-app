import { useEffect } from 'react';
import { ArrowLeft, GraduationCap, Printer } from 'lucide-react';
import './legal.css';

export type LegalDocument='terms'|'privacy'|'refunds';

const effectiveDate='2 November 2026';
const supportEmail='support@learnbridge-app.com';

const documentMeta:Record<LegalDocument,{title:string;description:string}>={
  terms:{
    title:'Terms of Service',
    description:'The rules for using LearnBridge lessons, subscriptions, family accounts and school licences.',
  },
  privacy:{
    title:'Privacy Notice',
    description:'How LearnBridge collects, uses, protects and shares learner, family and school account information.',
  },
  refunds:{
    title:'Refund and Cancellation Policy',
    description:'How LearnBridge subscription cancellations, renewal disputes and refund requests are handled.',
  },
};

function ContactLink(){return <a href={`mailto:${supportEmail}`}>{supportEmail}</a>;}

function Terms(){return <>
  <section id='agreement'><h2>1. Agreement and service operator</h2><p>These Terms of Service form an agreement between you and LearnBridge for access to the LearnBridge educational platform at <a href='https://learnbridge-app.com'>learnbridge-app.com</a>. In these Terms, “LearnBridge”, “we”, “us” and “our” refer to the operator of the LearnBridge service in Nigeria.</p><p>By creating an account, accepting a school invitation, buying a subscription or using protected lessons, you confirm that you have read and accepted these Terms and our <a href='/privacy'>Privacy Notice</a>. If you do not agree, do not create an account or purchase access.</p></section>

  <section id='eligibility'><h2>2. Eligibility and learner accounts</h2><ul><li>An Individual, Family or School account owner must be at least 18 years old and legally able to enter this agreement.</li><li>A learner under 18 may use LearnBridge only under the supervision and authority of a parent, guardian or participating school.</li><li>A school administrator confirms that they have authority to create the school account, invite staff and learners and manage the school licence.</li><li>You must provide accurate account information and keep sign-in details confidential. Tell us promptly if you believe an account has been compromised.</li></ul></section>

  <section id='education'><h2>3. Educational service</h2><p>LearnBridge provides original study-support materials for Years 7–12, including Nigerian and British curriculum pathways, topic plans, lesson notes, practice questions and illustrations. The pathways are learning aids; they are not official certification, accreditation or a guarantee that every school, examination board or teacher follows the same sequence.</p><p>Lesson content may be produced with editorial and automated content tools. We work to improve accuracy, but learners should check current syllabuses, examination requirements and teacher guidance. LearnBridge does not replace a school, qualified teacher, professional advice or emergency support.</p></section>

  <section id='subscriptions'><h2>4. Plans, prices and recurring payments</h2><ul><li>Individual and Family plans may be offered monthly or annually. The current price, billing interval and included access are displayed before checkout.</li><li>Paid subscriptions renew automatically through Paystack until cancelled. By completing checkout, you authorise the recurring charge shown for the selected plan.</li><li>A Family plan supports the learner limit displayed in the app. Account owners are responsible for invited family learners.</li><li>Prices are shown in Nigerian naira unless stated otherwise. We will disclose applicable charges before payment.</li><li>We may change prices for future purchases or renewal periods. Where reasonably possible, existing subscribers will receive advance notice before a changed renewal price applies.</li></ul><p>Paystack processes payment credentials and recurring charges. LearnBridge does not store your complete card number, CVV or online-banking credentials.</p></section>

  <section id='schools'><h2>5. School pilots and licences</h2><p>An approved school may receive a 30-day, 25-learner pilot without charge unless a written offer clearly states otherwise. Continuing after a pilot requires an accepted custom quotation or another written agreement. School licences may be termly or annual and are limited to the agreed seats, users and duration.</p><p>A school is responsible for authorised account administration, learner invitations, appropriate supervision and any notices or permissions it must provide to learners, parents and staff. A signed school agreement or quotation may contain additional terms; where it expressly conflicts with these Terms, the signed agreement controls for that school licence.</p></section>

  <section id='cancellation'><h2>6. Cancellation, expiry and refunds</h2><p>You may cancel future renewal through the subscription-management option in your account or by contacting us. Cancellation normally stops the next charge; access continues until the end of the already-paid period unless the account is suspended for a serious breach.</p><p>Refund eligibility is governed by our <a href='/refunds'>Refund and Cancellation Policy</a> and any rights that cannot lawfully be excluded. Cancelling a subscription does not by itself reverse an earlier completed payment.</p></section>

  <section id='acceptable-use'><h2>7. Acceptable use</h2><p>You must not:</p><ul><li>share one account outside its permitted Individual, Family or School users;</li><li>copy, scrape, resell, publish or systematically download substantial parts of the lesson library;</li><li>circumvent access controls, probe the service for vulnerabilities or interfere with its operation;</li><li>upload malicious code, impersonate another person or use LearnBridge unlawfully;</li><li>use lesson content to mislead others about official curriculum approval or examination-board endorsement.</li></ul><p>Teachers may use reasonable extracts with their authorised classes while their school licence is active, but may not republish or sell the lesson library.</p></section>

  <section id='ownership'><h2>8. Intellectual property</h2><p>LearnBridge and its licensors retain ownership of the platform, design, software, lesson text, diagrams and branding, except for identified public-domain or third-party materials. Your subscription gives you a limited, personal, non-exclusive and non-transferable right to use the service for learning or authorised classroom teaching during the access period.</p></section>

  <section id='availability'><h2>9. Availability and changes</h2><p>We aim to provide reliable access but do not promise uninterrupted or error-free operation. Maintenance, internet failures, payment-provider incidents, cloud-service failures and events outside our reasonable control may affect availability. We may correct, update, replace or withdraw inaccurate or outdated material.</p></section>

  <section id='liability'><h2>10. Responsibility and limitation</h2><p>Nothing in these Terms excludes liability or consumer rights that cannot legally be excluded. To the extent permitted by law, LearnBridge is not responsible for indirect or consequential loss, examination results, school decisions or loss caused by reliance on content without checking current teacher or syllabus guidance.</p><p>Where we fail to supply the paid service to the standard required by applicable law, you may be entitled to correction, restored access or a reasonable refund under the circumstances.</p></section>

  <section id='suspension'><h2>11. Suspension and termination</h2><p>We may restrict or suspend an account where payment fails, a licence expires, security is at risk or these Terms are seriously breached. Where appropriate, we will explain the reason and provide a reasonable opportunity to resolve it. You may stop using LearnBridge at any time and may request account closure subject to legal retention obligations.</p></section>

  <section id='law'><h2>12. Complaints, disputes and governing law</h2><p>Please first contact <ContactLink/> so we can investigate and attempt a fair resolution. These Terms are governed by the laws of the Federal Republic of Nigeria. Nothing prevents a consumer from using an available regulator, consumer-protection process or court with lawful jurisdiction.</p></section>

  <section id='changes'><h2>13. Changes and contact</h2><p>We may update these Terms to reflect service, legal or operational changes. Material changes will be communicated reasonably, and the effective date above will be updated. Continued use after a notified effective date constitutes acceptance where permitted by law.</p><p>Questions about these Terms may be sent to <ContactLink/>.</p></section>
</>}

function Privacy(){return <>
  <section id='controller'><h2>1. Who controls your information</h2><p>LearnBridge is the data controller for personal information processed through Individual and Family accounts and for platform administration. For school-provided learner information, LearnBridge and the school may have different responsibilities depending on the school arrangement. Privacy questions and requests may be sent to <ContactLink/>.</p></section>

  <section id='information'><h2>2. Information we collect</h2><ul><li><strong>Account information:</strong> name, email address, password hash, account type, role, school or family membership and account status.</li><li><strong>Subscription and licence information:</strong> selected package, plan, billing interval, payment reference, payment status, subscription code, access dates, quotations and seat usage.</li><li><strong>Learning information:</strong> selected curriculum, class and subject preferences. Bookmarks, reading markers and quiz scores may be stored in your browser. A school may also receive account and seat-management information for its members.</li><li><strong>Support and administration:</strong> messages, pilot requests, school details, invitations, complaints and records needed to resolve an enquiry.</li><li><strong>Technical information:</strong> session identifiers, IP address, browser information, security logs and diagnostic information generated when the service is used.</li></ul><p>We do not intentionally collect complete payment-card numbers, CVVs or online-banking credentials. Paystack collects and processes payment information on its secure checkout service.</p></section>

  <section id='sources'><h2>3. How information is obtained</h2><p>We receive information directly from account owners and users, from a school or family account that invites a learner, from Paystack when a payment or subscription event occurs, and automatically from normal service and security logs.</p></section>

  <section id='purposes'><h2>4. Why we use information</h2><ul><li>create accounts, authenticate users and provide lesson access;</li><li>administer subscriptions, school pilots, quotations, payments and renewals;</li><li>save requested preferences and support learning functions;</li><li>send service, security, password-reset and payment-related communications;</li><li>prevent fraud, abuse and unauthorised access;</li><li>maintain, troubleshoot and improve LearnBridge;</li><li>meet accounting, consumer-protection, data-protection and other legal obligations;</li><li>establish, exercise or defend legal claims.</li></ul></section>

  <section id='lawful-bases'><h2>5. Lawful bases</h2><p>Depending on the activity, we process information because it is necessary to perform a subscription or school agreement, comply with law, protect legitimate interests such as service security and improvement, protect vital interests, or act on valid consent. Where consent is the applicable basis, it may be withdrawn without affecting earlier lawful processing.</p></section>

  <section id='children'><h2>6. Children and student information</h2><p>LearnBridge is designed for secondary-school learners, many of whom are under 18. Individual and Family account owners and school administrators must be adults. A child should use an invited learner account only with the authority and supervision of a parent, guardian or school.</p><p>We limit learner-profile information to what is reasonably needed to provide access and learning functions. Parents, guardians and schools should not place unnecessary sensitive information in account names or support messages. We will address child-data requests in accordance with the Nigeria Data Protection Act 2023 and other applicable requirements.</p></section>

  <section id='sharing'><h2>7. When information is shared</h2><p>We may share only the information reasonably required with:</p><ul><li><strong>Paystack</strong>, to initialise, verify and administer payments, subscriptions, refunds and payment disputes;</li><li><strong>hosting, database, email and security providers</strong>, to operate and protect the service;</li><li><strong>lesson-content technology providers</strong>, for subject and topic generation prompts that are designed not to include learner account details;</li><li><strong>schools and family account owners</strong>, for authorised membership, seat and access administration;</li><li><strong>professional advisers, regulators or authorities</strong>, where reasonably necessary or legally required;</li><li><strong>a successor organisation</strong>, if the service is reorganised or transferred, subject to appropriate safeguards.</li></ul><p>We do not sell learner or account personal information.</p></section>

  <section id='transfers'><h2>8. International services and transfers</h2><p>Some technology providers may process information outside Nigeria. Where personal data is transferred internationally, we will use a lawful transfer basis and appropriate contractual, organisational or technical safeguards as required.</p></section>

  <section id='storage'><h2>9. Cookies, sessions and browser storage</h2><p>LearnBridge uses a secure session cookie to keep signed-in users authenticated. It also uses browser local storage for curriculum preferences, bookmarks, reading markers and quiz progress. These features are necessary for the requested service rather than advertising tracking. Clearing browser data may remove locally stored learning progress.</p></section>

  <section id='retention'><h2>10. Retention</h2><p>Account information is kept while the account is active and for a reasonable period afterwards to handle reactivation, complaints, fraud and legal claims. Payment, subscription and quotation records may be retained for the period required by accounting, tax, consumer and dispute obligations. Security logs and password-reset records are retained only as long as reasonably needed for their purpose. We delete or de-identify information when it is no longer required, unless law requires continued retention.</p></section>

  <section id='security'><h2>11. Security</h2><p>We use measures such as HTTPS, access controls, password hashing, secure cookies, restricted database access, signed Paystack webhook verification and backups. No online system is completely risk-free. Please use a unique password and contact us immediately if you suspect unauthorised access.</p></section>

  <section id='rights'><h2>12. Your privacy rights</h2><p>Subject to applicable law and appropriate identity verification, you may request information about processing, access to your personal data, correction, deletion, restriction, objection, portability, withdrawal of consent, or review of a qualifying automated decision. You may also complain to the Nigeria Data Protection Commission.</p><p>Send a request to <ContactLink/>. We may ask for information needed to verify the requester and protect the account. We will respond within the period required by applicable law.</p></section>

  <section id='automated'><h2>13. Automated functions</h2><p>LearnBridge automatically checks subscription and licence status to decide whether protected lessons may be opened. This is based on payment and access records rather than profiling a learner’s ability. Contact us if you believe an access decision is incorrect.</p></section>

  <section id='privacy-changes'><h2>14. Changes and contact</h2><p>We may update this Notice when our practices or legal obligations change. The effective date above will be updated and material changes will be communicated reasonably.</p><p>Privacy enquiries: <ContactLink/>. Information about Nigerian data-protection rights is also available from the <a href='https://ndpc.gov.ng/' target='_blank' rel='noreferrer'>Nigeria Data Protection Commission</a>.</p></section>
</>}

function Refunds(){return <>
  <section id='scope'><h2>1. Scope</h2><p>This policy applies to Individual and Family subscriptions purchased through LearnBridge and to direct school-licence payments unless a signed school quotation or agreement states different refund terms. It does not reduce any refund or remedy required by applicable Nigerian law.</p></section>

  <section id='cancel'><h2>2. Cancelling recurring renewal</h2><p>You can cancel future renewal through the subscription-management option in your LearnBridge account or by contacting <ContactLink/>. Cancellation normally takes effect at the end of the current paid period, and you retain access until that date. Cancel before the next billing date to avoid the next recurring charge.</p><p>Deleting the app, abandoning an account or failing to use lessons does not automatically cancel a Paystack subscription.</p></section>

  <section id='eligible'><h2>3. When a refund may be approved</h2><p>We will investigate and, where verified, ordinarily provide an appropriate refund or correction for:</p><ul><li>a duplicate charge or an amount different from the confirmed checkout price;</li><li>a successful payment that does not activate the purchased access and remains unresolved after you report it;</li><li>a material service failure that prevents delivery of the paid service and cannot be remedied within a reasonable time;</li><li>an unauthorised transaction, subject to identity, account and payment-provider checks;</li><li>a first consumer subscription cancelled within seven calendar days of the initial charge, where the account has not made substantial use of protected content;</li><li>a renewal reported within three calendar days, where the account has not made substantial use of protected content after that renewal.</li></ul><p>“Substantial use” is assessed reasonably from available account and support records, including repeated access to restricted lessons or extensive use of family seats.</p></section>

  <section id='not-eligible'><h2>4. Payments that are normally not refundable</h2><ul><li>unused time after an ordinary cancellation outside the windows above;</li><li>change-of-mind requests after substantial use of protected lessons;</li><li>failure to cancel before a disclosed renewal date;</li><li>loss of access caused by a serious breach of the Terms of Service;</li><li>free public samples, complimentary access or an unpaid school pilot;</li><li>temporary interruptions that are corrected within a reasonable time.</li></ul><p>We will still provide any remedy required by law even where a request falls within this list.</p></section>

  <section id='school-refunds'><h2>5. School licences</h2><p>A custom school quotation states the licence duration, seats and amount. Refunds for a school licence are handled under the accepted quotation or signed agreement. If no special term applies, we will assess the undelivered portion of the service, activated seats, elapsed licence period and any material failure when deciding a reasonable remedy.</p></section>

  <section id='request'><h2>6. How to request a refund</h2><p>Email <ContactLink/> from the address used for the LearnBridge account and include:</p><ul><li>the account owner’s name and email address;</li><li>the Paystack or LearnBridge payment reference;</li><li>the payment date and amount;</li><li>the reason for the request and any supporting evidence.</li></ul><p>Do not send card numbers, CVVs, PINs, passwords or one-time codes. We aim to acknowledge requests within two business days and communicate a decision or request further information within seven business days.</p></section>

  <section id='processing'><h2>7. Refund processing</h2><p>Approved refunds are initiated through Paystack or another appropriate original payment channel. Bank and payment-network processing time is outside LearnBridge’s control. A refund is complete only when the processor confirms it; we will assist with a failed or delayed refund using the payment reference.</p></section>

  <section id='chargebacks'><h2>8. Payment disputes</h2><p>Please contact us first so we can investigate quickly. You retain the right to contact your financial institution or an appropriate consumer authority. We may provide transaction, account and access records to Paystack, a bank or regulator when responding to a lawful dispute.</p></section>

  <section id='statutory'><h2>9. Consumer rights and changes</h2><p>This policy is intended to operate consistently with the Federal Competition and Consumer Protection Act and other applicable Nigerian law. Where the law provides a stronger remedy, that remedy applies. Information about consumer complaints is available from the <a href='https://fccpc.gov.ng/' target='_blank' rel='noreferrer'>Federal Competition and Consumer Protection Commission</a>.</p><p>We may update this policy for future purchases. The version applicable to a payment is the version presented or linked when that payment or renewal was made, subject to mandatory law.</p></section>
</>}

export default function LegalPage({document}:{document:LegalDocument}) {
  const meta=documentMeta[document];
  useEffect(()=>{
    documentTitle(meta.title,meta.description,document);
  },[document,meta.description,meta.title]);
  const sections=document==='terms'?<Terms/>:document==='privacy'?<Privacy/>:<Refunds/>;
  return <div className='legal-shell'>
    <a className='skip-link' href='#legal-content'>Skip to document</a>
    <header className='legal-header'>
      <a className='legal-brand' href='/'><span><GraduationCap size={24}/></span>LearnBridge<b>.</b></a>
      <nav aria-label='Legal documents'>
        <a className={document==='terms'?'active':''} href='/terms'>Terms</a>
        <a className={document==='privacy'?'active':''} href='/privacy'>Privacy</a>
        <a className={document==='refunds'?'active':''} href='/refunds'>Refunds</a>
      </nav>
    </header>
    <main id='legal-content' className='legal-main'>
      <div className='legal-actions'><a href='/'><ArrowLeft size={16}/> Back to LearnBridge</a><button type='button' onClick={()=>window.print()}><Printer size={16}/> Print</button></div>
      <article className='legal-document'>
        <div className='legal-intro'><span>LEARNBRIDGE LEGAL</span><h1>{meta.title}</h1><p>{meta.description}</p><dl><div><dt>Effective date</dt><dd>{effectiveDate}</dd></div><div><dt>Service</dt><dd>learnbridge-app.com</dd></div></dl></div>
        <aside className='legal-summary'><strong>Plain-language summary</strong><p>This page explains the rules and protections that apply to LearnBridge. The numbered sections below are the complete policy.</p><p>Contact: <ContactLink/></p></aside>
        <div className='legal-sections'>{sections}</div>
      </article>
    </main>
    <footer className='legal-footer'><p>LearnBridge educational services for Nigerian and British curriculum pathways.</p><nav aria-label='Footer legal links'><a href='/terms'>Terms of Service</a><a href='/privacy'>Privacy Notice</a><a href='/refunds'>Refund Policy</a></nav></footer>
  </div>;
}

function documentTitle(title:string,description:string,path:string) {
  window.document.title=`${title} | LearnBridge`;
  let meta=window.document.querySelector<HTMLMetaElement>('meta[name="description"]');
  if(!meta){meta=window.document.createElement('meta');meta.name='description';window.document.head.append(meta);}
  meta.content=description;
  let canonical=window.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if(!canonical){canonical=window.document.createElement('link');canonical.rel='canonical';window.document.head.append(canonical);}
  canonical.href=`${window.location.origin}/${path}`;
}
