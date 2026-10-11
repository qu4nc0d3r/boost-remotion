import React from 'react';
import {interpolate} from 'remotion';
import {INK, RED, HAN, GOLD, WATER, DrawPath, sketchLine, rand, useScene, tf, drawOn, track, vis} from './sketch';
import {Stickman, poseAt, blendPose, STATIC, moodFor} from './Stickman';

const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
export type Item = Record<string, any>;

// ---------------- Water & riverbed ----------------
export function waterLevel(it: Item) {
	// returns a function(frame, ctx) -> y
	return (c: any, f: number) => (track(c, it.level, f) ?? [it.y ?? 700])[0];
}

export const Water: React.FC<{it: Item; id: string}> = ({it, id}) => {
	const c = useScene();
	const y = waterLevel(it)(c, c.frame);
	const p = vis(c, it.at, it.out, 18);
	const x0 = it.x1 ?? -600, x1 = it.x2 ?? 2520;
	const pts: string[] = [];
	for (let x = x0; x <= x1; x += 40) {
		const yy = y + Math.sin(x / 70 + c.frame / 9) * 5 + Math.sin(x / 23 - c.frame / 6) * 2;
		pts.push(`${x} ${yy.toFixed(1)}`);
	}
	const top = `M${pts.join(' L')}`;
	return (
		<g opacity={p}>
			<defs>
				<linearGradient id={`wg-${id}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={it.color ?? WATER} stopOpacity={(it.opacity ?? 0.55) * 0.75} />
					<stop offset="1" stopColor={it.deep ?? '#3f6670'} stopOpacity={Math.min(1, (it.opacity ?? 0.55) * 1.35)} />
				</linearGradient>
			</defs>
			<path d={`${top} L${x1} 1120 L${x0} 1120 Z`} fill={`url(#wg-${id})`} filter={`url(#wash-${id})`} />
			<path d={top} stroke={INK} strokeWidth={3} fill="none" opacity={0.8} strokeLinecap="round" />
			{it.foam === false
				? null
				: Array.from({length: 14}).map((_, k) => {
						const xx = x0 + ((k * 151 + c.frame * (0.8 + (k % 3) * 0.3)) % (x1 - x0 + 200)) - 100;
						const yy = y + Math.sin(xx / 70 + c.frame / 9) * 5 + 4;
						const a = 0.5 + 0.5 * Math.sin(c.frame / 11 + k);
						return <path key={'fm' + k} d={`M${xx} ${yy} q10 -5 20 0 q8 4 16 0`} stroke="#fbf6ea" strokeWidth={3} fill="none" opacity={0.55 * a} strokeLinecap="round" />;
					})}
			<path d={`M${x0} ${y + 18} L${x1} ${y + 18}`} stroke="#ffffff" strokeWidth={10} opacity={0.08} />
			{[0, 1, 2].map((k) => {
				const yy = y + 40 + k * 55;
				const off = ((c.frame * (1.4 + k * 0.4)) % 300) - 150;
				const ds: string[] = [];
				for (let j = 0; j < 6; j++) {
					const xx = x0 + 120 + j * 330 + off + k * 90;
					ds.push(`M${xx} ${yy} q18 -8 36 0 q18 8 36 0`);
				}
				return <path key={k} d={ds.join(' ')} stroke={INK} strokeWidth={2.4} fill="none" opacity={0.45} />;
			})}
		</g>
	);
};

export const Bed: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = drawOn(c, it.at, 20);
	const y = it.y ?? 1000;
	const d = sketchLine([[-400, y + 10], [300, y - 8], [700, y + 6], [1100, y - 6], [1500, y + 8], [2320, y - 4]], 11, 6);
	return <DrawPath d={`${d} L2320 1120 L-400 1120 Z`} p={p} fill="#9a7b52" fillOpacity={0.35} w={3} />;
};

// ---------------- Stakes (cọc gỗ đầu bịt sắt) ----------------
export const Stakes: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const n = it.n ?? 12;
	const base = it.base ?? 1010;
	const h = it.h ?? 230;
	const span = it.span ?? 0.3;
	const out = [];
	for (let i = 0; i < n; i++) {
		const x = it.x1 + ((it.x2 - it.x1) * i) / Math.max(1, n - 1) + (rand(i * 3.1) - 0.5) * 20;
		const at = (it.at ?? 0) + (span * i) / n;
		const p = drawOn(c, at, 10);
		if (p <= 0) continue;
		const hh = h * (0.85 + rand(i) * 0.3);
		const lean = (it.lean ?? 14) + (rand(i * 5) - 0.5) * 8;
		const drop = interpolate(p, [0, 1], [-60, 0]);
		out.push(
			<g key={i} transform={`translate(${x} ${base + drop}) rotate(${lean})`} opacity={p}>
				<path d={`M-9 0 L-9 ${-hh + 28} L0 ${-hh} L9 ${-hh + 28} L9 0`} fill="#9b7443" stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />
				<path d={`M-9 ${-hh + 28} L0 ${-hh} L9 ${-hh + 28} Z`} fill="#7a7a7a" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
				<path d={`M-4 ${-hh * 0.6} l4 30 M3 ${-hh * 0.35} l-3 24`} stroke={INK} strokeWidth={1.6} opacity={0.6} />
			</g>,
		);
	}
	return <g>{out}</g>;
};

