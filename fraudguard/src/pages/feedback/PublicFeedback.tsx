// src/pages/feedback/PublicFeedback.tsx
//
// Public, unauthenticated page reached by scanning a QR poster at a project site.
// Registered as a top-level route in App.tsx outside the authenticated <Shell />.

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PROJECTS, COORDS, projectById } from '@/lib/data';
import CitizenFeedbackForm, { type FormProject } from '@/components/citizen/CitizenFeedbackForm';
import ProjectQrModal from '@/components/citizen/ProjectQrModal';
import {
  Building2,
  MapPin,
  IndianRupee,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  HelpCircle,
  QrCode,
} from 'lucide-react';

interface ResolvedPublicProject extends FormProject {
  name: string;
  district: string;
  state: string;
  department: string;
  status: string;
  amountSanctionedLakhs: number;
  vendorName: string;
}

export default function PublicFeedback() {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<ResolvedPublicProject | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setError('No project identifier was provided in the QR code or link.');
      setLoading(false);
      return;
    }

    // Resolve project from authentic PROJECTS registry
    const found =
      projectById(projectId) ||
      PROJECTS.find((p) => p.id.toLowerCase() === projectId.toLowerCase());

    if (found) {
      const coords = COORDS[found.id];
      const lat = found.lat ?? (coords ? coords[1] : null);
      const lon = found.lon ?? (coords ? coords[0] : null);

      const statusLabel =
        found.verify === 'Verified'
          ? 'Completed & Verified'
          : found.verify === 'Failed'
          ? 'Under Technical Review'
          : found.verify === 'Field Visit'
          ? 'Inspection Scheduled'
          : 'Active / In Progress';

      setProject({
        id: found.id,
        name: found.name,
        district: found.district,
        state: found.state,
        department: found.type,
        status: statusLabel,
        amountSanctionedLakhs: found.allocated,
        vendorName: found.vendor,
        latitude: lat,
        longitude: lon,
      });
      setError(null);
      setLoading(false);
      return;
    }

    // If not found in static registry
    setError(`Project ID "${projectId}" was not found in the public works registry.`);
    setProject(null);
    setLoading(false);
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4 text-slate-500 text-xs">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        Resolving project details…
      </div>
    );
  }

  // Error screen if invalid project ID
  if (error || !project) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              FG
            </span>
            <div>
              <span className="font-bold text-slate-900 text-sm block leading-tight">FraudGuard Citizen Portal</span>
              <span className="text-[11px] text-slate-500">Public Procurement Ground-Truth Verification</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-slate-900">Project Not Found</h2>
              <p className="text-xs text-slate-500">{error ?? 'Invalid project QR code.'}</p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Select a registered sample project to test:
              </div>
              <div className="grid grid-cols-1 gap-1.5 pt-1">
                {[
                  { id: 'MP-DEL-2026-0142', name: 'Health Dispensary Sub-Centre', loc: 'North West Delhi' },
                  { id: 'MP-KA-2026-0551', name: 'Sub-Minor Irrigation Canal', loc: 'Belagavi, Karnataka' },
                  { id: 'MP-TN-2026-1120', name: 'Panchayat Road Drainage', loc: 'Vellore, Tamil Nadu' },
                  { id: 'MP-WB-2026-0603', name: 'Community Water Points', loc: 'Hooghly, West Bengal' },
                ].map((sample) => (
                  <Link
                    key={sample.id}
                    to={`/feedback/${sample.id}`}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                  >
                    <div>
                      <div className="font-medium text-slate-900 text-xs">{sample.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {sample.id} • {sample.loc}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-md space-y-4">
        {/* Header Branding */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
              FG
            </span>
            <div>
              <span className="font-bold text-slate-900 text-sm block leading-tight">FraudGuard Citizen Portal</span>
              <span className="text-[11px] text-slate-500">Public Works Ground-Truth Verification</span>
            </div>
          </div>
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Site QR Poster</span>
          </button>
        </div>

        {/* Project QR Modal */}
        <ProjectQrModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          projectId={project.id}
        />

        {/* Project Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
              Project Identifier
            </span>
            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
              {project.id}
            </span>
          </div>

          <div>
            <h1 className="text-base font-bold text-slate-900 leading-snug">{project.name}</h1>
            <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {project.district}, {project.state}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1 text-slate-400 text-[11px] mb-0.5">
                <IndianRupee className="w-3 h-3" />
                <span>Sanctioned Budget</span>
              </div>
              <div className="font-semibold text-slate-800">₹{project.amountSanctionedLakhs.toFixed(1)} Lakhs</div>
            </div>

            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1 text-slate-400 text-[11px] mb-0.5">
                <Building2 className="w-3 h-3" />
                <span>Official Status</span>
              </div>
              <div className="font-semibold text-slate-800 truncate">{project.status}</div>
            </div>
          </div>
        </div>

        {/* Citizen Feedback Form with 5-Step Flow */}
        <CitizenFeedbackForm project={project} />

        {/* Privacy Notice Footer */}
        <div className="flex items-start gap-2 p-3 bg-slate-100/80 rounded-xl text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <p>
            FraudGuard Citizen Portal protects citizen privacy. Your mobile number is salted into an anonymous token.
            Exact GPS coordinates are never stored or displayed to auditors.
          </p>
        </div>
      </div>
    </div>
  );
}