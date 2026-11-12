import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Building2, CheckCircle2, Clipboard, CreditCard, KeyRound, LogIn, ShieldCheck, UserRound, Users } from 'lucide-react';
import { api, type ApiError } from './api';
import { useAuth, type AuthUser } from './AuthContext';

type Mode='Plans'|'For Schools'|'Account'|'School'|'Platform'|'Join School';
type Props={mode:Mode;onNavigate:(page:string)=>void};
type Member={id:string;email:string;displayName:string;role:string;active:boolean;createdAt:string};
type Payment={id:string;reference:string;amountKobo:number;currency:string;status:string;paidAt:string|null;createdAt:string};
type Quote={id:string;title:string;amountKobo:number;currency:string;billingPeriod:string;durationDays:number;seatLimit:number;tierCode:string|null;campusCount:number;onboardingMode:string;onboardingFeeKobo:number;unlimitedTeachers:boolean;unlimitedAdministrators:boolean;notes:string;status:string;expiresAt:string;createdAt:string};
type SchoolDashboardData={
  school:{id:string;name:string;accountType:string;status:string;seatLimit:number;seatsUsed:number;licenceTier:string|null;campusCount:number;unlimitedTeachers:boolean;unlimitedAdministrators:boolean;onboardingMode:string;licenceStartAt:string|null;licenceEndAt:string|null;billingPeriod:string|null;entitlement:{active:boolean;reason:string}};
  members?:Member[];
  invitations?:Array<{id:string;role:string;email:string;maxUses:number;useCount:number;expiresAt:string}>;
  quotes?:Quote[];
  payments?:Array<Payment&{quoteId:string}>;
};
type ConsumerPlan={package:'individual'|'family';billingCycle:'monthly'|'annual';available:boolean;name:string;amountKobo:number|null;currency:string};
type Subscription={id:string;package:'individual'|'family';billingCycle:'monthly'|'annual';amountKobo:number;currency:string;status:string;providerSubscriptionCode:string|null;nextPaymentAt:string|null;lastPaymentAt:string|null;createdAt:string};
type ConsumerDashboardData={
  account:{id:string;name:string;accountType:'individual'|'family';status:string;seatLimit:number;seatsUsed:number;licenceStartAt:string|null;licenceEndAt:string|null;billingPeriod:string|null;entitlement:{active:boolean;reason:string}};
  members:Member[];
  invitations:Array<{id:string;email:string;expiresAt:string}>;
  subscriptions:Subscription[];
  payments:Payment[];
};
type Pilot={id:string;schoolName:string;adminName:string;adminEmail:string;phone:string;estimatedLearners:number;message:string;status:string;schoolId:string|null;createdAt:string};
type LicenceTier={code:string;label:string;seatLimit:number|null;termlyAmountNaira:number|null;sessionAmountNaira:number|null;multiCampus:boolean};
type PlatformOverview={
  schools:Array<{id:string;name:string;slug:string;status:string;seatLimit:number;licenceTier:string|null;campusCount:number;onboardingMode:string;billingPeriod:string|null;unlimitedTeachers:boolean;unlimitedAdministrators:boolean;licenceEndAt:string|null;seatsUsed:number;teachersUsed:number;administratorsUsed:number}>;
  consumers:Array<{id:string;name:string;accountType:string;status:string;licenceEndAt:string|null;ownerEmail:string;ownerName:string;learnersUsed:number}>;
  pendingPilots:number;revenueKobo:number;schoolRevenueKobo:number;consumerRevenueKobo:number;paymentMode:'test'|'live'|'not-configured';licenceTiers:LicenceTier[];
};

const money=(kobo:number|null|undefined,currency='NGN')=>kobo==null?'Set in Paystack':new Intl.NumberFormat('en-NG',{style:'currency',currency,maximumFractionDigits:0}).format(kobo/100);
const date=(value:string|null|undefined)=>value?new Intl.DateTimeFormat('en-NG',{dateStyle:'medium'}).format(new Date(value)):'Not set';
const errorText=(error:unknown)=>(error as ApiError)?.response?.data?.error||(error as Error)?.message||'The request could not be completed.';
const copy=(value:string)=>navigator.clipboard?.writeText(value);
const destination=(user:AuthUser)=>user.role==='super_admin'?'Platform':user.school?.accountType==='individual'||user.school?.accountType==='family'?'Account':'School';
const resetTokenFromLocation=()=>new URLSearchParams(window.location.hash.replace(/^#/, '')).get('password-reset')||'';

function LoginPanel({onDone,title='Sign in to LearnBridge'}:{onDone:(user:AuthUser)=>void;title?:string}) {
  const {login}=useAuth();
  const initialResetToken=resetTokenFromLocation();
  const [mode,setMode]=useState<'login'|'forgot'|'reset'>(initialResetToken?'reset':'login');
  const [resetToken,setResetToken]=useState(initialResetToken);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [confirmPassword,setConfirmPassword]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent) {
    event.preventDefault();setBusy(true);setError('');setNotice('');
    try { onDone(await login(email,password)); }
    catch(error){setError(errorText(error));}
    finally{setBusy(false);}
  }
  async function requestReset(event:FormEvent) {
    event.preventDefault();setBusy(true);setError('');setNotice('');
    try { const {data}=await api.post('/api/auth/forgot-password',{email});setNotice(data.message); }
    catch(error){setError(errorText(error));}
    finally{setBusy(false);}
  }
  async function resetPassword(event:FormEvent) {
    event.preventDefault();setError('');setNotice('');
    if(newPassword!==confirmPassword){setError('The new passwords do not match.');return;}
    setBusy(true);
    try {
      const {data}=await api.post('/api/auth/reset-password',{token:resetToken,newPassword});
      window.history.replaceState({},'',`${window.location.pathname}${window.location.search}`);
      setResetToken('');setNewPassword('');setConfirmPassword('');setNotice(data.message);setMode('login');
    } catch(error){setError(errorText(error));}
    finally{setBusy(false);}
  }
  if(mode==='forgot')return <form className='commercial-card portal-form auth-panel' onSubmit={requestReset}>
    <span className='portal-icon'><KeyRound size={22}/></span><h2>Reset your password</h2>
    <p>Enter the email address used for your LearnBridge account. If the account is active, we will email a secure reset link.</p>
    <label>Email address<input type='email' autoComplete='email' required value={email} onChange={event=>setEmail(event.target.value)}/></label>
    {notice&&<p className='form-success' role='status'>{notice}</p>}{error&&<p className='form-error' role='alert'>{error}</p>}
    <button className='primary' disabled={busy}>{busy?'Sending request...':'Send reset link'}</button>
    <button type='button' className='text-button auth-return' onClick={()=>{setMode('login');setError('');setNotice('');}}>Return to sign in</button>
  </form>;
  if(mode==='reset')return <form className='commercial-card portal-form auth-panel' onSubmit={resetPassword}>
    <span className='portal-icon'><KeyRound size={22}/></span><h2>Choose a new password</h2>
    <p>This secure link can be used once. Your other signed-in sessions will be closed after the password changes.</p>
    <label>New password<input type='password' autoComplete='new-password' minLength={12} maxLength={200} required value={newPassword} onChange={event=>setNewPassword(event.target.value)}/><small>Use at least 12 characters.</small></label>
    <label>Confirm new password<input type='password' autoComplete='new-password' minLength={12} maxLength={200} required value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)}/></label>
    {error&&<p className='form-error' role='alert'>{error}</p>}
    <button className='primary' disabled={busy}>{busy?'Resetting password...':'Reset password'}</button>
    <button type='button' className='text-button auth-return' onClick={()=>{window.history.replaceState({},'',`${window.location.pathname}${window.location.search}`);setMode('login');setError('');}}>Return to sign in</button>
  </form>;
  return <form className='commercial-card portal-form' onSubmit={submit}>
    <span className='portal-icon'><LogIn size={22}/></span><h2>{title}</h2>
    <p>Use your individual, family or school account details.</p>
    <label>Email address<input type='email' autoComplete='username' required value={email} onChange={event=>setEmail(event.target.value)}/></label>
    <label>Password<input type='password' autoComplete='current-password' required value={password} onChange={event=>setPassword(event.target.value)}/></label>
    <div className='auth-help'><button type='button' className='text-button' onClick={()=>{setMode('forgot');setError('');setNotice('');}}>Forgot your password?</button></div>
    {notice&&<p className='form-success' role='status'>{notice}</p>}{error&&<p className='form-error' role='alert'>{error}</p>}
    <button className='primary' disabled={busy}>{busy?'Signing in...':'Sign in'}</button>
  </form>;
}

