import React from 'react';
import {interpolate} from 'remotion';
import {INK, RED, HAN, DrawPath, sketchLine, rand, useScene, tf, drawOn, vis} from './sketch';
import type {Item} from './props';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

// ---------------- Sky (watercolor wash behind everything) ----------------
export const SKIES: Record<string, {top: string; mid: string; low: string; glow?: string; blot: string}> = {
	day: {top: '#8fb8cf', mid: '#c9dbd6', low: '#efe3c6', blot: '#a9c8d8'},
	dawn: {top: '#9aa6c9', mid: '#e7b893', low: '#f5ddb4', glow: '#ffcf8a', blot: '#e9a98a'},
	dusk: {top: '#6f5f86', mid: '#d98a6c', low: '#f0c38e', glow: '#ffb06a', blot: '#c9736a'},
	night: {top: '#1f2b44', mid: '#39496a', low: '#62708c', blot: '#2c3a58'},
	storm: {top: '#5d6670', mid: '#8b919a', low: '#c3c1b4', blot: '#6f7780'},
	dry: {top: '#d8c9a2', mid: '#e8dcbc', low: '#f1e7cc', blot: '#d4c095'},
};

export const Sky: React.FC<{kind: string; id: string; strength?: number}> = ({kind, id, strength = 0.6}) => {
	const c = useScene();
	const k = SKIES[kind] ?? SKIES.day;
	return (
		<g opacity={strength}>
			<defs>
				<linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={k.top} />
					<stop offset="0.45" stopColor={k.mid} />
					<stop offset="0.75" stopColor={k.low} stopOpacity={0.6} />
					<stop offset="1" stopColor={k.low} stopOpacity={0} />
				</linearGradient>
			</defs>
			{/* no wash filter here: on a vertical gradient whose edges are off-screen it changed pixels by ≤ 3/255 but cost ~40 ms/frame */}
			<rect x={-60} y={-60} width={2040} height={1000} fill={`url(#sky-${id})`} />
			{[0, 1, 2, 3, 4].map((i) => (
				<ellipse
					key={i}
					cx={200 + rand(i * 3.7 + c.seed) * 1500 + Math.sin(c.frame / 90 + i) * 12}
					cy={80 + rand(i * 1.9 + c.seed) * 260}
					rx={220 + rand(i) * 260}
					ry={50 + rand(i * 5) * 60}
					fill={k.blot}
					opacity={0.22}
					filter={`url(#soft-${id})`}
				/>
			))}
			{k.glow ? <ellipse cx={1500} cy={560} rx={700} ry={220} fill={k.glow} opacity={0.45} filter={`url(#soft-${id})`} /> : null}
		</g>
	);
};

// ---------------- Fog: drifting soft bands ----------------
export const Fog: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = vis(c, it.at, it.out, 30);
	const y = it.y ?? 640;
	const n = it.n ?? 5;
	return (
		<g opacity={p * (it.opacity ?? 0.5)}>
			{Array.from({length: n}).map((_, i) => {
				const speed = 0.3 + (i % 3) * 0.2;
				const x = ((i * 530 + c.frame * speed) % 2600) - 400;
				return <ellipse key={i} cx={x} cy={y + (i % 3) * 40 - 30} rx={380} ry={36 + (i % 2) * 14} fill={it.color ?? '#f7f1e3'} filter={`url(#soft-${c.fid})`} />;
			})}
		</g>
	);
};

// ---------------- Smoke: rising puffs ----------------
export const Smoke: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = vis(c, it.at, it.out, 20);
	if (p <= 0) return null;
	const s = it.scale ?? 1;
	const period = it.period ?? 70;
	const n = it.n ?? 8;
	return (
		<g transform={`translate(${it.x} ${it.y}) scale(${s})`} opacity={p}>
			{Array.from({length: n}).map((_, k) => {
				const age = ((c.frame + (k * period) / n) % period) / period;
				const x = Math.sin(k * 1.7) * 12 + age * (it.drift ?? 60) + Math.sin(c.frame / 20 + k) * 8;
				return <circle key={k} cx={x} cy={-age * (it.height ?? 260)} r={14 + age * 55} fill={it.color ?? '#6d6a66'} opacity={(1 - age) * 0.32} filter={`url(#wash-${c.fid})`} />;
			})}
		</g>
	);
};

