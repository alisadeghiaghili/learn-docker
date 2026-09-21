import type { ReactNode } from 'react';
import type { DockerState } from '../engine/types';
import type { Selection } from './appState';

interface Props {
  state: DockerState;
  selection: Selection;
  onSelect: (selection: Selection) => void;
}

const ZONE = {
  registry: { x: 24, y: 40, w: 150, h: 360, label: 'REGISTRY' },
  images: { x: 194, y: 40, w: 200, h: 360, label: 'IMAGES' },
  containers: { x: 414, y: 40, w: 280, h: 360, label: 'CONTAINERS' },
  volumes: { x: 714, y: 40, w: 130, h: 360, label: 'VOLUMES' },
  networks: { x: 864, y: 40, w: 140, h: 360, label: 'NETWORKS' },
};

function statusColor(status: string): string {
  if (status === 'running') return 'var(--run)';
  if (status === 'exited') return 'var(--exit)';
  return 'var(--stop)';
}

export function Schematic({ state, selection, onSelect }: Props) {
  const imageById = new Map(state.images.map((i) => [i.imageId, i]));

  return (
    <svg
      className="schematic"
      viewBox="0 0 1028 420"
      role="img"
      aria-label="Docker daemon schematic"
    >
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="var(--muted)" />
        </marker>
      </defs>

      {Object.values(ZONE).map((zone) => (
        <g key={zone.label}>
          <rect
            x={zone.x}
            y={zone.y}
            width={zone.w}
            height={zone.h}
            rx={8}
            fill="rgba(18,26,42,0.55)"
            stroke="var(--line)"
            strokeWidth={1}
          />
          <text
            x={zone.x + 10}
            y={zone.y + 18}
            fill="var(--muted)"
            fontSize={11}
            fontFamily="var(--mono)"
            letterSpacing="0.08em"
          >
            {zone.label}
          </text>
        </g>
      ))}

      {/* Registry catalog (always visible as available pulls) */}
      {REGISTRY_PREVIEW.map((name, i) => (
        <g key={name} transform={`translate(${ZONE.registry.x + 12}, ${ZONE.registry.y + 40 + i * 44})`}>
          <rect
            width={ZONE.registry.w - 24}
            height={36}
            rx={6}
            fill="var(--panel-2)"
            stroke="var(--line)"
          />
          <text x={10} y={22} fill="var(--muted)" fontSize={11} fontFamily="var(--mono)">
            {name}
          </text>
        </g>
      ))}

      {/* Images with layers */}
      {state.images.map((img, i) => {
        const y = ZONE.images.y + 40 + i * 72;
        const selected = selection?.kind === 'image' && selection.id === img.imageId;
        return (
          <g
            key={img.imageId}
            transform={`translate(${ZONE.images.x + 10}, ${y})`}
            onClick={() => onSelect({ kind: 'image', id: img.imageId })}
            style={{ cursor: 'pointer' }}
            className="node-image"
          >
            <rect
              width={ZONE.images.w - 20}
              height={64}
              rx={6}
              fill={selected ? 'rgba(36,150,237,0.16)' : 'var(--panel-2)'}
              stroke={selected ? 'var(--accent)' : 'var(--line)'}
            />
            <text x={8} y={16} fill="var(--ink)" fontSize={12} fontFamily="var(--mono)">
              {img.name}
            </text>
            <text x={8} y={32} fill="var(--muted)" fontSize={10} fontFamily="var(--mono)">
              {img.layers.length} layers · {(img.sizeKb / 1000).toFixed(1)} MB
            </text>
            {img.layers.slice(0, 4).map((layer, li) => (
              <g key={layer.id} transform={`translate(${8 + li * 36}, 40)`}>
                <rect
                  width={32}
                  height={16}
                  rx={3}
                  fill="var(--layer)"
                  opacity={0.75}
                />
                <text x={4} y={12} fill="#1a1008" fontSize={9} fontFamily="var(--mono)">
                  L{li + 1}
                </text>
              </g>
            ))}
            {img.layers.length > 4 && (
              <text x={8 + 4 * 36} y={52} fill="var(--muted)" fontSize={10}>
                +{img.layers.length - 4}
              </text>
            )}
          </g>
        );
      })}

      {/* Containers */}
      {state.containers.map((c, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = ZONE.containers.x + 12 + col * 134;
        const y = ZONE.containers.y + 40 + row * 88;
        const selected = selection?.kind === 'container' && (selection.id === c.id || selection.id === c.name);
        const img = imageById.get(c.imageId);
        return (
          <g key={c.id} style={{ cursor: 'pointer' }} onClick={() => onSelect({ kind: 'container', id: c.id })}>
            {/* link to image zone */}
            {img && i < state.images.length && (
              <path
                d={`M ${ZONE.images.x + ZONE.images.w - 10} ${ZONE.images.y + 40 + Math.min(i, state.images.length - 1) * 72 + 32} C ${ZONE.containers.x - 20} ${y + 30}, ${x - 20} ${y + 30}, ${x} ${y + 30}`}
                stroke="var(--line)"
                fill="none"
                strokeWidth={1}
                markerEnd="url(#arrow)"
              />
            )}
            <g transform={`translate(${x}, ${y})`}>
              <rect
                width={124}
                height={76}
                rx={6}
                fill={selected ? 'rgba(36,150,237,0.16)' : 'var(--panel-2)'}
                stroke={selected ? 'var(--accent)' : 'var(--line)'}
              />
              <text x={8} y={16} fill="var(--ink)" fontSize={12} fontFamily="var(--mono)">
                {c.name.length > 14 ? c.name.slice(0, 13) + '…' : c.name}
              </text>
              <text x={8} y={32} fill="var(--muted)" fontSize={10} fontFamily="var(--mono)">
                {c.image}
              </text>
              <rect x={8} y={40} width={54} height={16} rx={8} fill={statusColor(c.status)} opacity={0.2} />
              <circle cx={16} cy={48} r={4} fill={statusColor(c.status)} />
              <text x={24} y={52} fill={statusColor(c.status)} fontSize={10} fontFamily="var(--mono)">
                {c.status}
              </text>
              {c.ports.length > 0 && (
                <text x={8} y={68} fill="var(--accent)" fontSize={10} fontFamily="var(--mono)">
                  {c.ports[0].hostPort}→{c.ports[0].containerPort}
                </text>
              )}
              {c.volumeMounts.length > 0 && (
                <text x={70} y={68} fill="var(--vol)" fontSize={10} fontFamily="var(--mono)">
                  vol
                </text>
              )}
            </g>
          </g>
        );
      })}

      {/* Volumes as cylinders */}
      {state.volumes.map((v, i) => {
        const y = ZONE.volumes.y + 48 + i * 64;
        const selected = selection?.kind === 'volume' && selection.name === v.name;
        return (
          <g key={v.name} transform={`translate(${ZONE.volumes.x + 14}, ${y})`} style={{ cursor: 'pointer' }} onClick={() => onSelect({ kind: 'volume', name: v.name })}>
            <ellipse cx={50} cy={10} rx={42} ry={10} fill="var(--vol)" opacity={selected ? 0.45 : 0.28} stroke="var(--vol)" />
            <rect x={8} y={10} width={84} height={28} fill="var(--vol)" opacity={selected ? 0.35 : 0.2} stroke="var(--vol)" />
            <ellipse cx={50} cy={38} rx={42} ry={10} fill="var(--vol)" opacity={selected ? 0.45 : 0.28} stroke="var(--vol)" />
            <text x={50} y={28} textAnchor="middle" fill="var(--ink)" fontSize={11} fontFamily="var(--mono)">
              {v.name.length > 10 ? v.name.slice(0, 9) + '…' : v.name}
            </text>
            {/* dock lines to containers using this volume */}
            {state.containers
              .filter((c) => c.volumeMounts.some((m) => m.volume === v.name))
              .map((c) => {
                const idx = state.containers.indexOf(c);
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                const cx = ZONE.containers.x + 12 + col * 134 + 124;
                const cy = ZONE.containers.y + 40 + row * 88 + 40;
                return (
                  <line
                    key={c.id}
                    x1={ZONE.volumes.x + 14}
                    y1={y + 24}
                    x2={cx}
                    y2={cy}
                    stroke="var(--vol)"
                    strokeWidth={1.2}
                    strokeDasharray="4 3"
                  />
                );
              })}
          </g>
        );
      })}

      {/* Networks */}
      {state.networks.map((n, i) => {
        const y = ZONE.networks.y + 48 + i * 40;
        const selected = selection?.kind === 'network' && selection.name === n.name;
        return (
          <g key={n.name} transform={`translate(${ZONE.networks.x + 10}, ${y})`} style={{ cursor: 'pointer' }} onClick={() => onSelect({ kind: 'network', name: n.name })}>
            <rect
              width={ZONE.networks.w - 20}
              height={30}
              rx={15}
              fill={selected ? 'rgba(45,212,191,0.18)' : 'rgba(45,212,191,0.08)'}
              stroke={selected ? 'var(--net)' : 'var(--line)'}
            />
            <text x={12} y={19} fill="var(--ink)" fontSize={11} fontFamily="var(--mono)">
              {n.name}
            </text>
            <text x={ZONE.networks.w - 40} y={19} fill="var(--net)" fontSize={11} fontFamily="var(--mono)">
              {n.containers.length}
            </text>
          </g>
        );
      })}

      {/* network links between containers on shared non-default nets */}
      {state.networks
        .filter((n) => n.driver === 'bridge' && !['bridge', 'host', 'none'].includes(n.name) && n.containers.length >= 2)
        .flatMap((n) => {
          const members = state.containers.filter((c) => c.networks.includes(n.name));
          const links: ReactNode[] = [];
          for (let a = 0; a < members.length; a++) {
            for (let b = a + 1; b < members.length; b++) {
              const ia = state.containers.indexOf(members[a]);
              const ib = state.containers.indexOf(members[b]);
              const pos = (idx: number) => {
                const col = idx % 2;
                const row = Math.floor(idx / 2);
                return {
                  x: ZONE.containers.x + 12 + col * 134 + 62,
                  y: ZONE.containers.y + 40 + row * 88 + 76,
                };
              };
              const pa = pos(ia);
              const pb = pos(ib);
              links.push(
                <path
                  key={`${n.name}-${members[a].id}-${members[b].id}`}
                  d={`M ${pa.x} ${pa.y} Q ${(pa.x + pb.x) / 2} ${Math.max(pa.y, pb.y) + 24}, ${pb.x} ${pb.y}`}
                  stroke="var(--net)"
                  fill="none"
                  strokeWidth={1.5}
                  opacity={0.85}
                />,
              );
            }
          }
          return links;
        })}
    </svg>
  );
}

const REGISTRY_PREVIEW = [
  'hello-world:latest',
  'alpine:3.20',
  'nginx:1.25',
  'redis:7',
  'postgres:16',
  'node:20-alpine',
];