function PasswordPanel({onDone}:{onDone:()=>void}) {
  const {logout}=useAuth();
  const [currentPassword,setCurrentPassword]=useState('');
  const [newPassword,setNewPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent){
    event.preventDefault();setError('');
    if(newPassword!==confirm){setError('The new passwords do not match.');return;}
    setBusy(true);
    try{await api.post('/api/auth/change-password',{currentPassword,newPassword});await logout();onDone();}
    catch(error){setError(errorText(error));setBusy(false);}
  }
  return <form className='commercial-card portal-form password-panel' onSubmit={submit}>
    <h2>Change password</h2><p>You will be signed out on every device after the password is changed.</p>
    <label>Current password<input type='password' autoComplete='current-password' required value={currentPassword} onChange={event=>setCurrentPassword(event.target.value)}/></label>
    <label>New password<input type='password' autoComplete='new-password' minLength={12} required value={newPassword} onChange={event=>setNewPassword(event.target.value)}/></label>
    <label>Confirm new password<input type='password' autoComplete='new-password' minLength={12} required value={confirm} onChange={event=>setConfirm(event.target.value)}/></label>
    {error&&<p className='form-error' role='alert'>{error}</p>}<button className='outline' disabled={busy}>{busy?'Changing password...':'Change password'}</button>
  </form>;
}

function PlansPage({onNavigate}:{onNavigate:(page:string)=>void}) {
  const {user,refresh}=useAuth();
  const [plans,setPlans]=useState<ConsumerPlan[]>([]);
  const [policies,setPolicies]=useState({termsUrl:'',privacyUrl:'',refundPolicyUrl:''});
  const [cycle,setCycle]=useState<'monthly'|'annual'>('monthly');
  const [selected,setSelected]=useState<'individual'|'family'|null>(null);
  const [form,setForm]=useState({displayName:'',email:'',password:'',confirm:'',termsAccepted:false});
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  useEffect(()=>{api.get('/api/consumer/plans').then(({data})=>{setPlans(data.plans);setPolicies({termsUrl:data.termsUrl||'',privacyUrl:data.privacyUrl||'',refundPolicyUrl:data.refundPolicyUrl||''});}).catch(error=>setError(errorText(error)));},[]);
  const planFor=(packageName:'individual'|'family')=>plans.find(plan=>plan.package===packageName&&plan.billingCycle===cycle);
  async function register(event:FormEvent){
    event.preventDefault();setError('');setNotice('');
    if(!selected)return;
    if(form.password!==form.confirm){setError('The passwords do not match.');return;}
    setBusy(true);
    try{
      const {data}=await api.post('/api/consumer/register',{package:selected,billingCycle:cycle,displayName:form.displayName,email:form.email,password:form.password,termsAccepted:form.termsAccepted});
      await refresh();
      if(data.checkout?.authorizationUrl){window.location.assign(data.checkout.authorizationUrl);return;}
      setNotice(data.checkoutError||'Your account was created. Open the account dashboard to start checkout.');
    }catch(error){setError(errorText(error));}
    finally{setBusy(false);}
  }
  if(resetTokenFromLocation())return <div className='commercial-page narrow-portal'><LoginPanel onDone={next=>onNavigate(destination(next))}/></div>;
  return <div className='commercial-page'>
    <section className='commercial-hero packages-hero'>
      <div><span className='eyebrow'>CHOOSE HOW YOU LEARN</span><h1>LearnBridge for one learner, a family or a school.</h1><p>Explore Topic 1 samples before paying. Individual and family packages renew through Paystack monthly or annually; schools receive a custom termly or annual quotation.</p></div>
      <div className='pilot-summary'><strong>Public samples</strong><span>No consumer trial</span><strong>1 or 5 learners</strong><span>Individual and family options</span><strong>Secure billing</strong><span>Paystack-hosted checkout</span></div>
    </section>
    <div className='billing-toggle' aria-label='Billing cycle'><button className={cycle==='monthly'?'chosen':''} onClick={()=>setCycle('monthly')}>Monthly</button><button className={cycle==='annual'?'chosen':''} onClick={()=>setCycle('annual')}>Annual</button></div>
    <section className='package-grid'>
      <article className={`package-card ${selected==='individual'?'selected':''}`}><span className='portal-icon'><UserRound/></span><h2>Individual</h2><p>One learner account with full lesson notes, practice, progress and bookmarks while subscribed.</p><strong className='package-price'>{money(planFor('individual')?.amountKobo,planFor('individual')?.currency)}</strong><small>per {cycle==='annual'?'year':'month'}</small><ul><li>One learner login</li><li>All supported subjects and classes</li><li>Monthly or annual renewal</li></ul><button className='primary' disabled={!planFor('individual')?.available||Boolean(user)} onClick={()=>setSelected('individual')}>{planFor('individual')?.available?'Choose individual':'Plan not configured'}</button></article>
      <article className={`package-card featured ${selected==='family'?'selected':''}`}><span className='portal-icon'><Users/></span><h2>Family</h2><p>A parent or guardian account plus up to five separately managed learner profiles.</p><strong className='package-price'>{money(planFor('family')?.amountKobo,planFor('family')?.currency)}</strong><small>per {cycle==='annual'?'year':'month'}</small><ul><li>Up to five learner profiles</li><li>Parent-managed invitations</li><li>Monthly or annual renewal</li></ul><button className='primary' disabled={!planFor('family')?.available||Boolean(user)} onClick={()=>setSelected('family')}>{planFor('family')?.available?'Choose family':'Plan not configured'}</button></article>
      <article className='package-card'><span className='portal-icon'><Building2/></span><h2>School</h2><p>A configurable 30-day pilot for up to 50 learners, followed by a tiered school quotation.</p><strong className='package-price'>From ₦150,000</strong><small>per term</small><ul><li>Unlimited teacher and administrator accounts</li><li>Controlled active-learner seats</li><li>Termly or full-session licensing</li><li>Remote onboarding included</li></ul><button className='outline' onClick={()=>onNavigate('For Schools')}>View school licensing</button></article>
    </section>
    {user?<section className='commercial-card signed-in-card'><CheckCircle2/><h2>You are already signed in</h2><p>{user.displayName}<br/><strong>{user.school?.name||'LearnBridge platform'}</strong></p><button className='primary' onClick={()=>onNavigate(destination(user))}>Open dashboard</button></section>:
      <div className='commercial-columns'>
        {selected?<form className='commercial-card portal-form' onSubmit={register}>
          <span className='portal-icon'>{selected==='family'?<Users/>:<UserRound/>}</span><h2>Create {selected} account</h2><p>{money(planFor(selected)?.amountKobo,planFor(selected)?.currency)} per {cycle==='annual'?'year':'month'}. Paystack will collect the first payment and create the recurring subscription.</p>
          <label>Full name<input required minLength={2} autoComplete='name' value={form.displayName} onChange={event=>setForm({...form,displayName:event.target.value})}/></label>
          <label>Email address<input required type='email' autoComplete='email' value={form.email} onChange={event=>setForm({...form,email:event.target.value})}/></label>
          <div className='form-row'><label>Password<input required type='password' minLength={12} autoComplete='new-password' value={form.password} onChange={event=>setForm({...form,password:event.target.value})}/><small>Use at least 12 characters.</small></label><label>Confirm password<input required type='password' minLength={12} autoComplete='new-password' value={form.confirm} onChange={event=>setForm({...form,confirm:event.target.value})}/></label></div>
          <label className='terms-check'><input type='checkbox' required checked={form.termsAccepted} onChange={event=>setForm({...form,termsAccepted:event.target.checked})}/><span>I agree to the {policies.termsUrl?<a href={policies.termsUrl} target='_blank' rel='noreferrer'>Terms of Service</a>:'Terms of Service'} and {policies.privacyUrl?<a href={policies.privacyUrl} target='_blank' rel='noreferrer'>Privacy Notice</a>:'Privacy Notice'}{policies.refundPolicyUrl&&<> and have read the <a href={policies.refundPolicyUrl} target='_blank' rel='noreferrer'>Refund Policy</a></>}.</span></label>
          {notice&&<p className='form-success' role='status'>{notice} <button type='button' className='text-button' onClick={()=>onNavigate('Account')}>Open account dashboard</button></p>}{error&&<p className='form-error' role='alert'>{error}</p>}
          <button className='primary' disabled={busy}>{busy?'Creating account...':'Continue to secure checkout'}</button><small>No consumer trial is started. Until payment succeeds, the account can open public Topic 1 samples only.</small>
        </form>:<section className='commercial-card package-prompt'><CreditCard/><h2>Select a package</h2><p>Choose Individual or Family above to create an account. Prices are read directly from the Paystack plans configured by the LearnBridge owner.</p></section>}
        <LoginPanel title='Already have an account?' onDone={next=>onNavigate(destination(next))}/>
      </div>}
  </div>;
}