// ---------------- Boats ----------------
export const Boat: React.FC<{it: Item; water: ((f: number) => number) | null}> = ({it, water}) => {
	const c = useScene();
	const p = vis(c, it.at, it.out, 14);
	if (p <= 0) return null;
	const pos = track(c, it.path) ?? [it.x ?? 900, it.y ?? 700];
	const scale = it.scale ?? 1;
	let fx = it.facing ?? 1;
	for (const [t, d] of (it.faces ?? []) as [number, number][]) if (c.frame >= tf(c, t)) fx = d;
	const stuckF = it.stuck !== undefined ? tf(c, it.stuck) : Infinity;
	const sinkF = it.sink !== undefined ? tf(c, it.sink) : Infinity;
	let x = pos[0];
	let y = water ? water(Math.min(c.frame, stuckF)) : pos[1];
	if (c.frame > stuckF) {
		const frozen = track(c, it.path, stuckF) ?? pos;
		x = frozen[0] + (it.stuckShift ?? 0) * Math.min(1, (c.frame - stuckF) / 20);
	}
	const bob = c.frame < stuckF ? Math.sin((c.frame + (it.phase ?? 0)) / 11) * 4 : 0;
	let tilt = c.frame < stuckF ? Math.sin((c.frame + (it.phase ?? 0)) / 17) * 1.5 : interpolate(c.frame, [stuckF, stuckF + 24], [0, it.tilt ?? 14], clamp);
	let sinkY = 0;
	if (c.frame > sinkF) {
		sinkY = interpolate(c.frame, [sinkF, sinkF + 90], [0, 150 * scale], clamp);
		tilt += interpolate(c.frame, [sinkF, sinkF + 90], [0, 18], clamp);
	}
	const han = (it.variant ?? 'han') === 'han';
	const L = han ? 230 : 150;
	const deck = han ? -46 : -22;
	const hull = han
		? `M${-L} ${deck} Q${-L + 30} 34 -60 38 L120 38 Q${L - 10} 30 ${L + 30} ${deck - 30} L${L} ${deck} Z`
		: `M${-L - 20} ${deck - 14} Q${-L + 30} 22 -40 24 L60 24 Q${L - 20} 20 ${L + 20} ${deck - 14} L${L - 10} ${deck} L${-L + 10} ${deck} Z`;
	const crewN = it.crew ?? (han ? 5 : 3);
	const crewPose = c.frame > stuckF ? it.stuckPose ?? 'panic' : it.crewPose ?? (han ? 'stand' : 'row');
	const crew = [];
	for (let k = 0; k < crewN; k++) {
		const cx = -L * 0.7 + ((L * 1.4) * (k + 0.5)) / crewN;
		const ps = poseAt(crewPose, c.frame, k * 9 + (it.phase ?? 0));
		crew.push(
			<Stickman key={k} pose={ps} mood={moodFor(crewPose)} shadow={false} seed={k * 3} x={cx} ground={deck + 2} scale={0.62} facing={fx * (crewPose === 'row' ? 1 : 1)} hat={han ? 'han' : it.hat ?? 'band'} color={han ? HAN : RED} weapon={crewPose === 'row' ? 'oar' : k % 2 ? 'spear' : 'none'} f={c.frame + k * 7} />,
		);
	}
	const flagWave = Math.sin(c.frame / 6) * 6;
	const sail = it.sailColor ?? (han ? '#d8c7a0' : '#c9a86a');
	const accent = it.color ?? (han ? HAN : RED);
	return (
		<g transform={`translate(${x} ${y + bob + sinkY}) scale(${scale * fx} ${scale}) rotate(${tilt})`} opacity={p}>
			{han ? (
				<g stroke={INK} strokeWidth={3.5} strokeLinejoin="round">
					<path d={`M-40 ${deck} L-40 -330`} strokeWidth={5} />
					<path d={`M-150 -300 L60 -310 L70 ${deck - 30} L-140 ${deck - 24} Z`} fill={sail} />
					{[-260, -210, -160, -110].map((yy) => (
						<path key={yy} d={`M-146 ${yy} L64 ${yy - 4}`} strokeWidth={2} />
					))}
					<path d={`M110 ${deck} L110 -230`} strokeWidth={4.5} />
					<path d={`M50 -210 L180 -214 L186 ${deck - 24} L56 ${deck - 20} Z`} fill={sail} />
					<path d={`M-40 -330 q20 ${-6 + flagWave} 44 0 l0 22 q-22 ${6 - flagWave} -44 0 Z`} fill={accent} />
				</g>
			) : (
				<g stroke={INK} strokeWidth={3} strokeLinejoin="round">
					{it.sail ? (
						<>
							<path d={`M0 ${deck} L0 -170`} strokeWidth={4} />
							<path d={`M4 -165 Q70 -120 6 ${deck - 10} Z`} fill={sail} />
						</>
					) : null}
				</g>
			)}
			{crew}
			<path d={hull} fill={han ? '#8a6238' : '#9c7446'} stroke={INK} strokeWidth={4} strokeLinejoin="round" />
			<path d={han ? `M${-L + 20} ${deck + 18} L${L - 10} ${deck + 14}` : `M${-L + 10} ${deck + 10} L${L - 20} ${deck + 8}`} stroke={INK} strokeWidth={2} opacity={0.6} />
			{han
				? [-150, -90, -30, 30, 90].map((xx) => <circle key={xx} cx={xx} cy={deck + 32} r={6} fill="#2b1d12" opacity={0.7} />)
				: null}
			{c.frame > stuckF ? (
				<path d={`M${-20} ${deck + 20} l14 18 l-10 10 l16 16`} stroke={INK} strokeWidth={3} fill="none" opacity={interpolate(c.frame, [stuckF + 6, stuckF + 16], [0, 1], clamp)} />
			) : null}
		</g>
	);
};

