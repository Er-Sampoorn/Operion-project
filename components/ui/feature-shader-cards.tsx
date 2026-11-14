"use client"

import React from "react"
import { Warp } from "@paper-design/shaders-react"
import {
  ShieldCheck,
  Cpu,
  Zap,
  Fingerprint,
  Radio,
  FileCheck2,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"

export interface FeatureItem {
  id?: string | number
  title: string
  description: string
  icon?: React.ReactNode
  badge?: string
  linkText?: string
  onLearnMore?: () => void
  colorTheme?: "blue" | "indigo" | "emerald" | "amber" | "purple" | "rose"
}

export interface FeatureShaderCardsProps {
  headline?: string
  subheadline?: string
  badgeText?: string
  features?: FeatureItem[]
  className?: string
}

// Default Operion Platform Features with Lucide Icons
export const defaultOperionFeatures: FeatureItem[] = [
  {
    title: "AI Biometric Verification",
    description: "Multi-factor facial and fingerprint authentication at entry turnstiles with automated liveness detection to prevent impersonation.",
    icon: <Fingerprint className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
    badge: "Turnstile Ready",
    colorTheme: "blue",
  },
  {
    title: "Real-time Malpractice Audit",
    description: "CCTV-integrated neural posture estimation to flag suspicious head rotations, whispering, and unauthorized desk movement.",
    icon: <Cpu className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />,
    badge: "Computer Vision",
    colorTheme: "indigo",
  },
  {
    title: "Prohibited RF Detection",
    description: "Continuous signal scanning for clandestine smartwatches, earphones, and Bluetooth devices transmitting inside examination blocks.",
    icon: <Radio className="w-8 h-8 text-rose-600 dark:text-rose-400" />,
    badge: "Hardware Mesh",
    colorTheme: "rose",
  },
  {
    title: "Tamper-Proof Paper Vault",
    description: "Cryptographic time-lock decryption with synchronized OTP authorization and digital watermark generation for question paper series.",
    icon: <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
    badge: "SHA-512 Signed",
    colorTheme: "emerald",
  },
  {
    title: "Automated Incident Dispatch",
    description: "Natural language incident classifier that generates regulatory SOPs and dispatches Flying Squads in under 90 seconds.",
    icon: <Zap className="w-8 h-8 text-amber-600 dark:text-amber-400" />,
    badge: "Sub-90s SLA",
    colorTheme: "amber",
  },
  {
    title: "Statutory Audit Reporting",
    description: "Instant generation of blockchain-anchored OMR packet seal certificates, attendance summaries, and grievance logs.",
    icon: <FileCheck2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />,
    badge: "Regulation 14-B",
    colorTheme: "purple",
  },
]

export default function FeaturesCards({
  headline = "Next-Generation Examination Operations",
  subheadline = "Unified high-stakes assessment platform powered by real-time computer vision, cryptographic integrity, and automated response dispatch.",
  badgeText = "ENTERPRISE CAPABILITIES",
  features = defaultOperionFeatures,
  className = "",
}: FeatureShaderCardsProps) {

  // Dynamic Shader Configuration with Light & Dark Friendly Palettes
  const getShaderConfig = (index: number, theme?: string) => {
    const configs = [
      {
        proportion: 0.35,
        softness: 0.9,
        distortion: 0.16,
        swirl: 0.65,
        swirlIterations: 8,
        shape: "checks" as const,
        shapeScale: 0.08,
        // Blue / Indigo Azure
        colors: ["hsl(215, 95%, 60%)", "hsl(225, 90%, 75%)", "hsl(195, 85%, 65%)", "hsl(240, 90%, 80%)"],
      },
      {
        proportion: 0.4,
        softness: 1.1,
        distortion: 0.2,
        swirl: 0.85,
        swirlIterations: 10,
        shape: "dots" as const,
        shapeScale: 0.11,
        // Indigo / Violet
        colors: ["hsl(245, 90%, 65%)", "hsl(260, 85%, 75%)", "hsl(220, 90%, 60%)", "hsl(280, 80%, 78%)"],
      },
      {
        proportion: 0.38,
        softness: 0.95,
        distortion: 0.18,
        swirl: 0.7,
        swirlIterations: 10,
        shape: "checks" as const,
        shapeScale: 0.1,
        // Rose / Crimson
        colors: ["hsl(350, 90%, 65%)", "hsl(10, 90%, 72%)", "hsl(330, 85%, 60%)", "hsl(360, 95%, 78%)"],
      },
      {
        proportion: 0.42,
        softness: 1.05,
        distortion: 0.22,
        swirl: 0.8,
        swirlIterations: 12,
        shape: "dots" as const,
        shapeScale: 0.09,
        // Emerald / Teal
        colors: ["hsl(155, 85%, 55%)", "hsl(175, 80%, 65%)", "hsl(140, 85%, 50%)", "hsl(165, 90%, 70%)"],
      },
      {
        proportion: 0.36,
        softness: 0.92,
        distortion: 0.17,
        swirl: 0.75,
        swirlIterations: 9,
        shape: "checks" as const,
        shapeScale: 0.11,
        // Amber / Sunlight
        colors: ["hsl(38, 95%, 60%)", "hsl(48, 95%, 70%)", "hsl(25, 90%, 58%)", "hsl(52, 90%, 75%)"],
      },
      {
        proportion: 0.4,
        softness: 1.0,
        distortion: 0.19,
        swirl: 0.78,
        swirlIterations: 9,
        shape: "dots" as const,
        shapeScale: 0.12,
        // Purple / Fuchsia
        colors: ["hsl(275, 90%, 65%)", "hsl(295, 85%, 70%)", "hsl(260, 90%, 60%)", "hsl(310, 85%, 75%)"],
      },
    ]
    return configs[index % configs.length]
  }

  return (
    <section className={`py-16 px-4 sm:px-6 lg:px-8 bg-slate-50/50 dark:bg-slate-950 transition-colors duration-200 ${className}`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="text-center mb-16">
          {badgeText && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-3">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400"></span>
              {badgeText}
            </div>
          )}
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
            {headline}
          </h2>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
            {subheadline}
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => {
            const shaderConfig = getShaderConfig(index, feature.colorTheme)
            return (
              <div
                key={feature.id ?? index}
                className="group relative h-96 rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl shadow-md border border-slate-200 dark:border-slate-800"
              >
                {/* Background Dynamic WebGL Shader */}
                <div className="absolute inset-0 opacity-40 dark:opacity-30 group-hover:opacity-60 transition-opacity duration-300">
                  <Warp
                    style={{ height: "100%", width: "100%" }}
                    proportion={shaderConfig.proportion}
                    softness={shaderConfig.softness}
                    distortion={shaderConfig.distortion}
                    swirl={shaderConfig.swirl}
                    swirlIterations={shaderConfig.swirlIterations}
                    shape={shaderConfig.shape}
                    shapeScale={shaderConfig.shapeScale}
                    scale={1}
                    rotation={0}
                    speed={0.6}
                    colors={shaderConfig.colors}
                  />
                </div>

                {/* Light Mode / Dark Mode Glass Card Surface */}
                <div className="relative z-10 p-7 sm:p-8 h-full flex flex-col justify-between bg-white/80 dark:bg-slate-900/85 backdrop-blur-md transition-colors duration-200">
                  
                  {/* Top Bar: Icon + Badge */}
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700/80 transition-transform duration-200 group-hover:scale-105">
                        {feature.icon || <ShieldCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />}
                      </div>
                      
                      {feature.badge && (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                          {feature.badge}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2.5 tracking-tight">
                      {feature.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      {feature.description}
                    </p>
                  </div>

                  {/* Bottom Action Link */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      type="button"
                      onClick={feature.onLearnMore}
                      className="inline-flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors group/btn"
                    >
                      <span className="mr-1.5">{feature.linkText || "Explore Capability"}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:translate-x-1" />
                    </button>
                  </div>

                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