function ForSchools({onNavigate}:{onNavigate:(page:string)=>void}) {
  const {user}=useAuth();
  const [form,setForm]=useState({schoolName:'',adminName:'',adminEmail:'',phone:'',estimatedLearners:'',message:''});
  const [status,setStatus]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setStatus('');setError('');try{const {data}=await api.post('/api/pilot-requests',{...form,estimatedLearners:Number(form.estimatedLearners)});setStatus(data.message);setForm({schoolName:'',adminName:'',adminEmail:'',phone:'',estimatedLearners:'',message:''});}catch(error){setError(errorText(error));}finally{setBusy(false);}}
  return <div className='commercial-page'>
    <section className='commercial-hero'><div><span className='eyebrow'>LEARNBRIDGE FOR SCHOOLS</span><h1>Give every learner structured lesson support.</h1><p>Start with a supervised 30-day pilot for up to 50 learners. After the pilot, choose a termly or full-session licence matched to your active learner count and campus scope.</p><div className='commercial-actions'><a className='primary button-link' href='#pilot'>Request a school pilot</a><button className='outline' onClick={()=>onNavigate('Plans')}>Compare all packages</button>{user&&<button className='outline' onClick={()=>onNavigate(destination(user))}>Open dashboard</button>}</div></div><div className='pilot-summary'><strong>30 days</strong><span>Free supervised evaluation</span><strong>Up to 50 learners</strong><span>Administrator-configured pilot</span><strong>Save 20%</strong><span>Full-session value</span></div></section>
    <section className='commercial-benefits'><article><ShieldCheck/><h3>Controlled access</h3><p>School-managed accounts, learner-seat limits and automatic licence expiry protect paid content.</p></article><article><Users/><h3>Unlimited staff accounts</h3><p>Invite as many teachers and school administrators as needed. Only active students consume learner seats.</p></article><article><CreditCard/><h3>Flexible school billing</h3><p>Choose termly or full-session licensing, with remote onboarding included and onsite training quoted separately.</p></article></section>
    <div className='commercial-columns' id='pilot'><form className='commercial-card portal-form' onSubmit={submit}><span className='portal-icon'><Building2 size={22}/></span><h2>Request the 30-day pilot</h2><p>A LearnBridge administrator will review the request, set the learner allowance and issue the school administrator invitation.</p><label>School name<input required minLength={3} value={form.schoolName} onChange={event=>setForm({...form,schoolName:event.target.value})}/></label><div className='form-row'><label>Contact name<input required value={form.adminName} onChange={event=>setForm({...form,adminName:event.target.value})}/></label><label>Work email<input type='email' required value={form.adminEmail} onChange={event=>setForm({...form,adminEmail:event.target.value})}/></label></div><div className='form-row'><label>Phone number<input type='tel' required value={form.phone} onChange={event=>setForm({...form,phone:event.target.value})}/></label><label>Estimated learners<input type='number' min='1' max='100000' required value={form.estimatedLearners} onChange={event=>setForm({...form,estimatedLearners:event.target.value})}/></label></div><label>Anything we should know?<textarea rows={3} maxLength={1000} value={form.message} onChange={event=>setForm({...form,message:event.target.value})}/></label>{status&&<p className='form-success' role='status'>{status}</p>}{error&&<p className='form-error' role='alert'>{error}</p>}<button className='primary' disabled={busy}>{busy?'Submitting...':'Submit pilot request'}</button><small>Submitting this form does not create a payment or start the pilot automatically. There is no automatic charge when the pilot ends.</small></form>
      {user?<section className='commercial-card signed-in-card'><CheckCircle2/><h2>You are signed in</h2><p>{user.displayName}<br/><strong>{user.school?.name||'LearnBridge platform'}</strong></p><button className='primary' onClick={()=>onNavigate(destination(user))}>Open dashboard</button></section>:<LoginPanel onDone={next=>onNavigate(destination(next))}/>}</div>
  </div>;
}

