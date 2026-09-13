// src/components/citizen/ProjectQrModal.tsx
//
// Reusable QR Code & Site Poster Modal for Project Ground-Truth Verification.
// Generates standard high-resolution SVG QR codes for public feedback URLs.

import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { projectById, type Project } from '@/lib/data';
import {
  X,
  Printer,
  Download,
  Copy,
  Check,
  QrCode,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  MapPin,
  Building2,
} from 'lucide-react';

export interface ProjectQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  projectId?: string;
  customBaseUrl?: string;
}

/**
 * Builds the canonical public feedback URL for a given project identifier.
 */
export function buildProjectFeedbackUrl(
  projectId: string | null | undefined,
  origin?: string
): string | null {
  if (!projectId || !projectId.trim()) return null;
  const cleanId = projectId.trim();
  const base =
    origin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://fraudguard.gov.in');
  return `${base}/feedback/${encodeURIComponent(cleanId)}`;
}

export default function ProjectQrModal({
  isOpen,
  onClose,
  project: propProject,
  projectId: propProjectId,
  customBaseUrl,
}: ProjectQrModalProps) {
  const [copied, setCopied] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  // Resolve project from props or data lookup
  const targetId = propProject?.id || propProjectId;
  const project: Project | null =
    propProject || (targetId ? projectById(targetId) || null : null);

  const qrUrl = buildProjectFeedbackUrl(targetId, customBaseUrl);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    if (!qrUrl) return;
    let success = false;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(qrUrl);
        success = true;
      }
    } catch {
      success = false;
    }

    if (!success) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = qrUrl;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        success = true;
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadSvg = () => {
    if (!targetId) return;
    const svgEl = document.getElementById('project-site-qr-svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `QR-Site-Poster-${targetId}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
    >
      {/* Printable CSS styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-site-poster, #printable-site-poster * {
            visibility: visible;
          }
          #printable-site-poster {
            position: fixed;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            padding: 30px;
            margin: 0;
            background: white !important;
            border: 2px solid #000 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <QrCode className="w-4 h-4" />
            </span>
            <div>
              <h2 id="qr-modal-title" className="text-sm font-bold text-slate-900">
                Public Site QR Poster
              </h2>
              <p className="text-[11px] text-slate-500">Citizen Ground-Truth & Inspection Portal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Poster */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Missing or Invalid Project Handling */}
          {!project || !qrUrl ? (
            <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-red-900">Project Not Found</h3>
                <p className="text-xs text-red-600">
                  {targetId
                    ? `Project identifier "${targetId}" was not found in the public works directory.`
                    : 'A valid project identifier is required to generate a site QR poster.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Official Site Poster Format */}
              <div
                ref={posterRef}
                id="printable-site-poster"
                className="bg-white border-2 border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-sm"
              >
                {/* Government / Platform Header */}
                <div className="border-b-2 border-slate-800 pb-3 space-y-1">
                  <div className="text-[10px] uppercase tracking-widest font-black text-slate-700">
                    Government of India • Public Works Monitoring
                  </div>
                  <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    MPLADS Citizen Accountability & Site Verification
                  </div>
                </div>

                {/* Project Header */}
                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 font-mono text-xs font-bold border border-slate-300">
                    {project.id}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                    {project.name}
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-600 pt-0.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {project.district}, {project.state}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-slate-500" />
                      {project.type}
                    </span>
                  </div>
                </div>

                {/* High-Resolution SVG QR Code */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block mx-auto shadow-inner">
                  <QRCodeSVG
                    id="project-site-qr-svg"
                    value={qrUrl}
                    size={200}
                    level="H"
                    includeMargin={false}
                    className="w-48 h-48 mx-auto"
                  />
                </div>

                {/* Public Call-to-Action */}
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">
                    Scan to report your experience at this project site
                  </p>
                  <p className="text-[11px] text-slate-600 max-w-xs mx-auto leading-relaxed">
                    Point your mobile camera at this QR code to verify physical progress, report
                    delays, or confirm asset completion.
                  </p>
                </div>

                {/* Sanctioned Budget Footer */}
                <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center text-[11px] text-slate-600">
                  <span>Sanctioned Budget: <strong>₹{project.allocated} Lakhs</strong></span>
                  <span>Agency: <strong>{project.vendor}</strong></span>
                </div>
              </div>

              {/* Public URL Box */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Public Feedback URL:</span>
                  <a
                    href={qrUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium text-[11px]"
                  >
                    Open Page <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={qrUrl}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-600 select-all"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium shrink-0 transition-colors shadow-sm"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Privacy & Advisory Notice */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-[11px] text-blue-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Advisory & Privacy Notice:</strong> Citizen submissions provide field-check signals and do not
                  constitute formal accusation. In demo mode, OTP verification is simulated and no actual SMS is sent.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-slate-900 font-medium transition-colors"
          >
            Close
          </button>

          {project && qrUrl && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadSvg}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download SVG</span>
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Site Poster</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
