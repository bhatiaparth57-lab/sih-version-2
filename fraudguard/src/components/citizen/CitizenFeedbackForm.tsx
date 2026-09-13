// src/components/citizen/CitizenFeedbackForm.tsx

import { useState } from 'react';
import type {
  ObservedProgressStatus,
  CitizenFeedbackIssue,
  CitizenFeedbackRecord,
  ProximityStatus,
} from '@/lib/citizenFeedbackTypes';
import {
  sanitizeAndCreateFeedbackRecord,
  saveDemoFeedbackRecord,
  computeDistanceMeters,
  roundToCoarseDistance,
  classifyProximityFromDistance,
  DEMO_OTP_NOTICE,
} from '@/lib/citizenFeedbackDemoData';
import {
  CheckCircle2,
  AlertTriangle,
  MapPin,
  ShieldCheck,
  Smartphone,
  Star,
  Camera,
  RefreshCw,
} from 'lucide-react';

export interface FormProject {
  id: string;
  name?: string;
  district?: string;
  latitude: number | null;
  longitude: number | null;
}

type Step = 'location' | 'phone' | 'otp' | 'feedback' | 'done';

const STATUS_OPTIONS: {
  value: ObservedProgressStatus;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'completed',
    label: 'Completed & Operational',
    description: 'Structure is finished and delivering public services',
    icon: '✅',
  },
  {
    value: 'in_progress',
    label: 'Under Active Construction',
    description: 'Labor and machinery actively working on site',
    icon: '🚧',
  },
  {
    value: 'abandoned',
    label: 'Work Inactive / Stalled',
    description: 'No active work observed, machinery removed, or stalled',
    icon: '⏸️',
  },
  {
    value: 'not_started',
    label: 'Not Started / No Structure',
    description: 'No physical construction visible at this location',
    icon: '❌',
  },
];

const ISSUE_OPTIONS: { id: CitizenFeedbackIssue; label: string }[] = [
  { id: 'no_work_visible', label: 'No laborers or active machinery present' },
  { id: 'substandard_materials', label: 'Substandard materials / visible cracks' },
  { id: 'delayed_timeline', label: 'Significantly delayed past target date' },
  { id: 'site_abandoned', label: 'Site abandoned or tools removed' },
  { id: 'signboard_missing', label: 'Mandatory public project board missing' },
  { id: 'access_blocked', label: 'Public access is blocked or locked' },
];