function JoinAccount({onNavigate}:{onNavigate:(page:string)=>void}) {
  const {acceptInvitation}=useAuth();
  const code=new URLSearchParams(window.location.search).get('join')||'';
  const [invite,setInvite]=useState<{role:string;email:string;accountName:string;accountType:string;expiresAt:string}|null>(null);
  const [form,setForm]=useState({displayName:'',email:'',password:'',confirm:''});const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  useEffect(()=>{if(!code){setError('The invitation link is incomplete.');return;}api.get(`/api/invitations/${encodeURIComponent(code)}`).then(({data})=>{setInvite(data);setForm(value=>({...value,email:data.email||''}));}).catch(error=>setError(errorText(error)));},[code]);
  async function submit(event:FormEvent){event.preventDefault();setError('');if(form.password!==form.confirm){setError('The passwords do not match.');return;}setBusy(true);try{const next=await acceptInvitation({code,displayName:form.displayName,email:form.email,password:form.password});window.history.replaceState({},'',window.location.pathname);onNavigate(destination(next));}catch(error){setError(errorText(error));}finally{setBusy(false);}}
  const family=invite?.accountType==='family';
  return <div className='commercial-page narrow-portal'><form className='commercial-card portal-form' onSubmit={submit}><span className='portal-icon'><KeyRound size={22}/></span><h1>{family?'Join your family':'Join your school'}</h1>{invite&&<p>You have been invited to <strong>{invite.accountName}</strong> as {invite.role.replace('_',' ')}. This invitation expires {date(invite.expiresAt)}.</p>}<label>Full name<input required minLength={2} autoComplete='name' value={form.displayName} onChange={event=>setForm({...form,displayName:event.target.value})}/></label><label>Email address<input required type='email' readOnly={Boolean(invite?.email)} autoComplete='email' value={form.email} onChange={event=>setForm({...form,email:event.target.value})}/></label><label>Create password<input required type='password' minLength={10} autoComplete='new-password' value={form.password} onChange={event=>setForm({...form,password:event.target.value})}/><small>Use at least 10 characters.</small></label><label>Confirm password<input required type='password' minLength={10} autoComplete='new-password' value={form.confirm} onChange={event=>setForm({...form,confirm:event.target.value})}/></label>{error&&<p className='form-error' role='alert'>{error}</p>}<button className='primary' disabled={busy||!invite}>{busy?'Creating account...':family?'Create learner profile':'Create school account'}</button></form></div>;
}

function ConsumerDashboard({onNavigate}:{onNavigate:(page:string)=>void}) {
  const {user,refresh}=useAuth();
  const [dashboard,setDashboard]=useState<ConsumerDashboardData|null>(null);const [plans,setPlans]=useState<ConsumerPlan[]>([]);
  const [error,setError]=useState('');const [notice,setNotice]=useState('');const [inviteEmail,setInviteEmail]=useState('');const [inviteResult,setInviteResult]=useState('');
  async function load(){try{const [account,planData]=await Promise.all([api.get('/api/consumer/dashboard'),api.get('/api/consumer/plans')]);setDashboard(account.data);setPlans(planData.data.plans);setError('');if(Boolean(account.data?.account?.entitlement?.active)!==Boolean(user?.entitlement.active))await refresh();}catch(error){setError(errorText(error));}}
  useEffect(()=>{if(user?.role==='account_owner')void load();},[user?.id]);
  useEffect(()=>{const params=new URLSearchParams(window.location.search);const reference=params.get('reference')||params.get('trxref');if(params.get('payment')!=='consumer'||!reference||user?.role!=='account_owner')return;setNotice('Verifying your subscription payment...');api.post('/api/billing/verify',{reference}).then(async()=>{setNotice('Payment verified. Full lesson access is active.');window.history.replaceState({},'',window.location.pathname);await refresh();await load();}).catch(error=>setError(errorText(error)));},[user?.id]);
  if(!user)return <div className='commercial-page narrow-portal'><LoginPanel onDone={next=>onNavigate(destination(next))}/></div>;
  if(user.role==='student'&&user.school?.accountType==='family')return <div className='commercial-page'><div className='portal-title'><div><span className='eyebrow'>FAMILY LEARNER</span><h1>{user.displayName}</h1><p>{user.school.name}</p></div><span className={`licence-badge ${user.entitlement.active?'active':'inactive'}`}>{user.entitlement.active?'Access active':'Samples only'}</span></div><section className='commercial-card'><h2>Your LearnBridge access</h2><p>{user.entitlement.active?'You can open the complete lesson library through your family subscription.':'The family subscription is not active. You can still open the public Topic 1 sample in every subject.'}</p></section><PasswordPanel onDone={()=>onNavigate('Plans')}/></div>;
  if(user.role!=='account_owner')return <div className='commercial-page'><p className='notice-neutral'>This account is not linked to an individual or family package.</p><button className='primary' onClick={()=>onNavigate(destination(user))}>Open your dashboard</button></div>;
  async function start(billingCycle:'monthly'|'annual'){try{setError('');setNotice('Opening secure Paystack checkout...');const {data}=await api.post('/api/consumer/subscription/initialize',{billingCycle});window.location.assign(data.authorizationUrl);}catch(error){setNotice('');setError(errorText(error));}}
  async function manage(){try{setError('');const {data}=await api.post('/api/consumer/subscription/manage');window.location.assign(data.url);}catch(error){setError(errorText(error));}}
  async function createInvite(event:FormEvent){event.preventDefault();setError('');setInviteResult('');try{const {data}=await api.post('/api/consumer/invitations',{email:inviteEmail,expiresInDays:14});setInviteResult(data.invitationUrl);setInviteEmail('');await load();}catch(error){setError(errorText(error));}}
  async function changeMember(member:Member){try{await api.patch(`/api/consumer/members/${member.id}`,{active:!member.active});await load();}catch(error){setError(errorText(error));}}
  const current=dashboard?.subscriptions[0];const learners=dashboard?.members.filter(member=>member.role==='student')||[];const packageName=dashboard?.account.accountType||user.school?.accountType;
  return <div className='commercial-page'>
    <div className='portal-title'><div><span className='eyebrow'>{packageName?.toUpperCase()} PACKAGE</span><h1>{user.school?.name}</h1><p>Account owner: {user.displayName}</p></div><span className={`licence-badge ${dashboard?.account.entitlement.active?'active':'inactive'}`}>{dashboard?.account.entitlement.active?'Access active':'Samples only'}</span></div>
    {notice&&<p className='form-success' role='status'>{notice}</p>}{error&&<p className='form-error' role='alert'>{error}</p>}
    {dashboard&&<><section className='portal-stats'><article><strong>{packageName==='family'?`${dashboard.account.seatsUsed} / 5`:'1'}</strong><span>{packageName==='family'?'Learner profiles used':'Learner account'}</span></article><article><strong>{current?.status||dashboard.account.status}</strong><span>Subscription status</span></article><article><strong>{date(dashboard.account.licenceEndAt)}</strong><span>Paid access through</span></article></section>
      <div className='dashboard-grid'>
        <section className='commercial-card'><h2>Subscription and billing</h2>{current?<div className='subscription-summary'><strong>{current.package} · {current.billingCycle}</strong><span>{money(current.amountKobo,current.currency)}</span><p>Last payment: {date(current.lastPaymentAt)}<br/>Next scheduled payment: {date(current.nextPaymentAt)}</p></div>:<p>No subscription checkout has been started.</p>}{current?.providerSubscriptionCode&&['active','non-renewing','attention'].includes(current.status)?<button className='outline' onClick={()=>void manage()}>Manage payment method or renewal</button>:<div className='subscription-actions'>{(['monthly','annual'] as const).map(cycle=>{const plan=plans.find(item=>item.package===packageName&&item.billingCycle===cycle);return <button key={cycle} className='primary' disabled={!plan?.available} onClick={()=>void start(cycle)}>Start {cycle} · {money(plan?.amountKobo,plan?.currency)}</button>;})}</div>}<small className='billing-note'>Paystack hosts payment details. LearnBridge does not store full card details.</small></section>
        {packageName==='family'&&<section className='commercial-card'><h2>Invite a learner</h2><p>Family packages support up to five active learner profiles. Each learner signs in with a separate email address.</p><form className='portal-form compact-form' onSubmit={createInvite}><label>Learner email<input type='email' required value={inviteEmail} onChange={event=>setInviteEmail(event.target.value)}/></label><button className='primary' disabled={!dashboard.account.entitlement.active||dashboard.account.seatsUsed>=5}>Create learner invitation</button></form>{inviteResult&&<div className='copy-result'><code>{inviteResult}</code><button className='outline' onClick={()=>void copy(inviteResult)}><Clipboard size={14}/> Copy</button></div>}</section>}
        {packageName==='family'&&<section className='commercial-card dashboard-wide'><h2>Family learner profiles</h2>{!learners.length?<p>No learner profile has joined yet.</p>:<div className='data-table'><div className='data-row heading'><span>Name</span><span>Role</span><span>Email</span><span>Status</span></div>{learners.map(member=><div className='data-row' key={member.id}><span>{member.displayName}</span><span>Learner</span><span>{member.email}</span><button className='text-button' onClick={()=>void changeMember(member)}>{member.active?'Deactivate':'Reactivate'}</button></div>)}</div>}</section>}
        <section className='commercial-card dashboard-wide'><h2>Payment history</h2>{!dashboard.payments.length?<p>No successful payment has been recorded yet.</p>:<div className='data-table'><div className='data-row payment-row heading'><span>Date</span><span>Reference</span><span>Amount</span><span>Status</span></div>{dashboard.payments.map(payment=><div className='data-row payment-row' key={payment.id}><span>{date(payment.paidAt||payment.createdAt)}</span><code>{payment.reference}</code><span>{money(payment.amountKobo,payment.currency)}</span><span>{payment.status}</span></div>)}</div>}</section>
      </div><PasswordPanel onDone={()=>onNavigate('Plans')}/></>}
  </div>;
}

