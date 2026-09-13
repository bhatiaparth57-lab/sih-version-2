import { useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronRight, ExternalLink, FileText,
  HelpCircle, Link2, ShieldAlert, UserCheck, Building2, Eye
} from 'lucide-react';
import RiskBadge from '@/components/ui/RiskBadge';
import { RISK_COLOR, type Risk } from '@/lib/data';
import type {
  VendorIntelligenceProfile,
  VendorRelationship,
} from '@/lib/vendorTypes';
import { cn } from '@/lib/utils';

interface VendorIntelligencePanelProps {
  profile?: VendorIntelligenceProfile;
  selectedRelationship: VendorRelationship | null;
  onSelectVendor: (vendorId: string) => void;
  onClearRelationship: () => void;
}

export default function VendorIntelligencePanel({
  profile,
  selectedRelationship,
  onSelectVendor,
  onClearRelationship,
}: VendorIntelligencePanelProps) {
  const [activeTab, setActiveTab] = useState<'findings' | 'relationships' | 'projects' | 'scoring'>('findings');

  // If a relationship edge is selected on the graph, show relationship detail
  if (selectedRelationship) {
    return (
      <div className="card flex flex-col overflow-hidden border-edge bg-surface/90">
        <div className="border-b border-edge/60 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="chip !py-0.5 text-[10px] text-brand border-brand/30">
              RELATIONSHIP INSPECTION
            </span>
            <button
              onClick={onClearRelationship}
              className="text-[11px] text-mute hover:text-ink underline"
            >
              Back to Vendor Profile
            </button>
          </div>
          <h3 className="mt-2 text-[15px] font-bold text-ink">
            {selectedRelationship.title}
          </h3>
          <p className="mt-1 text-[12px] text-mute">{selectedRelationship.description}</p>
        </div>

        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between rounded-xl border border-edge bg-white/[0.02] p-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-faint font-semibold">Severity</div>
              <div className="mt-1">
                <RiskBadge level={selectedRelationship.severity} />
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-faint font-semibold">Confidence</div>
              <div className="mt-1 font-mono text-[13px] font-bold text-ink">
                {selectedRelationship.confidence}%
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-faint font-semibold">Category</div>
              <div className="mt-1 text-[11px] font-semibold text-brand">
                {selectedRelationship.relationshipType.replace(/_/g, ' ').toUpperCase()}
              </div>
            </div>
          </div>

          {/* Involved Entities */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-faint">Linked Entities</h4>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectVendor(selectedRelationship.sourceVendorId)}
                className="flex items-center justify-between rounded-lg border border-edge bg-white/[0.02] p-2.5 text-left transition hover:border-brand/40"
              >
                <div>
                  <div className="text-[12px] font-bold text-ink">{selectedRelationship.sourceVendorName}</div>
                  <div className="text-[10px] text-mute">Primary Entity</div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-faint" />
              </button>

              <button
                onClick={() => onSelectVendor(selectedRelationship.targetVendorId)}
                className="flex items-center justify-between rounded-lg border border-edge bg-white/[0.02] p-2.5 text-left transition hover:border-brand/40"
              >
                <div>
                  <div className="text-[12px] font-bold text-ink">{selectedRelationship.targetVendorName}</div>
                  <div className="text-[10px] text-mute">Connected Affiliate</div>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-faint" />
              </button>
            </div>
          </div>

          {/* Evidence Items */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-faint">Supporting Evidence</h4>
            <ul className="mt-2 space-y-1.5">
              {selectedRelationship.evidence.map((ev, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] text-mute rounded-lg border border-edge/60 bg-white/[0.01] p-2">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <span>{ev}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // If no vendor is selected, show placeholder
  if (!profile) {
    return (
      <div className="card flex flex-col items-center justify-center p-8 text-center border-edge bg-surface/90">
        <Building2 className="h-10 w-10 text-faint/50" />
        <h3 className="mt-3 text-sm font-bold text-ink">Select a Vendor</h3>
        <p className="mt-1 text-xs text-mute max-w-xs">
          Click any node on the collusion graph or choose a vendor from the directory to inspect its intelligence profile.
        </p>
      </div>
    );
  }

  const { vendor, riskScore, riskLevel, findings, scoreBreakdown, relationships, relatedProjects } = profile;

  return (
    <div className="card flex flex-col overflow-hidden border-edge bg-surface/90">
      {/* Header Banner */}
      <div className="border-b border-edge/60 bg-white/[0.02] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[16px] font-bold text-ink">{vendor.name}</h3>
              <RiskBadge level={riskLevel} />
            </div>
            <p className="mt-0.5 text-[11px] text-faint">
              PAN: {vendor.pan || 'N/A'} · GSTIN: {vendor.gstin || 'N/A'}
            </p>
          </div>

          {/* Risk Score Gauge Pill */}
          <div className="flex items-center gap-3 rounded-xl border border-edge/80 bg-black/40 px-3.5 py-1.5">
            <div>
              <div className="text-[9px] uppercase tracking-wider text-faint font-semibold">Collusion Risk</div>
              <div className="text-[15px] font-black font-mono text-ink">
                <span style={{ color: RISK_COLOR[riskLevel] }}>{riskScore}</span>
                <span className="text-faint text-[12px]"> / 100</span>
              </div>
            </div>
            <div className="h-7 w-[1px] bg-edge/60" />
            <div>
              <div className="text-[9px] uppercase tracking-wider text-faint font-semibold">Indicators</div>
              <div className="text-[13px] font-bold text-ink">{findings.length}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex items-center gap-1 border-b border-edge/40 pb-0.5 text-[12px]">
          <button
            onClick={() => setActiveTab('findings')}
            className={cn(
              'border-b-2 px-3 py-1.5 font-semibold transition',
              activeTab === 'findings'
                ? 'border-brand text-brand'
                : 'border-transparent text-faint hover:text-ink',
            )}
          >
            Findings ({findings.length})
          </button>
          <button
            onClick={() => setActiveTab('relationships')}
            className={cn(
              'border-b-2 px-3 py-1.5 font-semibold transition',
              activeTab === 'relationships'
                ? 'border-brand text-brand'
                : 'border-transparent text-faint hover:text-ink',
            )}
          >
            Affiliations ({relationships.length})
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={cn(
              'border-b-2 px-3 py-1.5 font-semibold transition',
              activeTab === 'projects'
                ? 'border-brand text-brand'
                : 'border-transparent text-faint hover:text-ink',
            )}
          >
            Projects ({relatedProjects.length})
          </button>
          <button
            onClick={() => setActiveTab('scoring')}
            className={cn(
              'border-b-2 px-3 py-1.5 font-semibold transition',
              activeTab === 'scoring'
                ? 'border-brand text-brand'
                : 'border-transparent text-faint hover:text-ink',
            )}
          >
            Scoring Breakdown
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 max-h-[520px] space-y-3">
        {activeTab === 'findings' && (
          <div className="space-y-3">
            {findings.length === 0 ? (
              <div className="rounded-xl border border-[#48d29b]/25 bg-[#48d29b]/[0.05] p-4 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-[#48d29b]" />
                <h4 className="mt-2 text-[13px] font-bold text-ink">No Collusion Indicators Detected</h4>
                <p className="mt-1 text-[11px] text-mute">
                  No overlapping corporate attributes, duplicated invoice identifiers, or suspicious billing velocity detected for this vendor.
                </p>
              </div>
            ) : (
              findings.map((finding) => (
                <div
                  key={finding.id}
                  className="rounded-xl border border-edge/80 bg-white/[0.02] p-3.5 transition hover:border-brand/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-brand">
                        <ShieldAlert className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-[13px] font-bold text-ink">{finding.title}</h4>
                        <p className="mt-1 text-[11.5px] text-mute leading-relaxed">{finding.detail}</p>
                      </div>
                    </div>
                    <span className="chip shrink-0 !py-0.5 text-[10px] font-bold text-[#ff8a3d]">
                      +{finding.points} pts
                    </span>
                  </div>

                  {/* Evidence Box */}
                  <div className="mt-3 rounded-lg border border-edge/50 bg-black/20 p-2.5">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-faint">Evidence Points:</div>
                    <ul className="mt-1.5 space-y-1">
                      {finding.evidence.map((ev, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-[11px] text-mute">
                          <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand" />
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Recommendation */}
                  <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-[#f0b64b]/20 bg-[#f0b64b]/[0.04] p-2 text-[11px] text-[#f0b64b]">
                    <span className="font-bold shrink-0">RECOMMENDED ACTION:</span>
                    <span>{finding.recommendedAction}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'relationships' && (
          <div className="space-y-2">
            {relationships.length === 0 ? (
              <p className="text-[12px] text-mute text-center py-6">No known affiliations or shared operational tokens.</p>
            ) : (
              relationships.map((rel) => {
                const isSource = rel.sourceVendorId === vendor.id;
                const otherId = isSource ? rel.targetVendorId : rel.sourceVendorId;
                const otherName = isSource ? rel.targetVendorName : rel.sourceVendorName;

                return (
                  <div
                    key={rel.id}
                    className="flex items-center justify-between rounded-xl border border-edge bg-white/[0.02] p-3 transition hover:border-brand/40"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <RiskBadge level={rel.severity} />
                        <span className="text-[12.5px] font-bold text-ink">{otherName}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-mute">{rel.title}</p>
                    </div>

                    <button
                      onClick={() => onSelectVendor(otherId)}
                      className="btn-outline !py-1 !px-2.5 text-[10.5px] shrink-0"
                    >
                      Inspect <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-2">
            {relatedProjects.length === 0 ? (
              <p className="text-[12px] text-mute text-center py-6">No projects currently assigned to this vendor.</p>
            ) : (
              relatedProjects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-edge bg-white/[0.02] p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11.5px] font-bold text-brand">{p.id}</span>
                      <RiskBadge level={p.risk} />
                    </div>
                    <div className="mt-0.5 text-[12px] font-semibold text-ink">{p.name}</div>
                    <div className="text-[10px] text-faint">{p.state} · {p.district}</div>
                  </div>

                  <div className="text-right">
                    <div className="text-[12px] font-bold text-ink">₹{p.spent}L / ₹{p.allocated}L</div>
                    <div className="text-[10px] text-mute">Status: {p.verify}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'scoring' && (
          <div className="space-y-2">
            <div className="rounded-xl border border-edge/60 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-faint pb-2 border-b border-edge/40">
                <span>Rule / Triggered Condition</span>
                <span>Points</span>
              </div>
              <div className="mt-2 space-y-1.5">
                {scoreBreakdown.length === 0 ? (
                  <div className="text-[11px] text-mute py-2">Baseline clean score (0 points contributed)</div>
                ) : (
                  scoreBreakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-[11.5px] text-ink py-1">
                      <span className="text-mute">{item.reason}</span>
                      <span className="font-mono font-bold text-[#ff8a3d]">+{item.points}</span>
                    </div>
                  ))
                )}
                <div className="flex items-center justify-between border-t border-edge/60 pt-2 text-[12px] font-bold text-ink">
                  <span>Total Calculated Risk Score (Capped at 100)</span>
                  <span className="font-mono" style={{ color: RISK_COLOR[riskLevel] }}>
                    {riskScore} / 100
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