// ---------------- Rain ----------------
export const Rain: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = vis(c, it.at, it.out, 20);
	if (p <= 0) return null;
	const n = it.n ?? 90;
	const ang = it.angle ?? 12;
	const dx = Math.tan((ang * Math.PI) / 180) * 60;
	return (
		<g opacity={p * 0.55}>
			{Array.from({length: n}).map((_, k) => {
				const sp = 38 + rand(k) * 20;
				const y = ((rand(k * 3.3) * 1200 + c.frame * sp) % 1200) - 100;
				const x = rand(k * 7.7) * 2100 - 100 + (y / 60) * dx;
				return <path key={k} d={`M${x} ${y} l${dx} 60`} stroke="#5d6b78" strokeWidth={2} strokeLinecap="round" />;
			})}
		</g>
	);
};

// ---------------- Map panel with Bắc Bộ preset ----------------
type LL = [number, number];
const PRESETS: Record<string, {ext: [number, number, number, number]; land: LL[][]; islands: LL[][]; rivers: LL[][]; border: LL[]; places: Record<string, LL>}> = {
	'bac-bo': {
		ext: [103.5, 114.5, 18.4, 23.7], // lon0, lon1, lat0, lat1 (≈ box aspect 1.93 at 21°N)
		land: [
			[
				[103.5, 24.2], [114.5, 24.2], [114.5, 22.5], [113.6, 22.2], [112.6, 21.8], [111.6, 21.5], [110.7, 21.3], [110.4, 20.8], [110.2, 20.3],
				[109.9, 20.4], [109.7, 20.9], [109.6, 21.5], [109.1, 21.45], [108.5, 21.6], [108.0, 21.5], [107.4, 21.2], [107.0, 20.95], [106.75, 20.75],
				[106.5, 20.4], [106.2, 20.05], [105.95, 19.7], [105.8, 19.2], [105.7, 18.7], [106.0, 18.2], [106.4, 17.7], [106.6, 17.3], [103.5, 17.3],
			],
		],
		islands: [
			[[108.6, 19.2], [108.7, 18.5], [109.5, 18.2], [110.5, 18.6], [111.0, 19.6], [110.6, 20.1], [109.6, 20.0], [108.9, 19.6]],
			[[107.3, 20.9], [107.6, 20.95], [107.5, 20.75]],
		],
		rivers: [
			[[103.6, 22.7], [104.6, 22.0], [105.3, 21.4], [105.85, 21.03], [106.3, 20.5], [106.55, 20.25]],
			[[105.85, 21.03], [106.2, 21.0], [106.55, 20.9], [106.8, 20.8]],
			[[104.9, 21.6], [105.3, 21.2], [105.5, 20.8], [105.8, 20.3], [106.0, 19.95]],
		],
		border: [[103.9, 22.75], [104.8, 22.95], [105.4, 23.15], [106.0, 22.95], [106.7, 22.55], [107.3, 22.0], [108.0, 21.55]],
		places: {
			'Đại La': [105.85, 21.03], 'Cổ Loa': [105.87, 21.14], 'Đường Lâm': [105.48, 21.15], 'Ái Châu': [105.78, 19.8],
			'Bạch Đằng': [106.8, 20.82], 'Hải Môn': [109.3, 21.55], 'Quảng Châu': [113.27, 23.13], 'Hạ Long': [107.08, 20.95],
			'Hoa Lư': [105.9, 20.28], 'Chi Lăng': [106.55, 21.65], 'Thăng Long': [105.85, 21.03],
		},
	},
};

