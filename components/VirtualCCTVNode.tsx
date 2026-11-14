"use client"

import React, { useState, useRef, useEffect } from "react"
import {
  Video,
  Square,
  Camera,
  Maximize2,
  Minimize2,
  Mic,
  Shield,
  Compass,
  ChevronDown,
  VideoOff,
  Radio,
  Eye
} from "lucide-react"

export interface CornerOption {
  id: string
  label: string
  subText: string
  locationTag: string
  azimuth: string
}

export const CORNER_OPTIONS: CornerOption[] = [
  {
    id: "Corner A",
    label: "Corner A (Front-Left - Hall 01)",
    subText: "Front-Left • Hall 01",
    locationTag: "LOC: FRONT-LEFT • HALL 01 • DESKS A1-C6",
    azimuth: "PAN: 42° | TILT: -18° | ZOOM: 1.0x"
  },
  {
    id: "Corner B",
    label: "Corner B (Front-Right - Hall 01)",
    subText: "Front-Right • Hall 01",
    locationTag: "LOC: FRONT-RIGHT • HALL 01 • DESKS A7-C12",
    azimuth: "PAN: 138° | TILT: -16° | ZOOM: 1.0x"
  },
  {
    id: "Corner C",
    label: "Corner C (Rear-Left - Hall 01)",
    subText: "Rear-Left • Hall 01",
    locationTag: "LOC: REAR-LEFT • HALL 01 • DESKS D1-F6",
    azimuth: "PAN: 224° | TILT: -22° | ZOOM: 1.0x"
  },
  {
    id: "Corner D",
    label: "Corner D (Rear-Right - Hall 01)",
    subText: "Rear-Right • Hall 01",
    locationTag: "LOC: REAR-RIGHT • HALL 01 • DESKS D7-F12",
    azimuth: "PAN: 315° | TILT: -20° | ZOOM: 1.0x"
  }
]

