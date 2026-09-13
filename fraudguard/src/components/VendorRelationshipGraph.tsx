import { useMemo, useState } from 'react';
import {
  ZoomIn, ZoomOut, RotateCcw, Filter, AlertTriangle, ShieldCheck,
  Building2, FolderKanban, Link2
} from 'lucide-react';
import { RISK_COLOR, type Risk } from '@/lib/data';
import type {
  GraphEdge,
  GraphNode,
  VendorIntelligenceResult,
  VendorRecord,
  VendorRelationship,
} from '@/lib/vendorTypes';
import { cn } from '@/lib/utils';

interface VendorRelationshipGraphProps {
  analysis: VendorIntelligenceResult;
  vendors: VendorRecord[];
  selectedVendorId: string | null;
  selectedRelationshipId: string | null;
  onSelectVendor: (vendorId: string) => void;
  onSelectRelationship: (relationship: VendorRelationship | null) => void;
}

export default function VendorRelationshipGraph({
  analysis,
  vendors,
  selectedVendorId,
  selectedRelationshipId,
  onSelectVendor,
  onSelectRelationship,
}: VendorRelationshipGraphProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'suspicious' | 'high_risk'>('all');
  const [zoom, setZoom] = useState(1);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // SVG dimensions
  const width = 840;
  const height = 520;
  const centerX = width / 2;
  const centerY = height / 2;

  // Build Graph Nodes and Layout deterministically
  const { nodes, edges } = useMemo(() => {
    const graphNodes: GraphNode[] = [];
    const graphEdges: GraphEdge[] = [];

    // Filter vendors based on active filterMode
    const filteredVendors = vendors.filter((v) => {
      const profile = analysis.profiles[v.id];
      if (filterMode === 'high_risk') {
        return profile && (profile.riskLevel === 'CRITICAL' || profile.riskLevel === 'HIGH');
      }
      if (filterMode === 'suspicious') {
        return profile && profile.relationships.length > 0;
      }
      return true;
    });

    const vendorCount = filteredVendors.length;
    const vendorRadius = Math.min(width, height) * 0.34;

    // Position Vendor Nodes along an ellipse
    filteredVendors.forEach((v, index) => {
      const angle = (index / Math.max(1, vendorCount)) * 2 * Math.PI - Math.PI / 2;
      const x = centerX + Math.cos(angle) * vendorRadius;
      const y = centerY + Math.sin(angle) * (vendorRadius * 0.78);
      const profile = analysis.profiles[v.id];

      graphNodes.push({
        id: v.id,
        label: v.name,
        type: 'vendor',
        risk: profile?.riskLevel || v.risk || 'LOW',
        riskScore: profile?.riskScore ?? v.riskScore,
        x,
        y,
        meta: {
          pan: v.pan,
          value: `₹${v.totalValueCrore}Cr`,
        },
      });
    });

    // Position Connected Projects around the outer rim
    const projectSet = new Set<string>();
    filteredVendors.forEach((v) => {
      const profile = analysis.profiles[v.id];
      (profile?.relatedProjects || []).slice(0, 2).forEach((proj) => {
        if (!projectSet.has(proj.id)) {
          projectSet.add(proj.id);
          const vNode = graphNodes.find((n) => n.id === v.id);
          if (vNode) {
            // Offset slightly outside the vendor node
            const angle = Math.atan2(vNode.y - centerY, vNode.x - centerX) + (projectSet.size % 2 === 0 ? 0.35 : -0.35);
            const projDist = vendorRadius * 1.35;
            const px = centerX + Math.cos(angle) * projDist;
            const py = centerY + Math.sin(angle) * (projDist * 0.82);

            graphNodes.push({
              id: proj.id,
              label: proj.id,
              type: 'project',
              risk: proj.risk,
              riskScore: proj.riskScore,
              x: Math.max(50, Math.min(width - 50, px)),
              y: Math.max(40, Math.min(height - 40, py)),
              meta: {
                vendorName: v.name,
                value: `₹${proj.spent}L`,
              },
            });

            // Edge from vendor to project
            graphEdges.push({
              id: `edge-vp-${v.id}-${proj.id}`,
              source: v.id,
              target: proj.id,
              type: 'contract',
              isSuspicious: false,
            });
          }
        }
      });
    });

    // Build Suspicious Vendor-to-Vendor Edges
    analysis.allRelationships.forEach((rel) => {
      const sourceExists = graphNodes.some((n) => n.id === rel.sourceVendorId);
      const targetExists = graphNodes.some((n) => n.id === rel.targetVendorId);

      if (sourceExists && targetExists) {
        graphEdges.push({
          id: rel.id,
          source: rel.sourceVendorId,
          target: rel.targetVendorId,
          type: 'suspicious_link',
          relationshipType: rel.relationshipType,
          severity: rel.severity,
          label: rel.title,
          isSuspicious: true,
        });
      }
    });

    return { nodes: graphNodes, edges: graphEdges };
  }, [analysis, vendors, filterMode, width, height, centerX, centerY]);

  // Compute node map for fast lookup
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  // Helper to determine if an edge is highlighted
  function isEdgeActive(edge: GraphEdge): boolean {
    if (selectedRelationshipId && edge.id === selectedRelationshipId) return true;
    if (selectedVendorId && (edge.source === selectedVendorId || edge.target === selectedVendorId)) return true;
    if (hoveredNodeId && (edge.source === hoveredNodeId || edge.target === hoveredNodeId)) return true;
    return false;
  }

  // Helper to determine if a node is highlighted
  function isNodeActive(node: GraphNode): boolean {
    if (selectedVendorId === node.id) return true;
    if (hoveredNodeId === node.id) return true;
    if (selectedRelationshipId) {
      const rel = analysis.allRelationships.find((r) => r.id === selectedRelationshipId);
      if (rel && (rel.sourceVendorId === node.id || rel.targetVendorId === node.id)) return true;
    }
    return false;
  }

  return (
    <div className="card relative flex flex-col overflow-hidden border-edge bg-surface/90">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge/60 bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand/10 border border-brand/25 text-brand">
            <Link2 className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-[13px] font-bold text-ink tracking-wide">Interactive Collusion Graph</h2>
            <p className="text-[10px] text-mute">Nodes represent vendors & projects; highlighted links indicate potential collusion</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex items-center rounded-lg border border-edge bg-white/[0.03] p-0.5 text-[11px]">
            <button
              onClick={() => setFilterMode('all')}
              className={cn(
                'rounded-md px-2.5 py-1 font-semibold transition',
                filterMode === 'all' ? 'bg-brand/20 text-brand' : 'text-faint hover:text-ink',
              )}
            >
              All Entities
            </button>
            <button
              onClick={() => setFilterMode('suspicious')}
              className={cn(
                'rounded-md px-2.5 py-1 font-semibold transition',
                filterMode === 'suspicious' ? 'bg-[#ff5860]/20 text-[#ff5860]' : 'text-faint hover:text-ink',
              )}
            >
              Flagged Ties Only
            </button>
            <button
              onClick={() => setFilterMode('high_risk')}
              className={cn(
                'rounded-md px-2.5 py-1 font-semibold transition',
                filterMode === 'high_risk' ? 'bg-[#ff8a3d]/20 text-[#ff8a3d]' : 'text-faint hover:text-ink',
              )}
            >
              High/Critical Risk
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-lg border border-edge bg-white/[0.03] p-0.5">
            <button
              onClick={() => setZoom((z) => Math.min(1.6, z + 0.15))}
              className="rounded p-1 text-mute hover:bg-white/5 hover:text-ink"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
              className="rounded p-1 text-mute hover:bg-white/5 hover:text-ink"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="rounded p-1 text-mute hover:bg-white/5 hover:text-ink"
              title="Reset View"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative h-[480px] w-full overflow-hidden bg-canvas/60">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full select-none"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.25s ease-out',
          }}
        >
          <defs>
            {/* Pulsing Gradient for Critical Ties */}
            <linearGradient id="critLinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff5860" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#ff8a3d" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ff5860" stopOpacity="0.9" />
            </linearGradient>

            {/* Glowing filter for highlighted ties */}
            <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid Pattern */}
          <g opacity="0.12">
            {Array.from({ length: 15 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1={0}
                y1={i * 40}
                x2={width}
                y2={i * 40}
                stroke="#48d29b"
                strokeWidth="0.5"
                strokeDasharray="2,6"
              />
            ))}
            {Array.from({ length: 22 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * 40}
                y1={0}
                x2={i * 40}
                y2={height}
                stroke="#48d29b"
                strokeWidth="0.5"
                strokeDasharray="2,6"
              />
            ))}
          </g>

          {/* Render Normal Contract Edges */}
          <g>
            {edges
              .filter((e) => !e.isSuspicious)
              .map((edge) => {
                const s = nodeMap.get(edge.source);
                const t = nodeMap.get(edge.target);
                if (!s || !t) return null;
                const active = isEdgeActive(edge);

                return (
                  <line
                    key={edge.id}
                    x1={s.x}
                    y1={s.y}
                    x2={t.x}
                    y2={t.y}
                    stroke={active ? '#48d29b' : '#323b49'}
                    strokeWidth={active ? 1.8 : 1}
                    strokeDasharray={active ? 'none' : '3,3'}
                    opacity={active ? 0.9 : 0.4}
                  />
                );
              })}
          </g>

          {/* Render Suspicious Relationship Edges */}
          <g>
            {edges
              .filter((e) => e.isSuspicious)
              .map((edge) => {
                const s = nodeMap.get(edge.source);
                const t = nodeMap.get(edge.target);
                if (!s || !t) return null;
                const active = isEdgeActive(edge);
                const isCrit = edge.severity === 'CRITICAL';
                const strokeColor = isCrit ? '#ff5860' : edge.severity === 'HIGH' ? '#ff8a3d' : '#f0b64b';

                return (
                  <g
                    key={edge.id}
                    className="cursor-pointer transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rel = analysis.allRelationships.find((r) => r.id === edge.id);
                      if (rel) onSelectRelationship(rel);
                    }}
                  >
                    {/* Wider invisible hit-test stroke */}
                    <line x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="transparent" strokeWidth={16} />

                    {/* Visible line */}
                    <line
                      x1={s.x}
                      y1={s.y}
                      x2={t.x}
                      y2={t.y}
                      stroke={strokeColor}
                      strokeWidth={active ? 3.5 : 2.2}
                      strokeDasharray={isCrit ? '6,3' : '5,5'}
                      opacity={active ? 1 : 0.75}
                      filter={active || isCrit ? 'url(#glowEffect)' : undefined}
                    />

                    {/* Relationship Badge in the middle */}
                    <circle
                      cx={(s.x + t.x) / 2}
                      cy={(s.y + t.y) / 2}
                      r={7}
                      fill="#0f141c"
                      stroke={strokeColor}
                      strokeWidth={1.5}
                    />
                    <text
                      x={(s.x + t.x) / 2}
                      y={(s.y + t.y) / 2 + 3}
                      fill={strokeColor}
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      !
                    </text>
                  </g>
                );
              })}
          </g>

          {/* Render Nodes */}
          <g>
            {nodes.map((node) => {
              const active = isNodeActive(node);
              const color = RISK_COLOR[node.risk];
              const isVendor = node.type === 'vendor';

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isVendor) {
                      onSelectVendor(node.id);
                      onSelectRelationship(null);
                    }
                  }}
                >
                  {isVendor ? (
                    // VENDOR NODE: Circular badge
                    <>
                      {/* Selection ring */}
                      {active && (
                        <circle
                          r={28}
                          fill="none"
                          stroke={color}
                          strokeWidth={2}
                          strokeDasharray="4,3"
                          opacity={0.8}
                        >
                          <animateTransform
                            attributeName="transform"
                            type="rotate"
                            from="0"
                            to="360"
                            dur="16s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}

                      {/* Main Node Body */}
                      <circle
                        r={22}
                        fill="#121721"
                        stroke={active ? '#ffffff' : color}
                        strokeWidth={active ? 2.5 : 1.8}
                        filter={active ? 'url(#glowEffect)' : undefined}
                      />

                      {/* Risk Score indicator inside */}
                      <text
                        y={-2}
                        fill={color}
                        fontSize="10"
                        fontWeight="bold"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {node.riskScore}
                      </text>
                      <text
                        y={9}
                        fill="#64748b"
                        fontSize="7"
                        fontWeight="semibold"
                        textAnchor="middle"
                        letterSpacing="0.05em"
                      >
                        RISK
                      </text>

                      {/* Vendor Label */}
                      <g transform="translate(0, 32)">
                        <rect
                          x={-node.label.length * 3.4}
                          y={-9}
                          width={node.label.length * 6.8}
                          height={16}
                          rx={4}
                          fill="#0b0f16"
                          stroke={active ? color : '#242e3f'}
                          strokeWidth={1}
                          opacity={0.95}
                        />
                        <text
                          y={3}
                          fill={active ? '#ffffff' : '#cbd5e1'}
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {node.label}
                        </text>
                      </g>
                    </>
                  ) : (
                    // PROJECT NODE: Rounded square badge
                    <>
                      <rect
                        x={-14}
                        y={-14}
                        width={28}
                        height={28}
                        rx={6}
                        fill="#151d2c"
                        stroke={active ? '#48d29b' : '#334155'}
                        strokeWidth={active ? 2 : 1}
                      />
                      <FolderKanban className="h-4 w-4" x={-8} y={-8} color={active ? '#48d29b' : '#64748b'} />

                      {/* Project ID text */}
                      <text
                        y={24}
                        fill="#94a3b8"
                        fontSize="8"
                        fontWeight="medium"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {node.label}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Legend */}
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-xl border border-edge/80 bg-surface/90 px-3 py-2 text-[10px] text-mute shadow-lg backdrop-blur-md">
          <span className="font-semibold text-ink uppercase tracking-wider">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ff5860]" /> Critical Collusion Link
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ff8a3d]" /> High-Risk Tie
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#48d29b]" /> Low Risk / Normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded bg-[#1e293b] border border-[#334155]" /> Project Node
          </span>
        </div>
      </div>
    </div>
  );
}