export default function CitizenFeedbackForm({ project }: { project: FormProject }) {
  const [step, setStep] = useState<Step>('location');

  // Location state (in-memory only; exact lat/lon never saved to record)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [coarseDistance, setCoarseDistance] = useState<number | null>(null);
  const [proximityStatus, setProximityStatus] = useState<ProximityStatus>('unverified');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  // Verification state (phone is hashed into token; never stored)
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  // Observation state
  const [observedStatus, setObservedStatus] = useState<ObservedProgressStatus>('in_progress');
  const [qualityRating, setQualityRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [selectedIssues, setSelectedIssues] = useState<CitizenFeedbackIssue[]>([]);
  const [comment, setComment] = useState('');
  const [hasPhotoProof, setHasPhotoProof] = useState(false);

  // Persistence result
  const [createdRecord, setCreatedRecord] = useState<CitizenFeedbackRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const requestLocation = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser. You may continue without location.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        setLocation({ lat: userLat, lng: userLng });

        if (project.latitude !== null && project.longitude !== null) {
          const rawMeters = computeDistanceMeters(
            userLat,
            userLng,
            project.latitude,
            project.longitude
          );
          const rounded = roundToCoarseDistance(rawMeters);
          setCoarseDistance(rounded);
          setProximityStatus(classifyProximityFromDistance(rawMeters));
        } else {
          setProximityStatus('unverified');
        }
        setStep('phone');
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) {
          setLocationError('Location permission was denied. You may continue without location verification.');
        } else {
          setLocationError('Unable to acquire GPS signal. You may continue without location verification.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const skipLocation = () => {
    setLocation(null);
    setCoarseDistance(null);
    setProximityStatus('unverified');
    setStep('phone');
  };

  const handlePhoneSubmit = () => {
    if (phone.replace(/\D/g, '').length < 10) {
      setSubmitError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setSubmitError(null);
    setStep('otp');
  };

  const handleOtpVerify = () => {
    if (otp.trim().length < 4) {
      setSubmitError('Please enter the 6-digit verification code.');
      return;
    }
    setSubmitError(null);
    setStep('feedback');
  };

  const toggleIssue = (issue: CitizenFeedbackIssue) => {
    setSelectedIssues((prev) =>
      prev.includes(issue) ? prev.filter((i) => i !== issue) : [...prev, issue]
    );
  };

  const submitFeedback = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Create privacy-sanitized feedback record
      const record = sanitizeAndCreateFeedbackRecord({
        projectId: project.id,
        rawPhoneInput: phone,
        otpInput: otp,
        observedStatus,
        qualityRating,
        issuesReported: selectedIssues,
        comment: comment.trim() || undefined,
        hasPhotoProof,
        citizenCoordinates: location ? { latitude: location.lat, longitude: location.lng } : null,
        projectCoordinates:
          project.latitude !== null && project.longitude !== null
            ? { latitude: project.latitude, longitude: project.longitude }
            : null,
      });

      // Save to demo localStorage persistence adapter
      saveDemoFeedbackRecord(record);
      setCreatedRecord(record);
      setSubmitting(false);
      setStep('done');
    } catch {
      setSubmitError('Could not save feedback. Please try again.');
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('location');
    setLocation(null);
    setCoarseDistance(null);
    setProximityStatus('unverified');
    setLocationError(null);
    setPhone('');
    setOtp('');
    setObservedStatus('in_progress');
    setQualityRating(4);
    setSelectedIssues([]);
    setComment('');
    setHasPhotoProof(false);
    setCreatedRecord(null);
    setSubmitError(null);
  };

  // STEP 5: DONE / RECEIPT
  if (step === 'done' && createdRecord) {
    const proximityBadge =
      createdRecord.proximityStatus === 'on_site'
        ? { label: 'Verified On-Site (< 150m)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
        : createdRecord.proximityStatus === 'proximate'
        ? {
            label: `Proximate Area (~${createdRecord.coarseDistanceMeters}m)`,
            color: 'bg-blue-50 text-blue-700 border-blue-200',
          }
        : createdRecord.proximityStatus === 'distant'
        ? { label: 'Remote Submission (> 1km)', color: 'bg-amber-50 text-amber-700 border-amber-200' }
        : { label: 'Proximity Unverified', color: 'bg-slate-50 text-slate-700 border-slate-200' };

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Observation Recorded</h2>
          <p className="text-xs text-slate-500">
            Thank you for contributing to public accountability and transparent infrastructure audit.
          </p>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Project Identifier</span>
            <span className="font-mono font-medium text-slate-800">{createdRecord.projectId}</span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Anonymous Audit Token</span>
            <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              {createdRecord.citizenToken}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Physical Status Observed</span>
            <span className="font-medium capitalize text-slate-800">
              {createdRecord.observedStatus.replace('_', ' ')}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
            <span className="text-slate-500">Site Proximity</span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${proximityBadge.color}`}>
              {proximityBadge.label}
            </span>
          </div>

          <div className="flex justify-between items-center py-1">
            <span className="text-slate-500">Quality Rating</span>
            <div className="flex items-center gap-1 text-amber-500">
              {Array.from({ length: createdRecord.qualityRating }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
              <span className="text-slate-600 font-medium ml-1">({createdRecord.qualityRating}/5)</span>
            </div>
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-[11px] text-blue-800 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Demo Storage Notice:</span> Persisted to local browser storage.
            This entry immediately feeds into the internal auditor discrepancy analysis on this machine.
          </div>
        </div>

        <button
          onClick={resetForm}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Submit Another Observation
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
      {/* Progress indicator */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
        <span className="font-semibold text-slate-700">
          {step === 'location' && 'Step 1 of 4: Site Verification'}
          {step === 'phone' && 'Step 2 of 4: Citizen Verification'}
          {step === 'otp' && 'Step 3 of 4: Confirm Code'}
          {step === 'feedback' && 'Step 4 of 4: Ground Observation'}
        </span>
        <div className="flex gap-1">
          {['location', 'phone', 'otp', 'feedback'].map((s, idx) => {
            const currentIdx = ['location', 'phone', 'otp', 'feedback'].indexOf(step);
            return (
              <span
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  idx <= currentIdx ? 'w-4 bg-blue-600' : 'w-1.5 bg-slate-200'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* STEP 1: LOCATION */}
      {step === 'location' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-900 text-sm">Verify On-Site Location</h3>
            <p className="text-xs text-slate-500">
              Confirming you are near the project site ensures your feedback is prioritized as verified ground truth.
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-slate-800">Privacy Safeguard:</span> Your exact GPS coordinates are
              never saved or displayed publicly. We calculate coarse proximity only.
            </div>
          </div>

          {locationError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>{locationError}</div>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              onClick={requestLocation}
              disabled={locating}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl py-3 font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <MapPin className="w-4 h-4" />
              {locating ? 'Checking Site Proximity…' : 'Share My Location (Recommended)'}
            </button>

            <button
              onClick={skipLocation}
              className="w-full text-slate-500 hover:text-slate-800 py-2 text-xs font-medium text-center transition-colors"
            >
              Continue without location verification
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PHONE */}
      {step === 'phone' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-900 text-sm">Citizen Verification</h3>
            <p className="text-xs text-slate-500">
              Enter your mobile number to generate a secure, anonymous citizen audit token.
            </p>
          </div>

          {proximityStatus !== 'unverified' && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-2.5 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Site proximity captured: <strong className="capitalize">{proximityStatus.replace('_', ' ')}</strong>
                {coarseDistance !== null && ` (~${coarseDistance}m)`}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Mobile Number</label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-sm text-slate-400 font-medium">+91</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full border border-slate-300 rounded-xl pl-12 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={14}
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 text-slate-600 text-[11px] p-3 rounded-xl flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-slate-800">Privacy by Design:</span> Your number is hashed into an
              anonymous identifier (<code className="font-mono text-blue-700">CTZ-TOK-XXXX</code>). Plaintext numbers are
              never saved or shown to auditors.
            </div>
          </div>

          {submitError && <p className="text-xs text-red-500">{submitError}</p>}

          <button
            onClick={handlePhoneSubmit}
            disabled={phone.replace(/\D/g, '').length < 10}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl py-3 font-medium text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            Send Verification Code
          </button>
        </div>
      )}

      {/* STEP 3: OTP */}
      {step === 'otp' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-900 text-sm">Enter Verification Code</h3>
            <p className="text-xs text-slate-500">Confirm the 6-digit code to finalize authentication.</p>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 text-amber-900 text-xs p-3 rounded-xl flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Simulated Demo Verification:</span>
              <p className="text-[11px] text-amber-800 mt-0.5">{DEMO_OTP_NOTICE}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">6-Digit Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="e.g. 123456"
              className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {submitError && <p className="text-xs text-red-500">{submitError}</p>}

          <div className="space-y-2">
            <button
              onClick={handleOtpVerify}
              disabled={otp.length < 4}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl py-3 font-medium text-sm transition-colors"
            >
              Verify & Continue
            </button>
            <button
              onClick={() => setStep('phone')}
              className="w-full text-slate-500 hover:text-slate-800 py-1.5 text-xs text-center transition-colors"
            >
              Change phone number
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: FEEDBACK & RATING */}
      {step === 'feedback' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-900 text-sm">Site Observation</h3>
            <p className="text-xs text-slate-500">
              Share what you observe at the project location today.
            </p>
          </div>

          {/* Observed Status Radios */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">What is the physical progress status?</label>
            <div className="grid grid-cols-1 gap-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = observedStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setObservedStatus(opt.value)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-base">{opt.icon}</span>
                    <div>
                      <div className="text-xs font-medium text-slate-900">{opt.label}</div>
                      <div className="text-[11px] text-slate-500 leading-tight">{opt.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quality Rating */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-slate-700">Overall Construction & Finishing Quality</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQualityRating(val as 1 | 2 | 3 | 4 | 5)}
                  className={`p-2 rounded-xl border transition-all ${
                    qualityRating >= val
                      ? 'border-amber-400 bg-amber-50 text-amber-500'
                      : 'border-slate-200 text-slate-300 hover:text-slate-400'
                  }`}
                >
                  <Star className={`w-5 h-5 ${qualityRating >= val ? 'fill-current' : ''}`} />
                </button>
              ))}
              <span className="text-xs font-medium text-slate-600 ml-1">
                {qualityRating === 1 && '1/5 — Very Poor'}
                {qualityRating === 2 && '2/5 — Substandard'}
                {qualityRating === 3 && '3/5 — Average'}
                {qualityRating === 4 && '4/5 — Good'}
                {qualityRating === 5 && '5/5 — Excellent'}
              </span>
            </div>
          </div>

          {/* Specific Issues Checkboxes */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-semibold text-slate-700">Any specific issues noticed? (Optional)</label>
            <div className="grid grid-cols-1 gap-1">
              {ISSUE_OPTIONS.map((iss) => {
                const checked = selectedIssues.includes(iss.id);
                return (
                  <label
                    key={iss.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'border-blue-300 bg-blue-50 text-blue-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleIssue(iss.id)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>{iss.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Comments */}
          <div className="space-y-1 pt-1">
            <label className="block text-xs font-semibold text-slate-700">Observation Notes (Optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe physical progress, machinery present, or local community feedback..."
              rows={2}
              className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={500}
            />
          </div>

          {/* Photo evidence toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={hasPhotoProof}
              onChange={(e) => setHasPhotoProof(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-slate-500" />
              I took photo or video evidence of this site
            </span>
          </label>

          {submitError && <p className="text-xs text-red-500">{submitError}</p>}

          <button
            onClick={submitFeedback}
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl py-3 font-medium text-sm transition-colors shadow-sm"
          >
            {submitting ? 'Submitting Observation…' : 'Submit Ground-Truth Observation'}
          </button>
        </div>
      )}
    </div>
  );
}