// ---------------- Landscape props ----------------
export const Hills: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = drawOn(c, it.at, 30);
	const y = it.y ?? 640;
	const pts: [number, number][] = [];
	const n = 14;
	for (let i = 0; i <= n; i++) {
		const x = (it.x1 ?? -400) + (((it.x2 ?? 2320) - (it.x1 ?? -400)) * i) / n;
		pts.push([x, y - Math.abs(Math.sin(i * 1.3 + (it.seed ?? 0))) * (it.h ?? 150) * (0.4 + rand(i + (it.seed ?? 0)) * 0.6)]);
	}
	const d = sketchLine(pts, it.seed ?? 3, 4);
	const far = it.far ?? (it.h ?? 150) < 170;
	const body = d + ` L${pts[n][0]} ${y + 4} L${pts[0][0]} ${y + 4} Z`;
	return (
		<g opacity={it.opacity ?? 0.95}>
			<path d={body} fill={it.fill ?? (far ? '#98ab9f' : '#8f9f6c')} fillOpacity={0.55 * p} filter={`url(#wash-${c.fid})`} />
			<path d={body} fill="url(#hillshade)" fillOpacity={0.5 * p} />
			<DrawPath d={body} p={p} w={3} opacity={far ? 0.55 : 0.9} />
		</g>
	);
};

export const Ground: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = drawOn(c, it.at, 24);
	const y = it.y ?? 860;
	const d = sketchLine([[it.x1 ?? -400, y], [(it.x1 ?? -400) + 700, y - 4], [(it.x2 ?? 2320) - 700, y + 5], [it.x2 ?? 2320, y]], 7, 4);
	return (
		<g>
			<path d={`${d} L${it.x2 ?? 2320} 1120 L${it.x1 ?? -400} 1120 Z`} fill={it.fill ?? '#c9b27c'} fillOpacity={0.42 * p} filter={`url(#wash-${c.fid})`} />
			<DrawPath d={d} p={p} w={4} />
			{Array.from({length: 18}).map((_, i) => {
				const x = (it.x1 ?? -40) + rand(i * 2.2) * ((it.x2 ?? 1960) - (it.x1 ?? -40));
				return <path key={i} d={`M${x} ${y + 26 + rand(i) * 120} l24 0`} stroke={INK} strokeWidth={2} opacity={0.3 * p} />;
			})}
		</g>
	);
};

