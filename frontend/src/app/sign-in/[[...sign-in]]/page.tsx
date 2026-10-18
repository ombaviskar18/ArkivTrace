'use client';

import React from 'react';
import { SignIn } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#02090D] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Cyber Glowing Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#3b82f6]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#2563eb]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Link */}
      <div className="mb-6 flex flex-col items-center text-center z-10">
        <Link
          href="/evidence"
          className="inline-flex items-center gap-1.5 text-xs text-[#91A9B7] hover:text-[#60a5fa] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Public Evidence Explorer</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center p-0.5 bg-gradient-to-br from-[#3b82f6]/20 to-[#2563eb]/20 border border-[#3b82f6]/30 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
            <Image
              src="/images/logo.png"
              alt="ArkivTrace Logo"
              width={40}
              height={40}
              className="w-full h-full object-contain rounded-lg"
              priority
            />
          </div>
          <span className="text-xl font-extrabold tracking-wide text-[#F1F8FC]">
            Arkiv<span className="text-[#3b82f6]">Trace</span>
          </span>
        </div>
        <p className="text-xs text-[#91A9B7] mt-1.5 max-w-sm">
          Civil Supplies Department & Fair Price Shop Verification Portal
        </p>
      </div>

      {/* Clerk Sign In Card Container */}
      <div className="z-10 shadow-[0_0_35px_rgba(59, 130, 246, 0.15)] rounded-2xl overflow-hidden border border-[#3b82f6]/20">
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/"
          appearance={{
            theme: dark,
            variables: {
              colorPrimary: '#3b82f6',
              colorPrimaryForeground: '#FFFFFF',
              colorBackground: '#041017',
              colorInput: '#06151D',
              colorInputForeground: '#FFFFFF',
              colorForeground: '#FFFFFF',
              colorMutedForeground: '#91A9B7',
              colorNeutral: '#FFFFFF',
            },
            elements: {
              card: 'bg-[#041017] border border-[#3b82f6]/30 shadow-2xl text-white',
              headerTitle: 'text-white font-bold text-xl',
              headerSubtitle: 'text-[#91A9B7] text-sm',
              socialButtonsBlockButton: 'bg-[#06151D] border border-[#3b82f6]/25 text-white hover:bg-[#09232F]',
              socialButtonsBlockButtonText: 'text-white font-semibold',
              dividerLine: 'bg-[#3b82f6]/20',
              dividerText: 'text-[#91A9B7]',
              formFieldLabel: 'text-white font-semibold text-sm',
              formFieldInput: 'bg-[#06151D] border border-[#3b82f6]/30 text-white placeholder-[#607987] focus:border-[#3b82f6]',
              formButtonPrimary: 'bg-[#3b82f6] text-white font-bold hover:bg-[#2563eb]',
              footerActionText: 'text-[#91A9B7]',
              footerActionLink: 'text-[#60a5fa] hover:text-[#93c5fd] font-semibold',
            },
          }}
        />
      </div>

      <div className="mt-6 text-center text-xs text-[#607987] z-10">
        <span>Public access to blockchain evidence does not require login. </span>
        <Link href="/evidence" className="text-[#3b82f6] hover:underline font-medium ml-1">
          Explore Evidence Explorer →
        </Link>
      </div>
    </div>
  );
}