export const MapPanel: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = drawOn(c, it.at, 24);
	if (p <= 0) return null;
	const pre = PRESETS[it.preset ?? 'bac-bo'];
	const [X, Y, W, H] = it.box ?? [150, 70, 1620, 840];
	const [lon0, lon1, lat0, lat1] = it.extent ?? pre.ext;
	const P = (ll: LL | [number, number]): [number, number] => [X + ((ll[0] - lon0) / (lon1 - lon0)) * W, Y + ((lat1 - ll[1]) / (lat1 - lat0)) * H];
	const resolve = (q: any): [number, number] => (typeof q === 'string' ? P(pre.places[q] ?? [lon0, lat0]) : q.length === 2 && q[0] > 90 && q[0] < 180 ? P(q) : q);
	const poly = (pts: LL[], seed: number, close = true) => sketchLine(pts.map(P), seed, 2) + (close ? ' Z' : '');
	const edge = `M${X - 20} ${Y - 14} L${X + W + 18} ${Y - 20} L${X + W + 24} ${Y + H + 16} L${X - 16} ${Y + H + 22} Z`;
	const places: Item[] = it.places ?? [];
	const routes: Item[] = it.routes ?? [];
	return (
		<g opacity={Math.min(1, p * 1.3)}>
			<path d={edge} fill="#e9d8ae" stroke={INK} strokeWidth={4} filter={`url(#wash-${c.fid})`} />
			<rect x={X} y={Y} width={W} height={H} fill="#b9cdc6" opacity={0.45} />
			{Array.from({length: 22}).map((_, i) => (
				<path key={'h' + i} d={`M${X + 20 + (i % 11) * 150} ${Y + 60 + Math.floor(i / 11) * 380 + (i % 3) * 90} q20 -8 40 0 q20 8 40 0`} stroke="#6f8f8c" strokeWidth={2} fill="none" opacity={0.5} />
			))}
			<clipPath id={`mapclip-${c.fid}`}>
				<rect x={X} y={Y} width={W} height={H} />
			</clipPath>
			<g clipPath={`url(#mapclip-${c.fid})`}>
				{pre.land.map((l, i) => (
					<path key={'l' + i} d={poly(l, 30 + i)} fill="#dcc794" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
				))}
				{pre.islands.map((l, i) => (
					<path key={'i' + i} d={poly(l, 50 + i)} fill="#dcc794" stroke={INK} strokeWidth={3} />
				))}
				{pre.rivers.map((r, i) => (
					<DrawPath key={'r' + i} d={sketchLine(r.map(P), 70 + i, 2)} p={drawOn(c, (it.at ?? 0) + 0.02, 40)} stroke="#4f7f95" w={4} />
				))}
				<path d={sketchLine(pre.border.map(P), 90, 2)} stroke={INK} strokeWidth={2.5} strokeDasharray="10 8" fill="none" opacity={0.6} />
			</g>
			<rect x={X} y={Y} width={W} height={H} fill="none" stroke={INK} strokeWidth={3} />
			<rect x={X + 10} y={Y + 10} width={W - 20} height={H - 20} fill="none" stroke={INK} strokeWidth={1.5} opacity={0.6} />
			{/* compass */}
			<g transform={`translate(${X + W - 110} ${Y + H - 120})`} opacity={0.85}>
				<circle r={46} fill="none" stroke={INK} strokeWidth={2.5} />
				<path d="M0 -62 L10 0 L0 62 L-10 0 Z" fill={RED} stroke={INK} strokeWidth={2} />
				<path d="M-62 0 L0 8 L62 0 L0 -8 Z" fill="#e9d8ae" stroke={INK} strokeWidth={2} />
				<text y={-70} textAnchor="middle" fontFamily='"Be Vietnam Pro", sans-serif' fontWeight={800} fontSize={26} fill={INK}>
					B
				</text>
			</g>
			{it.title ? (
				<g transform={`translate(${X + 40} ${Y + 40})`}>
					<rect width={Math.max(260, String(it.title).length * 26)} height={70} fill="#f3e8d2" stroke={INK} strokeWidth={3} rx={6} />
					<text x={20} y={48} fontFamily='"Playfair Display", serif' fontWeight={800} fontSize={40} fill={INK}>
						{it.title}
					</text>
				</g>
			) : null}
			{it.seaLabel !== false ? (
				<text x={P(it.seaAt ?? [107.9, 20.2])[0]} y={P(it.seaAt ?? [107.9, 20.2])[1]} textAnchor="middle" fontFamily='"Patrick Hand", cursive' fontSize={40} fill="#3f6670" opacity={0.8} fontStyle="italic">
					{it.seaLabel ?? 'Biển Đông'}
				</text>
			) : null}
			{routes.map((r, i) => {
				const pts = (r.points as any[]).map(resolve);
				const rp = drawOn(c, r.at ?? 0.2, r.dur ?? 60);
				if (rp <= 0) return null;
				const col = r.color === 'han' ? HAN : r.color === 'red' || !r.color ? RED : r.color;
				const d = sketchLine(pts, 100 + i, 3);
				// tip position along the polyline
				const segs = pts.slice(1).map((q, k) => Math.hypot(q[0] - pts[k][0], q[1] - pts[k][1]));
				const total = segs.reduce((a, b) => a + b, 0);
				let want = total * rp, k = 0;
				while (k < segs.length - 1 && want > segs[k]) want -= segs[k++];
				const a = pts[k], b = pts[k + 1], q = Math.min(1, want / (segs[k] || 1));
				const tip: [number, number] = [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
				const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
				return (
					<g key={'rt' + i}>
						<DrawPath d={d} p={rp} stroke={col} w={r.w ?? 9} />
						{r.dashed ? null : null}
						<g transform={`translate(${tip[0]} ${tip[1]}) rotate(${ang})`}>
							{r.icon === 'boat' ? (
								<g>
									<path d="M-26 -4 Q-20 12 0 12 Q20 12 28 -8 Z" fill="#8a6238" stroke={INK} strokeWidth={2.5} />
									<path d="M-2 -6 L-2 -40 L18 -12 Z" fill="#e9dcc0" stroke={INK} strokeWidth={2} />
								</g>
							) : (
								<path d="M-22 -16 L6 0 L-22 16 Z" fill={col} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
							)}
						</g>
						{r.label && rp > 0.6 ? (
							<text x={pts[Math.floor(pts.length / 2)][0]} y={pts[Math.floor(pts.length / 2)][1] - 24} textAnchor="middle" fontFamily='"Patrick Hand", cursive' fontSize={48} fill={col} stroke="#f3e8d2" strokeWidth={7} paintOrder="stroke" opacity={interpolate(rp, [0.6, 0.8], [0, 1], clamp)}>
								{r.label}
							</text>
						) : null}
					</g>
				);
			})}
			{places.map((pl, i) => {
				const pp = drawOn(c, pl.at ?? it.at, 12);
				if (pp <= 0) return null;
				const [x, y] = resolve(pl.name && !pl.x ? pl.name : pl.lonlat ?? [pl.x, pl.y]);
				const col = pl.color === 'han' ? HAN : pl.color === 'red' ? RED : INK;
				const pulse = pl.pulse ? 1 + Math.sin(c.frame / 5) * 0.25 : 1;
				return (
					<g key={'pl' + i} opacity={pp}>
						{pl.pulse ? <circle cx={x} cy={y} r={26 * pulse} fill="none" stroke={col} strokeWidth={3} opacity={0.6} /> : null}
						{pl.star ? (
							<path d={`M${x} ${y - 16} l5 11 l12 1 l-9 8 l3 12 l-11 -6 l-11 6 l3 -12 l-9 -8 l12 -1 Z`} fill={col} stroke={INK} strokeWidth={2} />
						) : (
							<circle cx={x} cy={y} r={12 * pp} fill={col} stroke="#f3e8d2" strokeWidth={3} />
						)}
						<text x={x + (pl.dx ?? 16)} y={y + (pl.dy ?? -14)} textAnchor={pl.anchor ?? 'start'} fontFamily='"Patrick Hand", cursive' fontSize={pl.size ?? 52} fill={col} stroke="#f3e8d2" strokeWidth={6} paintOrder="stroke">
							{pl.label ?? pl.name}
						</text>
					</g>
				);
			})}
		</g>
	);
};