export const Reeds: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = drawOn(c, it.at, 20);
	const n = it.n ?? 14;
	const y = it.y ?? 700;
	return (
		<g opacity={p}>
			{Array.from({length: n}).map((_, i) => {
				const x = it.x1 + ((it.x2 - it.x1) * i) / n + rand(i) * 18;
				const h = (it.h ?? 110) * (0.6 + rand(i * 3) * 0.6);
				const sway = Math.sin(c.frame / 14 + i) * 6;
				return (
					<g key={i}>
						<path d={`M${x} ${y} q${sway / 2} ${-h / 2} ${sway} ${-h}`} stroke="#5b6b3a" strokeWidth={3.5} fill="none" strokeLinecap="round" />
						<ellipse cx={x + sway} cy={y - h - 8} rx={4} ry={12} fill="#7a5a33" stroke={INK} strokeWidth={1.5} />
						<path d={`M${x} ${y - 10} q-18 -30 -26 -60 M${x} ${y - 6} q20 -24 30 -50`} stroke="#5b6b3a" strokeWidth={2.5} fill="none" />
					</g>
				);
			})}
		</g>
	);
};

export const Tree: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = drawOn(c, it.at, 18);
	const s = it.scale ?? 1;
	return (
		<g transform={`translate(${it.x} ${it.y}) scale(${s})`}>
			<DrawPath d="M0 0 L-4 -120 M-3 -70 L-40 -110 M-2 -90 L30 -130" p={p} w={5} />
			<DrawPath d="M-80 -130 Q-90 -210 -20 -220 Q20 -270 70 -220 Q120 -200 90 -140 Q60 -100 0 -120 Q-60 -90 -80 -130 Z" p={p} fill="#6f9152" fillOpacity={0.7} w={3.5} />
			<path d="M-60 -150 Q-50 -200 -10 -200 Q30 -230 60 -190" stroke="#a9c27a" strokeWidth={14} fill="none" opacity={0.5 * p} strokeLinecap="round" />
		</g>
	);
};

export const Palace: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = drawOn(c, it.at, 36);
	const s = it.scale ?? 1;
	const roof = it.color ?? RED;
	return (
		<g transform={`translate(${it.x} ${it.y}) scale(${s})`}>
			<DrawPath d="M-320 0 L320 0 L300 -40 L-300 -40 Z" p={p} fill="#c9b48a" fillOpacity={0.6} w={4} />
			<DrawPath d="M-250 -40 L-250 -230 L250 -230 L250 -40" p={p} fill="#e6d6b0" fillOpacity={0.5} w={4} />
			{[-200, -100, 0, 100, 200].map((xx) => (
				<DrawPath key={xx} d={`M${xx} -40 L${xx} -230`} p={p} w={6} stroke={RED} />
			))}
			<DrawPath d="M-360 -220 Q-300 -240 -270 -300 L270 -300 Q300 -240 360 -220 Q380 -240 390 -260 M-360 -220 Q-380 -240 -390 -260" p={p} fill={roof} fillOpacity={0.7} w={4} />
			<DrawPath d="M-230 -300 Q-180 -320 -160 -370 L160 -370 Q180 -320 230 -300 Z" p={p} fill={roof} fillOpacity={0.7} w={4} />
			<DrawPath d="M-60 -40 L-60 -160 L60 -160 L60 -40" p={p} fill="#3a2a1a" fillOpacity={0.6} w={4} />
			{it.sign ? (
				<g opacity={p}>
					<rect x={-80} y={-222} width={160} height={46} fill="#1d1d1d" stroke={GOLD} strokeWidth={3} />
					<text x={0} y={-189} textAnchor="middle" fontFamily='"Playfair Display", serif' fontWeight={800} fontSize={30} fill={GOLD}>
						{it.sign}
					</text>
				</g>
			) : null}
		</g>
	);
};

export const Tent: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = drawOn(c, it.at, 24);
	const s = it.scale ?? 1;
	return (
		<g transform={`translate(${it.x} ${it.y}) scale(${s})`}>
			<DrawPath d="M-260 0 L-200 -200 L0 -290 L200 -200 L260 0 Z" p={p} fill="#d8c49a" fillOpacity={0.55} w={4} />
			<DrawPath d="M0 -290 L0 -360 M0 -356 q26 -6 50 4 l0 26 q-26 -10 -50 -4" p={p} fill={it.color ?? RED} w={3.5} />
			<DrawPath d="M-200 -200 Q-100 -170 0 -200 Q100 -170 200 -200" p={p} w={3} />
		</g>
	);
};

