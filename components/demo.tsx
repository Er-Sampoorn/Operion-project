"use client"

import React from "react"
import FeaturesCards, { type FeatureItem } from "@/components/ui/feature-shader-cards"
import { ShieldAlert, Video, Award } from "lucide-react"

import VirtualCCTVNode from "@/components/VirtualCCTVNode"

// Example 1: Default Plug-and-Play Usage across the app
export function OperionFeaturesSection() {
  return <FeaturesCards />
}

// Example 2: Dynamic Custom Props Usage (Pass your own title, subtitle, and custom cards)
export function CustomExamModuleSection() {
  const customModules: FeatureItem[] = [
    {
      title: "CCTV AI Sentinel",
      description: "Automated real-time proctoring with automated head-pose classification and cheat-sheet detection.",
      icon: <Video className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      badge: "Vision 2.0",
      linkText: "View CCTV Telemetry",
    },
    {
      title: "Real-time Incident Dispatch",
      description: "Direct regulatory alert propagation to University Observers and Flying Squads within seconds.",
      icon: <ShieldAlert className="w-8 h-8 text-rose-600 dark:text-rose-400" />,
      badge: "P1 Urgent",
      linkText: "Review SOPs",
    },
    {
      title: "Cryptographic Certification",
      description: "Digital answer key hashing and blockchain-anchored OMR custody transfer verification.",
      icon: <Award className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
      badge: "Audit Proof",
      linkText: "Inspect Ledger",
    },
  ]

  return (
    <FeaturesCards
      headline="Specialized Examination Security Modules"
      subheadline="Plug-and-play secure modules engineered for nationwide examination centers."
      badgeText="OPERATIONAL INTEGRITY"
      features={customModules}
    />
  )
}

export default function DemoOne() {
  return (
    <div className="space-y-12 p-6 bg-slate-950 min-h-screen">
      <VirtualCCTVNode />
      <OperionFeaturesSection />
    </div>
  )
}