function SchoolDashboard({onNavigate}:{onNavigate:(page:string)=>void}) {
  const {user,refresh}=useAuth();
  const [dashboard,setDashboard]=useState<SchoolDashboardData|null>(null);const [error,setError]=useState('');const [notice,setNotice]=useState('');
  const [invite,setInvite]=useState({role:'student',email:'',maxUses:1,expiresInDays:14});const [inviteResult,setInviteResult]=useState('');
  async function load(){try{const {data}=await api.get('/api/school/dashboard');setDashboard(data);setError('');}catch(error){setError(errorText(error));}}
  useEffect(()=>{if(user?.school?.accountType==='school')void load();},[user?.school?.id]);
  useEffect(()=>{const params=new URLSearchParams(window.location.search);const reference=params.get('reference')||params.get('trxref');if(params.get('payment')!=='callback'||!reference||user?.role!=='school_admin')return;setNotice('Verifying your payment...');api.post('/api/billing/verify',{reference}).then(async()=>{setNotice('Payment verified. Your school licence is active.');window.history.replaceState({},'',window.location.pathname);await refresh();await load();}).catch(error=>setError(errorText(error)));},[user?.id]);
  if(!user)return <div className='commercial-page narrow-portal'><LoginPanel onDone={next=>onNavigate(destination(next))}/></div>;
  if(user.role==='super_admin'||user.role==='account_owner')return <div className='commercial-page'><p className='notice-neutral'>Open the dashboard assigned to this account.</p><button className='primary' onClick={()=>onNavigate(destination(user))}>Open dashboard</button></div>;
  if(!user.school)return <p className='notice'>This account is not linked to a school.</p>;
  async function createInvite(event:FormEvent){event.preventDefault();setError('');setInviteResult('');try{const {data}=await api.post('/api/school/invitations',invite);setInviteResult(data.invitationUrl);await load();}catch(error){setError(errorText(error));}}
  async function changeMember(member:Member){try{await api.patch(`/api/school/members/${member.id}`,{active:!member.active});await load();}catch(error){setError(errorText(error));}}
  async function pay(quoteId:string){try{setNotice('Opening secure Paystack checkout...');const {data}=await api.post('/api/billing/initialize',{quoteId});window.location.assign(data.authorizationUrl);}catch(error){setNotice('');setError(errorText(error));}}
  return <div className='commercial-page'><div className='portal-title'><div><span className='eyebrow'>SCHOOL LICENCE</span><h1>{user.school.name}</h1><p>Signed in as {user.displayName} · {user.role.replace('_',' ')}</p></div><span className={`licence-badge ${dashboard?.school.entitlement.active?'active':'inactive'}`}>{dashboard?.school.entitlement.active?'Access active':'Access inactive'}</span></div>{notice&&<p className='form-success' role='status'>{notice}</p>}{error&&<p className='form-error' role='alert'>{error}</p>}{dashboard&&<><section className='portal-stats'><article><strong>{dashboard.school.seatsUsed} / {dashboard.school.seatLimit}</strong><span>Learner seats used</span></article><article><strong>{dashboard.school.licenceTier||dashboard.school.status}</strong><span>Licence tier</span></article><article><strong>{date(dashboard.school.licenceEndAt)}</strong><span>Access end date</span></article></section><section className='licence-inclusions'><span>Unlimited teachers</span><span>Unlimited administrators</span><span>{dashboard.school.campusCount} {dashboard.school.campusCount===1?'campus':'campuses'}</span><span>{dashboard.school.onboardingMode==='remote'?'Remote onboarding included':`${dashboard.school.onboardingMode} onboarding`}</span></section>{user.role!=='school_admin'&&<section className='commercial-card'><h2>Your school access</h2><p>{dashboard.school.entitlement.active?'Your account can open all lesson notes included in LearnBridge.':'Ask your school administrator about renewing the school licence.'}</p></section>}{user.role==='school_admin'&&<div className='dashboard-grid'><section className='commercial-card'><h2>Invite administrators, teachers and students</h2><p>Administrator and teacher accounts are unlimited and do not consume learner seats. Administrator invitations require an email address. Copy each generated link immediately; it is shown only once.</p><form className='portal-form compact-form' onSubmit={createInvite}><label>Account type<select value={invite.role} onChange={event=>setInvite({...invite,role:event.target.value,email:event.target.value==='school_admin'?invite.email:invite.email,maxUses:event.target.value==='school_admin'?1:invite.maxUses})}><option value='student'>Student</option><option value='teacher'>Teacher</option><option value='school_admin'>School administrator</option></select></label><label>Email {invite.role==='school_admin'?'(required)':'(optional)'}<input type='email' required={invite.role==='school_admin'} value={invite.email} onChange={event=>setInvite({...invite,email:event.target.value,maxUses:event.target.value?1:invite.maxUses})}/></label><label>Uses<input type='number' min='1' max='100' disabled={Boolean(invite.email)||invite.role==='school_admin'} value={invite.maxUses} onChange={event=>setInvite({...invite,maxUses:Number(event.target.value)})}/></label><button className='primary'>Create invitation</button></form>{inviteResult&&<div className='copy-result'><code>{inviteResult}</code><button className='outline' onClick={()=>void copy(inviteResult)}><Clipboard size={14}/> Copy</button></div>}</section><section className='commercial-card'><h2>Quotations and payment</h2>{!dashboard.quotes?.length?<p>No quotation has been issued. Contact LearnBridge when your school is ready to continue after the pilot.</p>:<div className='quote-list'>{dashboard.quotes.map(quote=><article key={quote.id}><div><strong>{quote.title}</strong><span>{quote.tierCode||'custom'} · {quote.seatLimit} learner seats · {quote.campusCount} {quote.campusCount===1?'campus':'campuses'} · {quote.billingPeriod} · expires {date(quote.expiresAt)}</span></div><b>{money(quote.amountKobo,quote.currency)}</b>{quote.status==='sent'&&new Date(quote.expiresAt)>new Date()?<button className='primary' onClick={()=>void pay(quote.id)}>Pay securely</button>:<span className='status-chip'>{quote.status}</span>}</article>)}</div>}</section><section className='commercial-card dashboard-wide'><h2>School members</h2><div className='data-table'><div className='data-row heading'><span>Name</span><span>Role</span><span>Email</span><span>Status</span></div>{dashboard.members?.map(member=><div className='data-row' key={member.id}><span>{member.displayName}</span><span>{member.role.replace('_',' ')}</span><span>{member.email}</span><button className='text-button' disabled={member.id===user.id} onClick={()=>void changeMember(member)}>{member.active?'Deactivate':'Reactivate'}</button></div>)}</div></section><section className='commercial-card dashboard-wide'><h2>Payment history</h2>{!dashboard.payments?.length?<p>No payment has been recorded for this school.</p>:<div className='data-table'><div className='data-row payment-row heading'><span>Date</span><span>Reference</span><span>Amount</span><span>Status</span></div>{dashboard.payments.map(payment=><div className='data-row payment-row' key={payment.id}><span>{date(payment.paidAt||payment.createdAt)}</span><code>{payment.reference}</code><span>{money(payment.amountKobo,payment.currency)}</span><span>{payment.status}</span></div>)}</div>}</section></div>}<PasswordPanel onDone={()=>onNavigate('Plans')}/></>}</div>;
}