export default function VirtualCCTVNode() {
  const [selectedCornerId, setSelectedCornerId] = useState<string>("Corner A")
  const [isFeedActive, setIsFeedActive] = useState<boolean>(false)
  const [opticalFilter, setOpticalFilter] = useState<"normal" | "night" | "mono">("normal")
  const [clockString, setClockString] = useState<string>("")
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [snapshotTaken, setSnapshotTaken] = useState<boolean>(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const currentCorner = CORNER_OPTIONS.find(c => c.id === selectedCornerId) || CORNER_OPTIONS[0]

  // Live Timestamp Clock
  useEffect(() => {
    let animId: number
    const updateTime = () => {
      const d = new Date()
      const hrs = String(d.getHours()).padStart(2, "0")
      const mins = String(d.getMinutes()).padStart(2, "0")
      const secs = String(d.getSeconds()).padStart(2, "0")
      const ms = String(d.getMilliseconds()).padStart(3, "0")
      setClockString(`${hrs}:${mins}:${secs}.${ms}`)
      animId = requestAnimationFrame(updateTime)
    }
    animId = requestAnimationFrame(updateTime)
    return () => cancelAnimationFrame(animId)
  }, [])

  // Clean up media stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // Start or Stop Camera Feed
  const toggleFeed = async () => {
    if (!isFeedActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          },
          audio: false
        })

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setIsFeedActive(true)
      } catch (err: any) {
        console.error("Webcam access error:", err)
        alert(
          `CCTV Webcam Error: ${err.name || "Access Denied"}\n\nPlease check your browser's camera permissions.`
        )
      }
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.srcObject = null
      }
      setIsFeedActive(false)
    }
  }

  // Handle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(console.warn)
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(console.warn)
      setIsFullscreen(false)
    }
  }

  // Snapshot flash
  const handleSnapshot = () => {
    setSnapshotTaken(true)
    setTimeout(() => setSnapshotTaken(false), 2000)
  }

  const getFilterStyle = () => {
    switch (opticalFilter) {
      case "night":
        return "invert(0.1) hue-rotate(90deg) saturate(2.2) brightness(1.15) contrast(1.2)"
      case "mono":
        return "grayscale(1) contrast(1.4) brightness(0.9)"
      default:
        return "none"
    }
  }

  return (
    <div
      ref={containerRef}
      className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl text-slate-100 font-sans"
    >
      {/* 1. Header */}
      <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-lg shadow-inner">
            📹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                OPERION CCTV Node
              </h2>
              <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Simulated Hall 01
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Real-time optical vigilance feed &amp; examination desk proctoring
            </p>
          </div>
        </div>

        {/* Status Badge: Initially 'Standby' */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all duration-300 ${
              isFeedActive
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
            }`}
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isFeedActive ? "bg-emerald-400 animate-ping" : "bg-amber-400"
              }`}
            />
            <span>{isFeedActive ? "LIVE FEED" : "Standby"}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800">
            <span className="text-slate-500">SIGNAL:</span>
            <span className="text-sky-400 font-bold">100% OK</span>
          </div>
        </div>
      </div>

      {/* 2. Video Viewport */}
      <div className="relative bg-black w-full aspect-video sm:min-h-[420px] overflow-hidden flex items-center justify-center select-none">
        {/* HTML5 Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ filter: getFilterStyle() }}
          className={`w-full h-full object-cover transition-all duration-300 ${
            isFeedActive ? "block" : "hidden"
          }`}
        />

        {/* Standby screen when feed is stopped */}
        {!isFeedActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-b from-slate-950 via-[#0a0f1d] to-slate-950">
            <div className="relative w-28 h-28 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-sky-500/20 border-dashed" />
              <div className="absolute inset-3 rounded-full border border-slate-700/60" />
              <div className="absolute inset-7 rounded-full bg-slate-900 border border-slate-700/90 flex items-center justify-center shadow-lg shadow-sky-950/50">
                <VideoOff className="w-8 h-8 text-slate-500" />
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-200 tracking-tight">
              Camera Feed in Standby
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mt-1 mb-4 leading-relaxed">
              Optical node has not commenced transmission. Click{" "}
              <span className="text-sky-400 font-semibold">'Start Local Camera Feed'</span> below to
              authorize web camera access.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono text-slate-400">
              <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
                DEVICE: WebRTC v1.0
              </span>
              <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
                ENCRYPTION: AES-GCM 256
              </span>
              <span className="bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
                CCTV ID: OPERION-CAM-H01
              </span>
            </div>
          </div>
        )}

        {/* Scanline CRT overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.35) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.04), rgba(0, 255, 0, 0.02), rgba(0, 255, 0, 0.04))",
            backgroundSize: "100% 4px, 6px 100%"
          }}
        />

        {/* Corner HUD Reticles */}
        <div className="pointer-events-none absolute top-3.5 left-3.5 w-5 h-5 border-t-2 border-l-2 border-sky-400/80" />
        <div className="pointer-events-none absolute top-3.5 right-3.5 w-5 h-5 border-t-2 border-r-2 border-sky-400/80" />
        <div className="pointer-events-none absolute bottom-3.5 left-3.5 w-5 h-5 border-b-2 border-l-2 border-sky-400/80" />
        <div className="pointer-events-none absolute bottom-3.5 right-3.5 w-5 h-5 border-b-2 border-r-2 border-sky-400/80" />

        {/* Selected Corner Overlay Badge (Requested) */}
        <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs font-bold tracking-wide shadow-lg backdrop-blur-md border ${
              isFeedActive
                ? "bg-slate-950/85 border-emerald-500/50 text-emerald-300"
                : "bg-slate-950/85 border-amber-500/40 text-amber-300"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isFeedActive ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
              }`}
            />
            <span>
              {currentCorner.id} - {isFeedActive ? "Active" : "Standby"}
            </span>
          </div>

          <div className="hidden sm:inline-block px-2.5 py-0.5 rounded bg-slate-900/70 border border-slate-800 text-[10px] font-mono text-slate-400 backdrop-blur-sm">
            {currentCorner.locationTag}
          </div>
        </div>

        {/* Top-Right: REC badge & live clock */}
        <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            {isFeedActive && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/20 border border-rose-500/50 text-rose-300 font-mono text-xs font-bold tracking-wider backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>REC</span>
              </div>
            )}
            <div className="px-2.5 py-1 rounded-md bg-slate-950/85 border border-slate-800 text-slate-300 font-mono text-xs backdrop-blur-md">
              1080P • 30 FPS
            </div>
          </div>

          <div className="px-2.5 py-1 rounded-md bg-slate-950/85 border border-slate-800 text-emerald-400 font-mono text-xs font-semibold tracking-wider backdrop-blur-md">
            {clockString}
          </div>
        </div>

        {/* Viewport Control Tools */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 bg-slate-950/85 border border-slate-800/80 p-1 rounded-lg backdrop-blur-md">
          <button
            onClick={handleSnapshot}
            title="Capture Surveillance Frame"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <Camera className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. Control Dock */}
      <div className="p-5 sm:p-6 bg-slate-950 border-t border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Dropdown Selector (Corner A, B, C, D) */}
        <div className="flex-1 max-w-md">
          <label
            htmlFor="corner-dropdown-select"
            className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              Examination Corner Angle Selector
            </span>
            <span className="text-[10px] text-slate-500 font-mono">4 FIXED PTZ NODES</span>
          </label>

          <div className="relative">
            <select
              id="corner-dropdown-select"
              value={selectedCornerId}
              onChange={e => setSelectedCornerId(e.target.value)}
              className="w-full bg-slate-900 hover:bg-slate-850 text-slate-100 font-medium text-xs sm:text-sm rounded-xl border border-slate-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 px-3.5 py-2.5 pr-10 appearance-none transition-all cursor-pointer shadow-inner"
            >
              {CORNER_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Optical Sensor Mode */}
        <div className="hidden lg:flex flex-col">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Optical Sensor Mode
          </span>
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl gap-1">
            <button
              onClick={() => setOpticalFilter("normal")}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                opticalFilter === "normal"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setOpticalFilter("night")}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                opticalFilter === "night"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Night Vision
            </button>
            <button
              onClick={() => setOpticalFilter("mono")}
              className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                opticalFilter === "mono"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              B&amp;W Mono
            </button>
          </div>
        </div>

        {/* Action Toggle Button */}
        <div className="flex items-center">
          <button
            onClick={toggleFeed}
            className={`flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg active:scale-95 transition-all duration-200 border ${
              isFeedActive
                ? "bg-gradient-to-r from-rose-600 via-rose-500 to-red-600 hover:from-rose-500 hover:to-red-500 border-rose-400/40 shadow-rose-600/30"
                : "bg-gradient-to-r from-sky-600 via-sky-500 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 border-sky-400/40 shadow-sky-600/25"
            }`}
          >
            {isFeedActive ? <Square className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            <span>{isFeedActive ? "Stop Camera Feed" : "Start Local Camera Feed"}</span>
          </button>
        </div>
      </div>

      {/* 4. Footer Telemetry */}
      <div className="px-5 sm:px-6 py-3 bg-slate-950/70 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>
              HALL 01: <strong>40/40 SEATS OCCUPIED</strong>
            </span>
          </span>
          <span className="hidden sm:inline text-slate-700">•</span>
          <span className="hidden sm:inline">
            UFM PROCTOR: <strong>DR. A. MALHOTRA</strong>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>{currentCorner.azimuth}</span>
          <span className="text-emerald-400 font-bold">● TAMPER LOCK OK</span>
        </div>
      </div>
    </div>
  )
}