export const Throne: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = drawOn(c, it.at, 18);
	const s = it.scale ?? 1;
	return (
		<g transform={`translate(${it.x} ${it.y}) scale(${s})`}>
			<DrawPath d="M-90 0 L-90 -250 Q0 -300 90 -250 L90 0 M-110 -110 L110 -110 L110 -80 L-110 -80 Z M-80 -80 L-80 0 M80 -80 L80 0" p={p} fill={GOLD} fillOpacity={0.35} w={4} />
			<DrawPath d="M-60 -250 q60 -40 120 0" p={p} w={3} stroke={it.color ?? RED} />
		</g>
	);
};

export const House: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = drawOn(c, it.at, 18);
	const s = it.scale ?? 1;
	return (
		<g transform={`translate(${it.x} ${it.y}) scale(${s})`}>
			<DrawPath d="M-110 0 L-110 -110 L110 -110 L110 0 Z" p={p} fill="#e2d2aa" fillOpacity={0.5} w={4} />
			<DrawPath d="M-150 -100 L0 -200 L150 -100 Z" p={p} fill="#b89a5a" fillOpacity={0.6} w={4} />
			<DrawPath d="M-30 0 L-30 -70 L30 -70 L30 0" p={p} w={3.5} />
		</g>
	);
};

export const Sun: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = drawOn(c, it.at, 20);
	const r = it.r ?? 60;
	const moon = it.moon;
	return (
		<g transform={`translate(${it.x} ${it.y}) rotate(${moon ? 0 : c.frame / 3})`} opacity={p}>
			{moon ? (
				<path d={`M0 ${-r} A${r} ${r} 0 1 0 0 ${r} A${r * 0.75} ${r} 0 1 1 0 ${-r} Z`} fill="#efe3bf" stroke={INK} strokeWidth={3} />
			) : (
				<>
					<circle r={r} fill="#e9b949" fillOpacity={0.6} stroke={INK} strokeWidth={3.5} />
					{Array.from({length: 10}).map((_, i) => (
						<path key={i} d={`M0 ${-r - 14} L0 ${-r - 38}`} transform={`rotate(${i * 36})`} stroke={INK} strokeWidth={3} strokeLinecap="round" />
					))}
				</>
			)}
		</g>
	);
};

export const Cloud: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = drawOn(c, it.at, 20);
	const x = it.x + (c.frame * (it.drift ?? 0.3));
	const s = it.scale ?? 1;
	return <DrawPath d={`M${x - 90 * s} ${it.y} q-10 ${-50 * s} ${40 * s} ${-50 * s} q${20 * s} ${-40 * s} ${70 * s} ${-20 * s} q${50 * s} ${-20 * s} ${70 * s} ${30 * s} q${40 * s} ${10 * s} ${10 * s} ${40 * s} Z`} p={p} fill="#f5ecd8" fillOpacity={0.7} w={3} opacity={0.85} />;
};

export const Fire: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = vis(c, it.at, it.out, 10);
	const s = it.scale ?? 1;
	return (
		<g transform={`translate(${it.x} ${it.y}) scale(${s})`} opacity={p}>
			{it.glow === false ? null : (
				<circle cx={0} cy={-40} r={(it.glowR ?? 230) * (1 + Math.sin(c.frame / 3) * 0.04 + Math.sin(c.frame / 1.7) * 0.03)} fill="url(#fireglow)" style={{mixBlendMode: 'screen'}} />
			)}
			{it.sparks === false
				? null
				: Array.from({length: 10}).map((_, k) => {
						const age = ((c.frame + k * 6.3) % 40) / 40;
						const sx = Math.sin(k * 2.1 + c.frame / 9) * 30 * age + (rand(k) - 0.5) * 50;
						return <circle key={'sp' + k} cx={sx} cy={-60 - age * 170} r={2.6 * (1 - age) + 0.8} fill="#f6b73c" opacity={1 - age} />;
					})}
			{[0, 1, 2].map((k) => {
				const fl = Math.sin(c.frame / (2 + k) + k) * 6;
				const h = 90 - k * 22;
				return (
					<path
						key={k}
						d={`M${-40 + k * 10} 0 Q${-50 + fl} ${-h / 2} ${-10 + k * 4} ${-h} Q${0 - fl} ${-h / 2 - 10} ${10 - k * 3} ${-h - 20 + k * 10} Q${40 + fl} ${-h / 2} ${40 - k * 10} 0 Z`}
						fill={['#c9471e', '#e07b1f', '#f2c14e'][k]}
						stroke={k === 0 ? INK : 'none'}
						strokeWidth={3}
					/>
				);
			})}
		</g>
	);
};

