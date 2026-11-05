import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';

export type School = {
  id:string;
  name:string;
  slug:string;
  accountType:'school'|'individual'|'family';
  status:'pending'|'pilot'|'licensed'|'expired'|'suspended';
  seatLimit:number;
  licenceStartAt:string|null;
  licenceEndAt:string|null;
  billingPeriod:'monthly'|'termly'|'annual'|null;
};

export type AuthUser = {
  id:string;
  email:string;
  displayName:string;
  role:'super_admin'|'school_admin'|'account_owner'|'teacher'|'student';
  school:School|null;
  entitlement:{active:boolean;reason:string};
};

type AuthValue = {
  loading:boolean;
  user:AuthUser|null;
  refresh:()=>Promise<void>;
  login:(email:string,password:string)=>Promise<AuthUser>;
  logout:()=>Promise<void>;
  acceptInvitation:(input:{code:string;displayName:string;email:string;password:string})=>Promise<AuthUser>;
};

const AuthContext=createContext<AuthValue|null>(null);

export function AuthProvider({children}:{children:React.ReactNode}) {
  const [loading,setLoading]=useState(true);
  const [user,setUser]=useState<AuthUser|null>(null);
  const refresh=useCallback(async()=>{
    try {
      const {data}=await api.get('/api/auth/me');
      setUser(data.authenticated?data.user as AuthUser:null);
    } catch { setUser(null); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{
    void refresh();
    const interval=window.setInterval(()=>void refresh(),5*60*1000);
    const visible=()=>{if(document.visibilityState==='visible')void refresh();};
    document.addEventListener('visibilitychange',visible);
    return()=>{window.clearInterval(interval);document.removeEventListener('visibilitychange',visible);};
  },[refresh]);
  const login=useCallback(async(email:string,password:string)=>{
    const {data}=await api.post('/api/auth/login',{email,password});
    const next=data.user as AuthUser;
    setUser(next);
    return next;
  },[]);
  const logout=useCallback(async()=>{
    await api.post('/api/auth/logout');
    setUser(null);
  },[]);
  const acceptInvitation=useCallback(async(input:{code:string;displayName:string;email:string;password:string})=>{
    const {data}=await api.post('/api/auth/accept-invitation',input);
    const next=data.user as AuthUser;
    setUser(next);
    return next;
  },[]);
  const value=useMemo(()=>({loading,user,refresh,login,logout,acceptInvitation}),[loading,user,refresh,login,logout,acceptInvitation]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value=useContext(AuthContext);
  if(!value)throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