function PlatformDashboard({onNavigate}:{onNavigate:(page:string)=>void}) {
  const {user}=useAuth();
  const [overview,setOverview]=useState<PlatformOverview|null>(null);
  const [pilots,setPilots]=useState<Pilot[]>([]);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [approvalLink,setApprovalLink]=useState('');
  const [pilot,setPilot]=useState({pilotDays:'30',pilotSeats:'50',campusCount:'1'});
  const [quote,setQuote]=useState({
    schoolId:'',tierCode:'starter',title:'',amountNaira:'150000',billingPeriod:'termly',
    seatLimit:'150',campusCount:'1',durationDays:'120',expiresInDays:'14',
    onboardingMode:'remote',onboardingFeeNaira:'',notes:'',
  });
  const [licence,setLicence]=useState({
    schoolId:'',status:'licensed',tierCode:'starter',seatLimit:'150',campusCount:'1',
    billingPeriod:'termly',accessDays:'120',onboardingMode:'remote',
  });

  const tiers=overview?.licenceTiers||[];
  const pending=useMemo(()=>pilots.filter(item=>item.status==='pending'),[pilots]);
  const selectedTier=tiers.find(tier=>tier.code===quote.tierCode);
  const recommendedAmount=(tierCode:string,billingPeriod:string,campusCount:string)=>{
    const tier=tiers.find(item=>item.code===tierCode);
    const listed=billingPeriod==='session'?tier?.sessionAmountNaira:tier?.termlyAmountNaira;
    return listed==null?'':String(listed*Math.max(1,Number(campusCount)||1));
  };

  async function load(){
    try{
      const [summary,requests]=await Promise.all([api.get('/api/admin/overview'),api.get('/api/admin/pilot-requests')]);
      const data=summary.data as PlatformOverview;
      setOverview(data);setPilots(requests.data.requests);setError('');
      const first=data.schools[0];
      setQuote(value=>({...value,schoolId:value.schoolId||first?.id||''}));
      setLicence(value=>({...value,schoolId:value.schoolId||first?.id||''}));
    }catch(error){setError(errorText(error));}
  }
  useEffect(()=>{if(user?.role==='super_admin')void load();},[user?.id]);

  if(!user)return <div className='commercial-page narrow-portal'><LoginPanel onDone={next=>onNavigate(destination(next))}/></div>;
  if(user.role!=='super_admin')return <div className='commercial-page'><p className='notice'>Only the LearnBridge platform administrator can open this dashboard.</p></div>;

  async function approve(id:string){
    try{
      setError('');
      const {data}=await api.post(`/api/admin/pilot-requests/${id}/approve`,{
        pilotDays:Number(pilot.pilotDays),pilotSeats:Number(pilot.pilotSeats),campusCount:Number(pilot.campusCount),
      });
      setApprovalLink(data.invitationUrl);
      setNotice(`Pilot approved for ${data.pilotDays} days, ${data.pilotSeats} learner seats and ${data.campusCount} ${data.campusCount===1?'campus':'campuses'}.`);
      await load();
    }catch(error){setError(errorText(error));}
  }
  async function reject(id:string){
    if(!window.confirm('Reject this pilot request?'))return;
    try{await api.post(`/api/admin/pilot-requests/${id}/reject`);await load();}
    catch(error){setError(errorText(error));}
  }
  function chooseQuoteTier(tierCode:string){
    const tier=tiers.find(item=>item.code===tierCode);
    setQuote(value=>({...value,tierCode,seatLimit:String(tier?.seatLimit||1001),amountNaira:recommendedAmount(tierCode,value.billingPeriod,value.campusCount)}));
  }
  function chooseBillingPeriod(billingPeriod:string){
    setQuote(value=>({...value,billingPeriod,durationDays:billingPeriod==='session'?'365':'120',amountNaira:recommendedAmount(value.tierCode,billingPeriod,value.campusCount)}));
  }
  function chooseCampusCount(campusCount:string){
    setQuote(value=>({...value,campusCount,amountNaira:recommendedAmount(value.tierCode,value.billingPeriod,campusCount)}));
  }
  async function createQuote(event:FormEvent){
    event.preventDefault();setError('');setNotice('');
    try{
      const {data}=await api.post('/api/admin/quotes',{
        ...quote,amountNaira:quote.amountNaira===''?undefined:Number(quote.amountNaira),
        seatLimit:Number(quote.seatLimit),campusCount:Number(quote.campusCount),durationDays:Number(quote.durationDays),
        expiresInDays:Number(quote.expiresInDays),onboardingFeeNaira:quote.onboardingFeeNaira===''?undefined:Number(quote.onboardingFeeNaira),
      });
      setNotice(`Quotation issued: ${money(data.amountKobo)} for ${data.tierLabel} ${data.billingPeriod} access.`);
      setQuote(value=>({...value,title:'',notes:''}));
      await load();
    }catch(error){setError(errorText(error));}
  }
  function editSchool(schoolId:string){
    const school=overview?.schools.find(item=>item.id===schoolId);
    setLicence(value=>({...value,schoolId,
      status:school?.status==='expired'?'licensed':school?.status||'licensed',
      tierCode:school?.licenceTier||'starter',seatLimit:String(school?.seatLimit||150),
      campusCount:String(school?.campusCount||1),billingPeriod:school?.billingPeriod==='session'?'session':'termly',
      accessDays:school?.billingPeriod==='session'?'365':'120',onboardingMode:school?.onboardingMode||'remote',
    }));
  }
  async function updateLicence(event:FormEvent){
    event.preventDefault();setError('');setNotice('');
    try{
      await api.patch(`/api/admin/schools/${licence.schoolId}/licence`,{
        ...licence,seatLimit:Number(licence.seatLimit),campusCount:Number(licence.campusCount),accessDays:Number(licence.accessDays),
      });
      setNotice('The school licence settings and access period were updated.');
      await load();
    }catch(error){setError(errorText(error));}
  }
  async function reissueAdminInvite(schoolId:string,schoolName:string){
    const email=window.prompt(`School administrator email for ${schoolName}:`);if(!email)return;
    try{
      const {data}=await api.post(`/api/admin/schools/${schoolId}/admin-invitation`,{email});
      setApprovalLink(data.invitationUrl);setNotice(`An administrator invitation was created for ${data.email}. School licences allow unlimited administrator accounts.`);
    }catch(error){setError(errorText(error));}
  }

  return <div className='commercial-page'>
    <div className='portal-title'><div><span className='eyebrow'>PLATFORM ADMINISTRATION</span><h1>School licensing controls</h1><p>Configure pilots, licence tiers, campuses, onboarding, quotations and school access.</p></div><span className='licence-badge active'>Administrator</span></div>
    {notice&&<p className='form-success' role='status'>{notice}</p>}{error&&<p className='form-error' role='alert'>{error}</p>}
    {approvalLink&&<div className='copy-result approval-link'><div><strong>School administrator invitation</strong><code>{approvalLink}</code></div><button className='outline' onClick={()=>void copy(approvalLink)}><Clipboard size={14}/> Copy invitation</button></div>}
    {overview&&<section className='portal-stats admin-stats'><article><strong>{overview.schools.length}</strong><span>Schools</span></article><article><strong>{overview.consumers.length}</strong><span>Consumer accounts</span></article><article><strong>{overview.pendingPilots}</strong><span>Pilots awaiting review</span></article><article><strong>{money(overview.revenueKobo)}</strong><span>Verified gross payments</span></article></section>}
    {overview&&<section className={`payment-mode ${overview.paymentMode}`}><ShieldCheck size={20}/><div><strong>Paystack mode: {overview.paymentMode}</strong><p>{overview.paymentMode==='test'?'Test transactions cannot collect real money. Test every package, renewal webhook and school quotation before adding the live key.':overview.paymentMode==='live'?'Live payments are enabled. The quotation total stored by the server is the exact amount sent to Paystack.':'Add a Paystack secret key to enable checkout.'}</p></div></section>}

    <section className='commercial-card dashboard-wide'><h2>School licence catalogue</h2><p>The full-session prices are 20% below three separate term payments. Standard tiers are priced per campus; use Enterprise for negotiated multi-campus agreements.</p><div className='licence-tier-grid'>{tiers.map(tier=><article key={tier.code}><strong>{tier.label}</strong><span>{tier.seatLimit?`Up to ${tier.seatLimit} active learners`:'Over 1,000 learners or multi-campus'}</span><b>{tier.termlyAmountNaira?`${new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(tier.termlyAmountNaira)} / term`:'Custom term price'}</b><b>{tier.sessionAmountNaira?`${new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(tier.sessionAmountNaira)} / session`:'Custom session price'}</b></article>)}</div><div className='licence-inclusions'><span>Unlimited teachers</span><span>Unlimited administrators</span><span>Remote onboarding included</span><span>Annual price review</span></div></section>

    <div className='dashboard-grid'>
      <section className='commercial-card'><h2>Pending pilot requests</h2><p>These settings apply to the next pilot you approve. Pilots never create an automatic charge.</p><div className='form-row request-controls'><label>Pilot days<input type='number' min='1' max='90' value={pilot.pilotDays} onChange={event=>setPilot({...pilot,pilotDays:event.target.value})}/></label><label>Learner seats<input type='number' min='1' max='500' value={pilot.pilotSeats} onChange={event=>setPilot({...pilot,pilotSeats:event.target.value})}/></label></div><label className='admin-field'>Campuses<input type='number' min='1' max='10' value={pilot.campusCount} onChange={event=>setPilot({...pilot,campusCount:event.target.value})}/></label>{!pending.length?<p>No pilot requests are awaiting review.</p>:<div className='request-list'>{pending.map(request=><article key={request.id}><h3>{request.schoolName}</h3><p>{request.adminName} · {request.adminEmail} · {request.phone}</p><span>{request.estimatedLearners} estimated learners · requested {date(request.createdAt)}</span>{request.message&&<blockquote>{request.message}</blockquote>}<div><button className='primary' onClick={()=>void approve(request.id)}>Approve configured pilot</button><button className='outline' onClick={()=>void reject(request.id)}>Reject</button></div></article>)}</div>}</section>

      <form className='commercial-card portal-form' onSubmit={createQuote}><h2>Issue school quotation</h2><p>Choose a standard tier or set an Enterprise amount. Onsite onboarding is added separately; remote onboarding is included.</p><label>School<select required value={quote.schoolId} onChange={event=>setQuote({...quote,schoolId:event.target.value})}><option value=''>Choose a school</option>{overview?.schools.map(school=><option key={school.id} value={school.id}>{school.name} ({school.status})</option>)}</select></label><div className='form-row'><label>Licence tier<select value={quote.tierCode} onChange={event=>chooseQuoteTier(event.target.value)}>{tiers.map(tier=><option key={tier.code} value={tier.code}>{tier.label}</option>)}</select></label><label>Billing period<select value={quote.billingPeriod} onChange={event=>chooseBillingPeriod(event.target.value)}><option value='termly'>Per term</option><option value='session'>Full session · best value</option></select></label></div><div className='form-row'><label>Campuses<input type='number' min='1' max='10' required value={quote.campusCount} onChange={event=>chooseCampusCount(event.target.value)}/></label><label>Active learner limit<input type='number' min='1' max='100000' required value={quote.seatLimit} onChange={event=>setQuote({...quote,seatLimit:event.target.value})}/></label></div><label>Licence price (NGN, before onsite fee)<input type='number' min='1' max='20000000' step='0.01' required value={quote.amountNaira} placeholder={selectedTier?.code==='enterprise'?'Enter negotiated Enterprise price':''} onChange={event=>setQuote({...quote,amountNaira:event.target.value})}/><small>You may override a recommended price. The API validates and stores the final amount.</small></label><div className='form-row'><label>Onboarding<select value={quote.onboardingMode} onChange={event=>setQuote({...quote,onboardingMode:event.target.value,onboardingFeeNaira:event.target.value==='onsite'?quote.onboardingFeeNaira:''})}><option value='remote'>Remote · included</option><option value='onsite'>Onsite · add fee</option><option value='none'>None</option></select></label><label>Onsite fee (NGN)<input type='number' min='1' max='20000000' step='0.01' required={quote.onboardingMode==='onsite'} disabled={quote.onboardingMode!=='onsite'} value={quote.onboardingFeeNaira} onChange={event=>setQuote({...quote,onboardingFeeNaira:event.target.value})}/></label></div><div className='form-row'><label>Access days<input type='number' min='1' max='730' value={quote.durationDays} onChange={event=>setQuote({...quote,durationDays:event.target.value})}/></label><label>Quote valid for days<input type='number' min='1' max='90' value={quote.expiresInDays} onChange={event=>setQuote({...quote,expiresInDays:event.target.value})}/></label></div><label>Quotation title<input placeholder='e.g. 2027 full-session licence' value={quote.title} onChange={event=>setQuote({...quote,title:event.target.value})}/></label><label>Internal/agreement notes<textarea rows={3} maxLength={1000} value={quote.notes} onChange={event=>setQuote({...quote,notes:event.target.value})}/></label><div className='licence-inclusions compact'><span>Unlimited teachers</span><span>Unlimited administrators</span></div><button className='primary' disabled={!overview?.schools.length}>Issue quotation</button></form>

      <form className='commercial-card portal-form dashboard-wide' onSubmit={updateLicence}><h2>Manage an existing school licence</h2><p>Use this for manual licences, extensions, suspension or corrections. Active access is reset from today for the number of days entered.</p><div className='form-row'><label>School<select required value={licence.schoolId} onChange={event=>editSchool(event.target.value)}><option value=''>Choose a school</option>{overview?.schools.map(school=><option key={school.id} value={school.id}>{school.name}</option>)}</select></label><label>Status<select value={licence.status} onChange={event=>setLicence({...licence,status:event.target.value})}><option value='licensed'>Licensed</option><option value='pilot'>Pilot</option><option value='pending'>Pending</option><option value='suspended'>Suspended</option><option value='expired'>Expired</option></select></label></div><div className='form-row'><label>Tier<select value={licence.tierCode} onChange={event=>{const tier=tiers.find(item=>item.code===event.target.value);setLicence({...licence,tierCode:event.target.value,seatLimit:String(tier?.seatLimit||licence.seatLimit)});}}>{tiers.map(tier=><option key={tier.code} value={tier.code}>{tier.label}</option>)}</select></label><label>Active learner limit<input type='number' min='1' max='100000' value={licence.seatLimit} onChange={event=>setLicence({...licence,seatLimit:event.target.value})}/></label></div><div className='form-row'><label>Campuses<input type='number' min='1' max='10' value={licence.campusCount} onChange={event=>setLicence({...licence,campusCount:event.target.value})}/></label><label>Access days from today<input type='number' min='1' max='730' value={licence.accessDays} onChange={event=>setLicence({...licence,accessDays:event.target.value})}/></label></div><div className='form-row'><label>Billing period<select value={licence.billingPeriod} onChange={event=>setLicence({...licence,billingPeriod:event.target.value,accessDays:event.target.value==='session'?'365':'120'})}><option value='termly'>Termly</option><option value='session'>Full session</option></select></label><label>Onboarding<select value={licence.onboardingMode} onChange={event=>setLicence({...licence,onboardingMode:event.target.value})}><option value='remote'>Remote</option><option value='onsite'>Onsite</option><option value='none'>None</option></select></label></div><button className='primary' disabled={!licence.schoolId}>Update school licence</button></form>

      <section className='commercial-card dashboard-wide'><h2>Individual and family accounts</h2>{!overview?.consumers.length?<p>No consumer account has been registered.</p>:<div className='data-table'><div className='data-row consumer-row heading'><span>Owner</span><span>Package</span><span>Status</span><span>Learners</span><span>Access ends</span></div>{overview.consumers.map(account=><div className='data-row consumer-row' key={account.id}><span>{account.ownerName}<small>{account.ownerEmail}</small></span><span>{account.accountType}</span><span>{account.status}</span><span>{account.accountType==='family'?`${account.learnersUsed} / 5`:'1'}</span><span>{date(account.licenceEndAt)}</span></div>)}</div>}</section>
      <section className='commercial-card dashboard-wide'><h2>Registered schools</h2><div className='data-table'><div className='data-row school-row heading'><span>School</span><span>Licence</span><span>Learners</span><span>Staff</span><span>Access ends</span><span>Administrator</span></div>{overview?.schools.map(school=><div className='data-row school-row' key={school.id}><span>{school.name}<small>{school.campusCount} {school.campusCount===1?'campus':'campuses'}</small></span><span>{school.licenceTier||school.status}</span><span>{school.seatsUsed} / {school.seatLimit}</span><span>{school.teachersUsed} teachers<br/>{school.administratorsUsed} admins</span><span>{date(school.licenceEndAt)}</span><button className='text-button' onClick={()=>void reissueAdminInvite(school.id,school.name)}>Add administrator</button></div>)}</div></section>
      <section className='commercial-card dashboard-wide launch-checklist'><h2>Licence operations</h2><ul><li>Full-session prices represent a 20% saving compared with three term payments.</li><li>Teacher and school-administrator accounts are unlimited; learner seats are the only counted seats.</li><li>Standard licences are priced per campus. Use a negotiated Enterprise quotation for multi-campus groups.</li><li>Remote onboarding is included. Add an agreed fee when onsite training is selected.</li><li>Review the catalogue annually, then update the server-side tier values before offering new quotations.</li></ul></section>
    </div><PasswordPanel onDone={()=>onNavigate('Plans')}/>
  </div>;
}

export default function CommercialPortal({mode,onNavigate}:Props) {
  if(mode==='Join School')return <JoinAccount onNavigate={onNavigate}/>;
  if(mode==='Account')return <ConsumerDashboard onNavigate={onNavigate}/>;
  if(mode==='School')return <SchoolDashboard onNavigate={onNavigate}/>;
  if(mode==='Platform')return <PlatformDashboard onNavigate={onNavigate}/>;
  if(mode==='For Schools')return <ForSchools onNavigate={onNavigate}/>;
  return <PlansPage onNavigate={onNavigate}/>;
}