// ---------------- Annotation ----------------
export const Arrow: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = drawOn(c, it.at, it.dur ?? 30);
	const pts: [number, number][] = it.points;
	const d = sketchLine(pts, it.seed ?? 5, 3);
	const n = pts.length;
	const [ax, ay] = pts[n - 1];
	const [bx, by] = pts[n - 2];
	const a = Math.atan2(ay - by, ax - bx);
	const hs = 26;
	const head = `M${ax - hs * Math.cos(a - 0.45)} ${ay - hs * Math.sin(a - 0.45)} L${ax} ${ay} L${ax - hs * Math.cos(a + 0.45)} ${ay - hs * Math.sin(a + 0.45)}`;
	const col = it.color === 'han' ? HAN : it.color === 'red' ? RED : it.color ?? INK;
	return (
		<g>
			<DrawPath d={d} p={p} w={it.w ?? 6} stroke={col} opacity={it.opacity ?? 1} />
			{p > 0.95 && !it.nohead ? <path d={head} stroke={col} strokeWidth={it.w ?? 6} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
		</g>
	);
};

export const Label: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = vis(c, it.at, it.out, 12);
	if (p <= 0) return null;
	const style = it.style ?? 'hand';
	const size = it.size ?? (style === 'title' ? 120 : style === 'stamp' ? 54 : 46);
	const col = it.color === 'red' ? RED : it.color === 'han' ? HAN : it.color ?? INK;
	const fam = style === 'title' ? '"Playfair Display", serif' : style === 'hand' ? '"Patrick Hand", cursive' : '"Be Vietnam Pro", sans-serif';
	const sc = interpolate(p, [0, 1], [style === 'stamp' ? 1.6 : 0.9, 1]);
	const lines: string[] = String(it.text).split('\n');
	return (
		<g transform={`translate(${it.x} ${it.y}) rotate(${it.rotate ?? (style === 'stamp' ? -6 : 0)}) scale(${sc})`} opacity={p}>
			{style === 'stamp' ? (
				<rect x={-(it.w ?? 300) / 2} y={-size * 0.95} width={it.w ?? 300} height={size * 1.35 * lines.length} fill="none" stroke={RED} strokeWidth={6} rx={6} />
			) : null}
			{lines.map((ln, i) => (
				<text
					key={i}
					y={i * size * 1.15}
					textAnchor={it.anchor ?? 'middle'}
					fontFamily={fam}
					fontWeight={style === 'hand' ? 400 : 800}
					fontSize={size}
					fill={style === 'stamp' ? RED : col}
					stroke="#f3e8d2"
					strokeWidth={style === 'title' ? 0 : 7}
					paintOrder="stroke"
					letterSpacing={style === 'stamp' ? 4 : 0}
				>
					{ln}
				</text>
			))}
		</g>
	);
};

export const Bubble: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = vis(c, it.at, it.out, 10);
	if (p <= 0) return null;
	const lines: string[] = String(it.text).split('\n');
	const size = it.size ?? 40;
	const w = it.w ?? Math.max(...lines.map((l) => l.length)) * size * 0.5 + 70;
	const h = lines.length * size * 1.2 + 44;
	const tx = it.tail?.[0] ?? -w / 4;
	const ty = it.tail?.[1] ?? h / 2 + 60;
	return (
		<g transform={`translate(${it.x} ${it.y}) scale(${interpolate(p, [0, 1], [0.6, 1])})`} opacity={p}>
			<path
				d={`M${-w / 2} 0 Q${-w / 2} ${-h / 2} 0 ${-h / 2} Q${w / 2} ${-h / 2} ${w / 2} 0 Q${w / 2} ${h / 2} ${tx + 40} ${h / 2 - 4} L${tx} ${ty} L${tx - 6} ${h / 2 - 8} Q${-w / 2} ${h / 2} ${-w / 2} 0 Z`}
				fill="#fbf4e2"
				stroke={INK}
				strokeWidth={3.5}
				strokeLinejoin="round"
			/>
			{lines.map((ln, i) => (
				<text key={i} y={(i - (lines.length - 1) / 2) * size * 1.2 + size * 0.35} textAnchor="middle" fontFamily='"Patrick Hand", cursive' fontSize={size} fill={it.color === 'red' ? RED : INK}>
					{ln}
				</text>
			))}
		</g>
	);
};

