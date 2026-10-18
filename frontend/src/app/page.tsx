'use client';

import React from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import TechText from '@/components/ui/TechText';
import Radar from '@/components/ui/Radar';
import InfiniteSpiral from '@/components/ui/InfiniteSpiral';
import {
  ShieldCheck,
  Lock,
  Eye,
  Database,
  AlertTriangle,
  FileCheck2,
  Fingerprint,
  ScanSearch,
  ArrowRight,
  LayoutDashboard,
  Send,
} from 'lucide-react';

export default function HomePage() {
  const spiralImages = [
    { src: '/images/a1.png', alt: 'Arkiv Grain Depot Weighbridge' },
    { src: '/images/a2.png', alt: 'PDS Supply Chain Logistics' },
    { src: '/images/a3.png', alt: 'Fair Price Shop Delivery' },
    { src: '/images/a4.png', alt: 'Blockchain Immutable Ledger' },
    { src: '/images/a5.png', alt: 'Citizen Ration Distribution' },
    { src: '/images/a6.png', alt: 'Cryptographic Audit Verification' },
  ];

  const features = [
    {
      icon: <AlertTriangle className="w-6 h-6 text-[#3b82f6]" />,
      title: 'Discrepancy Detection',
      description: 'Real-time monitoring and algorithmic alerts comparing depot releases against shop receipts.',
    },
    {
      icon: <Lock className="w-6 h-6 text-[#3b82f6]" />,
      title: 'Arkiv Blockchain Anchoring',
      description: 'End-to-end cryptographic proofs on the Arkiv Tiramisu Layer 1 network for every grain movement.',
    },
    {
      icon: <Eye className="w-6 h-6 text-[#3b82f6]" />,
      title: 'Supply Chain Monitoring',
      description: '24/7 transparent surveillance of food grain transit across state depots and Fair Price Shops.',
    },
    {
      icon: <Database className="w-6 h-6 text-[#3b82f6]" />,
      title: 'Immutable Evidence Ledger',
      description: 'Permanent decentralized records with verifiable entity keys, transaction hashes, and block proofs.',
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-[#3b82f6]" />,
      title: 'Leakage & Diversion Prevention',
      description: 'Proactive algorithmic defense flagging transit losses and diversion attempts before receipt confirmation.',
    },
    {
      icon: <FileCheck2 className="w-6 h-6 text-[#3b82f6]" />,
      title: 'Compliance Management',
      description: 'Strict automated adherence to National Food Security Act (NFSA) and Targeted PDS guidelines.',
    },
    {
      icon: <Fingerprint className="w-6 h-6 text-[#3b82f6]" />,
      title: 'Role-Based Authentication',
      description: 'Enterprise Clerk security strictly isolating Admin depot authorities and local shop operators.',
    },
    {
      icon: <ScanSearch className="w-6 h-6 text-[#3b82f6]" />,
      title: 'Cross-Shop Access Isolation',
      description: 'Granular shop license scoping ensuring operators can only view and confirm their assigned deliveries.',
    },
  ];

  return (
    <AppShell fullWidth>
      <div className="relative text-[#F1F8FC] selection:bg-[#3b82f6]/30 selection:text-[#60a5fa] overflow-x-hidden">
        {/* Background Ambient Glow Gradients */}
        <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-[#3b82f6]/10 rounded-full blur-[140px] pointer-events-none -z-10" />
        <div className="fixed top-1/3 right-10 w-[500px] h-[500px] bg-[#3b82f6]/10 rounded-full blur-[150px] pointer-events-none -z-10" />
        <div className="fixed bottom-10 left-1/3 w-[600px] h-[600px] bg-[#2563eb]/10 rounded-full blur-[160px] pointer-events-none -z-10" />

        {/* Hero Section */}
        <section className="relative pt-6 pb-16 md:pt-10 md:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: TechText Name + Tagline + Actions */}
            <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
              {/* Interactive TechText Canvas Display - Directly on page without any square background box */}
              <div className="w-full h-[180px] sm:h-[250px] md:h-[320px] lg:h-[380px] relative flex items-center justify-start">
                <TechText
                  text="ArkivTrace"
                  highlightIndex={5}
                  highlightColor="#3b82f6"
                  fontWeight={700}
                  fontSize={150}
                  reveal="letter"
                  dashLength={4}
                  dashGap={2}
                  specks={15}
                  intro="none"
                  introDuration={2}
                  clickKick
                  guides={false}
                  fontFamily=""
                  letterSpacing={-0.05}
                  accentColor="#3b82f6"
                  reach={200}
                  softness={0.7}
                  lineStyle="dashed"
                  strokeWidth={1.5}
                  speed={1}
                  bounce={0.4}
                  selection
                  labels
                  color="#F1F8FC"
                  align="left"
                  draggable
                  sweep
                />
              </div>

              {/* Tagline: Transparent web3 end-to-end auditable record for every Ration */}
              <div className="space-y-3">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-[#F1F8FC] leading-snug">
                  Transparent web3 end-to-end auditable record for every{' '}
                  <span className="text-[#3b82f6]">Ration</span>
                </h2>

                <p className="text-sm md:text-base text-[#91A9B7] leading-relaxed max-w-xl">
                  Securing India&apos;s Public Distribution System through cryptographic grain dispatch anchoring, electronic weighbridge verification, and automated discrepancy reconciliation on the Arkiv blockchain.
                </p>
              </div>

              {/* Hero CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/dashboard"
                  className="px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white hover:opacity-95 transition-all shadow-[0_0_25px_rgba(59,130,246,0.4)] flex items-center gap-2 group"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Launch Operations Dashboard</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  href="https://t.me/ArkivTraceAlert_Bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3.5 rounded-xl font-bold text-sm bg-[#05131C] text-[#F1F8FC] border border-[#3b82f6]/30 hover:border-[#3b82f6]/70 hover:bg-[#2563eb]/15 transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                >
                  <Send className="w-4 h-4 text-[#38bdf8]" />
                  <span>Join on Telegram</span>
                </Link>
              </div>

              {/* Quick Metrics */}
              <div className="pt-4 grid grid-cols-3 gap-4 border-t border-[#3b82f6]/15">
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-[#F1F8FC]">100%</p>
                  <p className="text-xs text-[#91A9B7]">On-Chain Auditability</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-[#3b82f6]">0 Fraud</p>
                  <p className="text-xs text-[#91A9B7]">Tamper-Proof Proofs</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-[#60a5fa]">Real-Time</p>
                  <p className="text-xs text-[#91A9B7]">Discrepancy Alerts</p>
                </div>
              </div>
            </div>

            {/* Right Column: WebGL Radar Animation - Full uncut circle */}
            <div className="lg:col-span-6 relative flex items-start justify-center">
              <div className="w-full max-w-[480px] lg:max-w-[520px] h-[380px] sm:h-[440px] lg:h-[480px] relative -mt-6 sm:-mt-12 lg:-mt-20 xl:-mt-24 pointer-events-auto flex items-center justify-center">
                <Radar
                  color="#3b82f6"
                  mode="sweep"
                  speed={1}
                  trail={0.35}
                  scale={0.88}
                  ringCount={6}
                  spokeCount={12}
                  targets={6}
                  clutter={0.35}
                  mouseInteraction
                  ticks
                  glow={1.2}
                  tilt={0}
                  centerX={0.5}
                  centerY={0.5}
                  brightness={1.1}
                  gridOpacity={1}
                  lineWidth={1}
                  grain={0.03}
                  fade={0}
                  opacity={1}
                  intro
                  lightMode={false}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section: How it Works (Images on Left, Steps on Right) */}
        <section className="py-24 relative border-t border-[#3b82f6]/15">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Side: InfiniteSpiral directly on page without square container box */}
              <div className="lg:col-span-6 relative flex items-center justify-center">
                <div className="w-full h-[520px] sm:h-[600px] relative flex items-center justify-center">
                  <InfiniteSpiral
                    items={spiralImages}
                    animationMode="auto"
                    speed={0.55}
                    radius={175}
                    cardWidth={125}
                    cardHeight={125}
                    verticalSpacing={65}
                    perspective={1000}
                    cardRadius={12}
                    centerScale={1.25}
                    edgeBlur={6}
                    cardsPerTurn={7}
                    pauseOnHover
                    direction="up"
                    rotation={0}
                    cardTilt={0}
                    edgeFade={0.3}
                    imageFit="cover"
                    grayscale={0}
                  />
                </div>
              </div>

              {/* Right Side: 4 Steps */}
              <div className="lg:col-span-6 space-y-8">
                <div>
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white">
                    How it <span className="text-[#3b82f6] drop-shadow-[0_0_20px_rgba(59,130,246,0.6)]">Works</span>
                  </h2>
                  <p className="text-sm text-[#91A9B7] mt-3 max-w-lg">
                    A seamless 4-step cryptographic pipeline connecting central storage depots with local Fair Price Shops.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Step 1 */}
                  <div className="flex items-start gap-5 group">
                    <div className="w-12 h-12 rounded-full shrink-0 bg-[#03090F] border-2 border-[#3b82f6] text-[#3b82f6] flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(59,130,246,0.4)] group-hover:scale-105 group-hover:border-[#60a5fa] group-hover:text-[#60a5fa] transition-all">
                      1
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#F1F8FC] group-hover:text-[#60a5fa] transition-colors">
                        Submit a Record
                      </h3>
                      <p className="text-xs sm:text-sm text-[#91A9B7] mt-1 leading-relaxed">
                        Authorized users add dispatches, shop receipts, or stock reports through a simple and secure interface.
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-5 group">
                    <div className="w-12 h-12 rounded-full shrink-0 bg-[#03090F] border-2 border-[#3b82f6] text-[#3b82f6] flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(59,130,246,0.4)] group-hover:scale-105 group-hover:border-[#60a5fa] group-hover:text-[#60a5fa] transition-all">
                      2
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#F1F8FC] group-hover:text-[#60a5fa] transition-colors">
                        Store on Arkiv
                      </h3>
                      <p className="text-xs sm:text-sm text-[#91A9B7] mt-1 leading-relaxed">
                        Each record is securely written to the Arkiv network, creating a tamper-proof and transparent history.
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-5 group">
                    <div className="w-12 h-12 rounded-full shrink-0 bg-[#03090F] border-2 border-[#3b82f6] text-[#3b82f6] flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(59,130,246,0.4)] group-hover:scale-105 group-hover:border-[#60a5fa] group-hover:text-[#60a5fa] transition-all">
                      3
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#F1F8FC] group-hover:text-[#60a5fa] transition-colors">
                        Verify and Track
                      </h3>
                      <p className="text-xs sm:text-sm text-[#91A9B7] mt-1 leading-relaxed">
                        Browse records, check evidence, and trace the complete supply chain from depot to shop.
                      </p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-5 group">
                    <div className="w-12 h-12 rounded-full shrink-0 bg-[#03090F] border-2 border-[#3b82f6] text-[#3b82f6] flex items-center justify-center font-bold text-lg shadow-[0_0_15px_rgba(59,130,246,0.4)] group-hover:scale-105 group-hover:border-[#60a5fa] group-hover:text-[#60a5fa] transition-all">
                      4
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#F1F8FC] group-hover:text-[#60a5fa] transition-colors">
                        Identify Discrepancies
                      </h3>
                      <p className="text-xs sm:text-sm text-[#91A9B7] mt-1 leading-relaxed">
                        Compare quantities, detect mismatches, and get real-time alerts for investigation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section: Features Section */}
        <section className="py-24 relative border-t border-[#3b82f6]/15 bg-[#03090F]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-16 space-y-4">
              <p className="text-xs sm:text-sm font-semibold text-[#3b82f6] tracking-wider uppercase">
                Secured Public Distribution System
              </p>
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Core Features
              </h2>
              <p className="text-sm sm:text-base text-[#91A9B7] leading-relaxed">
                Real-time traceability, tamper-proof records, and automated verification—all anchored to the Arkiv Tiramisu blockchain for verifiable food security.
              </p>
            </div>

            {/* 8 Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feat, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-[#041018]/60 border border-[#3b82f6]/15 hover:border-[#3b82f6]/40 transition-all group hover:bg-[#061522]/80 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-xl bg-[#3b82f6]/10 border border-[#3b82f6]/25 group-hover:scale-110 transition-transform">
                        {feat.icon}
                      </div>
                      <h3 className="text-base font-bold text-[#F1F8FC] group-hover:text-[#60a5fa] transition-colors">
                        {feat.title}
                      </h3>
                    </div>
                    <p className="text-xs text-[#91A9B7] leading-relaxed">
                      {feat.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Direct Call to Action Banner */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#041017] via-[#081B2B] to-[#041017] border border-[#3b82f6]/30 relative overflow-hidden text-center shadow-[0_0_50px_rgba(59,130,246,0.15)]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#3b82f6]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-2xl mx-auto space-y-5">
              <h3 className="text-2xl sm:text-4xl font-extrabold text-white">
                Ready to verify ration distribution?
              </h3>
              <p className="text-sm text-[#91A9B7] leading-relaxed">
                Access the operational dashboard to create dispatches, confirm delivery receipts, or inspect cryptographic evidence on the Arkiv testnet.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
                <Link
                  href="/dashboard"
                  className="px-8 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white hover:opacity-95 transition-all shadow-[0_0_25px_rgba(59,130,246,0.5)] flex items-center gap-2"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Open Operations Dashboard</span>
                </Link>
                <Link
                  href="/evidence"
                  className="px-8 py-3.5 rounded-xl font-bold text-sm bg-[#03090F] text-[#F1F8FC] border border-[#3b82f6]/30 hover:border-[#3b82f6]/60 transition-all flex items-center gap-2"
                >
                  <Database className="w-4 h-4 text-[#3b82f6]" />
                  <span>Search Arkiv Records</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
