'use client';

import React from 'react';
import { SignIn } from '@clerk/nextjs';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#02090D] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Cyber Glowing Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00C8FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#087DEB]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Link */}
      <div className="mb-6 flex flex-col items-center text-center z-10">
        <Link
          href="/evidence"
          className="inline-flex items-center gap-1.5 text-xs text-[#91A9B7] hover:text-[#55E5FF] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Public Evidence Explorer</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00C8FF] to-[#087DEB] flex items-center justify-center p-0.5 shadow-[0_0_20px_rgba(0,200,255,0.4)]">
            <div className="w-full h-full bg-[#041017] rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[#00C8FF]" />
            </div>
          </div>
          <span className="text-xl font-extrabold tracking-wide text-[#F1F8FC]">
            Arkiv<span className="text-[#00C8FF]">Trace</span>
          </span>
        </div>
        <p className="text-xs text-[#91A9B7] mt-1.5 max-w-sm">
          Civil Supplies Department & Fair Price Shop Verification Portal
        </p>
      </div>

      {/* Clerk Sign In Card Container */}
      <div className="z-10 shadow-[0_0_35px_rgba(0,200,255,0.15)] rounded-2xl overflow-hidden border border-[#00C8FF]/20">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/"
        />
      </div>

      <div className="mt-6 text-center text-xs text-[#607987] z-10">
        <span>Public access to blockchain evidence does not require login. </span>
        <Link href="/evidence" className="text-[#00C8FF] hover:underline font-medium ml-1">
          Explore Evidence Explorer →
        </Link>
      </div>
    </div>
  );
}