export const Timeline: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const y = it.y ?? 540;
	const x1 = it.x1 ?? 160, x2 = it.x2 ?? 1760;
	const p = drawOn(c, it.at, 40);
	const marks: Item[] = it.marks ?? [];
	return (
		<g>
			<DrawPath d={sketchLine([[x1, y], [(x1 + x2) / 2, y + 3], [x2, y]], 9, 2)} p={p} w={6} />
			{marks.map((m, i) => {
				const mp = drawOn(c, m.at ?? it.at, 14);
				const x = m.x;
				const col = m.color === 'red' ? RED : m.color === 'han' ? HAN : INK;
				return (
					<g key={i} opacity={mp} transform={`translate(${x} ${y})`}>
						<circle r={14 * mp} fill={col} stroke={INK} strokeWidth={3} />
						<text y={-36} textAnchor="middle" fontFamily='"Be Vietnam Pro", sans-serif' fontWeight={800} fontSize={m.size ?? 52} fill={col} stroke="#f3e8d2" strokeWidth={6} paintOrder="stroke">
							{m.year}
						</text>
						{String(m.label ?? '')
							.split('\n')
							.map((ln: string, k: number) => (
								<text key={k} y={62 + k * 44} textAnchor="middle" fontFamily='"Patrick Hand", cursive' fontSize={40} fill={INK}>
									{ln}
								</text>
							))}
					</g>
				);
			})}
		</g>
	);
};

/** A volley of arrows flying from (x1,y1) area to (x2,y2) area, starting at `at`, repeating `waves` times. */
export const Volley: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const n = it.n ?? 10;
	const waves = it.waves ?? 3;
	const fly = it.fly ?? 26;
	const gap = it.gap ?? 40;
	const out = [];
	for (let w = 0; w < waves; w++) {
		for (let i = 0; i < n; i++) {
			const start = tf(c, it.at) + w * gap + rand(i * 1.7 + w) * 12;
			const q = (c.frame - start) / fly;
			if (q < 0 || q > 1) continue;
			const sx = it.x1 + (rand(i * 2.3 + w) - 0.5) * (it.spread ?? 200);
			const sy = it.y1 + (rand(i * 4.1) - 0.5) * 60;
			const ex = it.x2 + (rand(i * 3.3 + w * 2) - 0.5) * (it.spread ?? 300);
			const ey = it.y2 + (rand(i * 5.9) - 0.5) * 80;
			const arc = it.arc ?? 220;
			const x = sx + (ex - sx) * q;
			const y = sy + (ey - sy) * q - Math.sin(q * Math.PI) * arc;
			const dx = ex - sx;
			const dy = ey - sy - Math.cos(q * Math.PI) * Math.PI * arc;
			const a = (Math.atan2(dy, dx) * 180) / Math.PI;
			out.push(
				<g key={`${w}-${i}`} transform={`translate(${x} ${y}) rotate(${a})`}>
					<path d="M-34 0 L10 0 M10 0 l-10 -6 M10 0 l-10 6 M-34 0 l-8 -6 M-34 0 l-8 6" stroke={INK} strokeWidth={2.6} fill="none" strokeLinecap="round" />
				</g>,
			);
		}
	}
	return <g>{out}</g>;
};

export const Splash: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const s0 = tf(c, it.at);
	const q = (c.frame - s0) / 20;
	if (q < 0 || q > 1) return null;
	return (
		<g transform={`translate(${it.x} ${it.y})`} opacity={1 - q}>
			{Array.from({length: 7}).map((_, i) => {
				const a = -Math.PI / 2 + (i - 3) * 0.35;
				const r = 20 + q * 80;
				return <path key={i} d={`M${Math.cos(a) * 20} ${Math.sin(a) * 20} L${Math.cos(a) * r} ${Math.sin(a) * r}`} stroke={INK} strokeWidth={3} strokeLinecap="round" />;
			})}
		</g>
	);
};

// ---------------- Stick figures (single + crowd) ----------------
export function stickAt(c: any, it: Item, phase = 0) {
	const f = c.frame;
	// poses: [[t, name], ...]; blend 10 frames
	const seq: [number, string][] = [[-1, it.pose ?? 'stand'], ...((it.poses ?? []) as [number, string][])];
	let cur = seq[0][1], prev = cur, since = 1e9;
	for (let i = 1; i < seq.length; i++) {
		const s = tf(c, seq[i][0]);
		if (f >= s) {
			prev = cur;
			cur = seq[i][1];
			since = f - s;
		}
	}
	const a = poseAt(prev, f, phase);
	const b = poseAt(cur, f, phase);
	const pose = since < 10 ? blendPose(a, b, since / 10) : b;
	// facing keyframes
	let facing = it.facing ?? 1;
	for (const [t, d] of (it.faces ?? []) as [number, number][]) if (f >= tf(c, t)) facing = d;
	// mood: explicit keyframes, else derived from the current pose
	let mood = it.mood ?? moodFor(cur);
	for (const [t, m] of (it.moods ?? []) as [number, string][]) if (f >= tf(c, t)) mood = m;
	return {pose, facing, mood, poseName: cur};
}

export const Stick: React.FC<{it: Item; dx?: number; dy?: number; phase?: number; idx?: number}> = ({it, dx = 0, dy = 0, phase = 0, idx = 0}) => {
	const c = useScene();
	const p = vis(c, it.at, it.out, 10);
	if (p <= 0) return null;
	const pos = track(c, it.path) ?? [it.x ?? 960, it.y ?? 860];
	const {pose, facing, mood, poseName} = stickAt(c, it, phase);
	const team = it.team ?? 'viet';
	const color = it.color === 'red' ? RED : it.color === 'han' ? HAN : it.color ?? (team === 'han' ? HAN : RED);
	return (
		<Stickman
			pose={pose}
			x={pos[0] + dx}
			ground={pos[1] + dy}
			scale={it.scale ?? 1}
			facing={facing}
			hat={it.hat ?? (team === 'han' ? 'han' : 'none')}
			weapon={it.weapon ?? 'none'}
			color={color}
			f={c.frame + phase}
			mood={mood}
			outfit={it.outfit}
			outfitColor={it.outfitColor}
			dust={it.dust ?? poseName === 'run'}
			shadow={it.shadow ?? true}
			seed={idx * 7 + phase}
			label={idx === 0 ? it.label : undefined}
			labelP={drawOn(c, it.labelAt ?? it.at, 12) * (it.labelOut !== undefined ? (c.frame < tf(c, it.labelOut) ? 1 : 0) : 1)}
			opacity={p}
		/>
	);
};

export const Crowd: React.FC<{it: Item}> = ({it}) => {
	const n = it.n ?? 6;
	const cols = it.cols ?? n;
	const out = [];
	for (let i = 0; i < n; i++) {
		const col = i % cols, row = Math.floor(i / cols);
		const dx = col * (it.dx ?? 90) + row * (it.rowShift ?? 45) + (rand(i * 9.3) - 0.5) * (it.jitter ?? 20);
		const dy = row * (it.dy ?? -40);
		out.push({i, dx, dy, row});
	}
	// draw back rows first
	out.sort((a, b) => a.dy - b.dy);
	return (
		<g>
			{out.map(({i, dx, dy}) => (
				<Stick key={i} it={{...it, weapon: Array.isArray(it.weapons) ? it.weapons[i % it.weapons.length] : it.weapon, scale: (it.scale ?? 0.8) * (1 + dy / 1400)}} dx={dx} dy={dy} phase={i * 11} idx={i === 0 ? 0 : 1} />
			))}
		</g>
	);
};

export {STATIC};

/** Foreground river bank / land mass: filled polygon with a sketchy top edge (draw after water). */
export const Bank: React.FC<{it: Item}> = ({it}) => {
	const c = useScene();
	const p = drawOn(c, it.at, 20);
	const x1 = it.x1 ?? -40, x2 = it.x2 ?? 600, y = it.y ?? 880;
	const side = it.side ?? (x1 < 100 ? 'left' : 'right');
	const pts: [number, number][] = [];
	const n = 8;
	for (let i = 0; i <= n; i++) {
		const x = x1 + ((x2 - x1) * i) / n;
		const edge = side === 'left' ? i / n : 1 - i / n; // slope down toward the river
		pts.push([x, y + Math.pow(edge, 3) * (it.slope ?? 120) + (rand(i + x1) - 0.5) * 10]);
	}
	const d = sketchLine(pts, 17, 3) + ` L${x2} 1120 L${x1} 1120 Z`;
	return <DrawPath d={d} p={p} fill={it.fill ?? '#cdb88c'} fillOpacity={0.95} w={3.5} />;
};
