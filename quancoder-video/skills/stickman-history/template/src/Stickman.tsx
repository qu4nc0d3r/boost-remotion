import React from 'react';
import {INK, RED, HAN, GOLD, rand} from './sketch';

// Angles in degrees. Limbs: 0 = straight down, +90 = forward (facing direction), 180 = straight up.
// Forearm / shin angles are RELATIVE to the upper arm / thigh. Torso & head: 0 = upright, + = lean forward.
export type Pose = {t: number; h: number; ra: number; rf: number; la: number; lf: number; rt: number; rs: number; lt: number; ls: number};

const P = (t: number, h: number, ra: number, rf: number, la: number, lf: number, rt: number, rs: number, lt: number, ls: number): Pose => ({t, h, ra, rf, la, lf, rt, rs, lt, ls});

export const STATIC: Record<string, Pose> = {
	stand: P(0, 0, 14, 6, -14, -6, 7, 0, -7, 0),
	point: P(4, 4, 92, 0, -12, -8, 8, 0, -8, 0),
	raise: P(-4, -8, 165, 10, -14, -6, 8, 0, -8, 0), // one arm raised (command / oath)
	cheer: P(-5, -10, 160, 12, -160, -12, 10, 0, -10, 0),
	kneel: P(6, 8, 30, 20, -10, 10, 90, -90, 5, -95),
	bow: P(75, 15, 70, 10, 60, 15, 90, -90, 5, -95),
	dead: P(-88, 0, 150, 10, 40, 20, 92, 5, 80, -8),
	fallen: P(95, 10, 60, 30, 120, 10, -70, 20, -95, 10),
	sit: P(0, 0, 35, 45, 25, 50, 90, -90, 85, -90),
	think: P(2, 12, 25, 150, 30, 70, 6, 0, -6, 0),
	cry: P(12, 25, 30, 150, 22, 155, 7, 0, -7, 0),
	fear: P(-14, -12, 125, 40, 110, 50, 20, 0, -16, 0),
	stab: P(14, 6, 92, -5, -30, -30, 24, 0, -18, -10),
	shoot: P(0, 0, 90, 0, 88, 172, 12, 0, -12, 0),
	give: P(8, 8, 70, 15, 60, 20, 6, 0, -6, 0),
	carry: P(0, 0, 165, -10, 165, -20, 7, 0, -7, 0),
	hold: P(0, 0, 40, 60, 20, 60, 7, 0, -7, 0),
};

const sin = Math.sin;
/** Procedural (animated) poses: frame-driven cycles. */
export function poseAt(name: string, f: number, phase = 0): Pose {
	const w = (f + phase) / 30; // seconds
	switch (name) {
		case 'walk': {
			const s = sin(w * Math.PI * 2 * 1.6);
			return P(4, 2, -s * 28 + 6, 10, s * 28 - 6, -10, s * 28, -Math.max(0, -s) * 35 - 6, -s * 28, -Math.max(0, s) * 35 - 6);
		}
		case 'march': {
			const s = sin(w * Math.PI * 2 * 1.4);
			return P(2, 0, 150, 20, s * 22, -8, s * 24, -Math.max(0, -s) * 30 - 4, -s * 24, -Math.max(0, s) * 30 - 4);
		}
		case 'run': {
			const s = sin(w * Math.PI * 2 * 2.6);
			return P(16, 6, -s * 55 + 15, 80, s * 55 + 5, 80, s * 50 + 10, -Math.max(0, -s) * 80 - 20, -s * 50 + 10, -Math.max(0, s) * 80 - 20);
		}
		case 'carrywalk': {
			const s = sin(w * Math.PI * 2 * 1.3);
			return P(6, 4, 165, -10, 165, -20, s * 24, -Math.max(0, -s) * 30 - 6, -s * 24, -Math.max(0, s) * 30 - 6);
		}
		case 'row': {
			const s = sin(w * Math.PI * 2 * 0.9);
			return P(10 + s * 18, 0, 70 + s * 35, -20, 60 + s * 35, -15, 90, -90, 85, -90);
		}
		case 'hammer': {
			const s = (sin(w * Math.PI * 2 * 1.2) + 1) / 2;
			return P(8 + s * 10, 10, 175 - s * 110, 10, 170 - s * 110, 15, 16, 0, -14, 0);
		}
		case 'fight': {
			const s = sin(w * Math.PI * 2 * 1.8);
			return P(10, 4, 110 + s * 60, 10 - s * 20, -30, -40, 24, -10, -20, -10);
		}
		case 'cheer': {
			const s = sin(w * Math.PI * 2 * 2.2);
			return P(-5, -10, 160 + s * 12, 12, -160 - s * 12, -12, 10, 0, -10, 0);
		}
		case 'cry': {
			const s = sin(w * Math.PI * 2 * 5) * 3;
			return P(14 + s, 26, 30, 150, 22, 155, 7, 0, -7, 0);
		}
		case 'talk': {
			const s = sin(w * Math.PI * 2 * 1.1);
			return P(2, 3, 60 + s * 25, 30, -12, -6, 7, 0, -7, 0);
		}
		case 'panic': {
			const s = sin(w * Math.PI * 2 * 3);
			return P(-10, -10 + s * 6, 150 + s * 25, 30, 140 - s * 25, 30, 18, 0, -14, 0);
		}
		case 'shootcycle': {
			const s = (sin(w * Math.PI * 2 * 0.7) + 1) / 2;
			return P(0, 0, 90, 0, 88, 172 * s, 12, 0, -12, 0);
		}
		case 'swim': {
			const s = sin(w * Math.PI * 2 * 1.5);
			return P(80, -30, 150 + s * 30, 10, 30 - s * 30, 10, 10 + s * 20, 0, -10 - s * 20, 0);
		}
		default:
			return STATIC[name] ?? STATIC.stand;
	}
}

export const blendPose = (a: Pose, b: Pose, p: number): Pose => {
	const o: any = {};
	for (const k of Object.keys(a) as (keyof Pose)[]) o[k] = a[k] + (b[k] - a[k]) * p;
	return o;
};

const rad = (d: number) => (d * Math.PI) / 180;
const L = {head: 21, torso: 66, ua: 38, fa: 36, th: 45, sh: 44};

export type StickProps = {
	pose: Pose;
	x: number;
	ground: number; // y of the lowest point (feet)
	scale?: number;
	facing?: number; // 1 right, -1 left
	hat?: string;
	weapon?: string;
	color?: string; // accent color for hat/flag
	ink?: string;
	f?: number; // frame (for flag waving, blink, cape)
	label?: string;
	labelP?: number;
	opacity?: number;
	autoGround?: boolean;
	mood?: string; // neutral happy sad angry scared shout talk dead
	outfit?: string; // none sash tunic robe armor, "+cape" suffix adds a cape
	outfitColor?: string;
	shadow?: boolean;
	dust?: boolean;
	seed?: number;
};

// default costume per hat (overridable with outfit / outfitColor)
const OUTFIT: Record<string, [string, string | null]> = {
	general: ['armor+cape', null],
	king: ['robe+cape', '#d9a441'],
	hanking: ['robe', '#34344a'],
	hanofficial: ['robe', null],
	hair: ['robe', '#b85c5c'],
	hood: ['tunic+cape', '#3a2e2a'],
	han: ['tunic', null],
	band: ['sash', null],
	conical: ['tunic', '#a08a62'],
	none: ['none', null],
};

/** filled tapered segment a→b (brush stroke look) */
function seg2(a: [number, number], b: [number, number], wa: number, wb: number) {
	const dx = b[0] - a[0], dy = b[1] - a[1];
	const L = Math.hypot(dx, dy) || 1;
	const nx = -dy / L, ny = dx / L;
	const p1 = [a[0] + nx * wa, a[1] + ny * wa], p2 = [b[0] + nx * wb, b[1] + ny * wb];
	const p3 = [b[0] - nx * wb, b[1] - ny * wb], p4 = [a[0] - nx * wa, a[1] - ny * wa];
	const f = (n: number) => n.toFixed(1);
	return `M${f(p1[0])} ${f(p1[1])} L${f(p2[0])} ${f(p2[1])} A${f(wb)} ${f(wb)} 0 0 1 ${f(p3[0])} ${f(p3[1])} L${f(p4[0])} ${f(p4[1])} A${f(wa)} ${f(wa)} 0 0 1 ${f(p1[0])} ${f(p1[1])} Z`;
}

export const Stickman: React.FC<StickProps> = ({pose, x, ground, scale = 1, facing = 1, hat = 'none', weapon = 'none', color, ink = INK, f = 0, label, labelP = 1, opacity = 1, autoGround = true, mood = 'neutral', outfit, outfitColor, shadow = true, dust = false, seed = 0}) => {
	const fx = facing;
	const up = (a: number, len: number, o: [number, number]): [number, number] => [o[0] + sin(rad(a)) * len * fx, o[1] - Math.cos(rad(a)) * len];
	const dn = (a: number, len: number, o: [number, number]): [number, number] => [o[0] + sin(rad(a)) * len * fx, o[1] + Math.cos(rad(a)) * len];
	const hip: [number, number] = [0, 0];
	const neck = up(pose.t, L.torso, hip);
	const headA = pose.t + pose.h;
	const head = up(headA, L.head + 5, neck);
	const re = dn(pose.ra, L.ua, neck), rh = dn(pose.ra + pose.rf, L.fa, re);
	const le = dn(pose.la, L.ua, neck), lh = dn(pose.la + pose.lf, L.fa, le);
	const rk = dn(pose.rt, L.th, hip), rft = dn(pose.rt + pose.rs, L.sh, rk);
	const lk = dn(pose.lt, L.th, hip), lft = dn(pose.lt + pose.ls, L.sh, lk);
	const lowest = autoGround ? Math.max(rft[1], lft[1], rk[1], lk[1], head[1] + L.head, hip[1] + 4, neck[1] + 4) : Math.max(rft[1], lft[1]);
	const oy = ground / scale - lowest;
	const acc = color ?? RED;
	const [defOut, defCol] = OUTFIT[hat] ?? OUTFIT.none;
	const outStr = outfit ?? defOut;
	const cape = outStr.includes('+cape');
	const body = outStr.replace('+cape', '');
	const oc = outfitColor ?? defCol ?? acc;
	const handAng = Math.atan2(rh[1] - re[1], rh[0] - re[0]);
	const w = (k: number) => k * (1 + (rand(seed + k) - 0.5) * 0.12);
	// torso frame for costume
	const tdx = neck[0] - hip[0], tdy = neck[1] - hip[1];
	const tl = Math.hypot(tdx, tdy) || 1;
	const px = -tdy / tl, py = tdx / tl; // perpendicular
	const pt = (o: [number, number], k: number): string => `${(o[0] + px * k).toFixed(1)} ${(o[1] + py * k).toFixed(1)}`;
	const kneeMid: [number, number] = [(rk[0] + lk[0]) / 2, (rk[1] + lk[1]) / 2];
	const lying = Math.abs(pose.t) > 60;
	const hemSpread = lying ? 18 : 30 + Math.abs(rk[0] - lk[0]) * 0.4;
	const hem = (k: number): [number, number] => [kneeMid[0] + k * (lying ? px : 1), kneeMid[1] + (lying ? py * k : 6)];
	const midThigh: [number, number] = [(hip[0] + kneeMid[0]) / 2, (hip[1] + kneeMid[1]) / 2 + 8];
	// cape: from shoulders, trailing opposite facing, waving
	const trail = 34 + Math.max(0, pose.t) * 1.6;
	const wv = Math.sin((f + seed * 13) / 5) * 8;
	const capePath = `M${pt(neck, 9)} Q${(neck[0] - fx * (trail * 0.6)).toFixed(1)} ${(neck[1] + 40 + wv).toFixed(1)} ${(hip[0] - fx * trail).toFixed(1)} ${(hip[1] + 44 + wv).toFixed(1)} L${(hip[0] - fx * (trail - 22)).toFixed(1)} ${(hip[1] + 52 - wv).toFixed(1)} Q${(hip[0] - fx * 6).toFixed(1)} ${(hip[1] + 20).toFixed(1)} ${pt(neck, -9)} Z`;
	// face
	const blink = ((f + seed * 37) % 97) < 3;
	const ex = head[0] + 6 * fx, ey = head[1] + 1;
	const ex2 = head[0] + 14 * fx;
	const mx = head[0] + 10 * fx, my = head[1] + 11;
	const talkOpen = mood === 'talk' ? 2 + Math.abs(Math.sin(f / 2.2)) * 4 : 0;
	const face: React.ReactNode[] = [];
	if (mood === 'dead') {
		for (const cx of [ex, ex2]) face.push(<path key={'x' + cx} d={`M${cx - 3} ${ey - 3} l6 6 M${cx + 3} ${ey - 3} l-6 6`} stroke={ink} strokeWidth={2} />);
	} else {
		for (const cx of [ex, ex2]) {
			if (blink) face.push(<path key={'e' + cx} d={`M${cx - 2.6} ${ey} h5.2`} stroke={ink} strokeWidth={2} strokeLinecap="round" />);
			else face.push(<ellipse key={'e' + cx} cx={cx} cy={ey} rx={mood === 'scared' ? 2.9 : 2.2} ry={mood === 'scared' ? 3.6 : 2.8} fill={ink} />);
		}
		const brow: Record<string, number> = {angry: 1, sad: -1, scared: -0.6, shout: 0.8};
		const b = brow[mood] ?? 0;
		if (mood !== 'neutral' && mood !== 'talk' && mood !== 'happy') {
			face.push(<path key="bw1" d={`M${ex - 4 * fx} ${ey - 7 - b * 2} L${ex + 3 * fx} ${ey - 7 + b * 2}`} stroke={ink} strokeWidth={2.2} strokeLinecap="round" />);
			face.push(<path key="bw2" d={`M${ex2 - 3 * fx} ${ey - 7 + b * 2} L${ex2 + 4 * fx} ${ey - 7 - b * 2}`} stroke={ink} strokeWidth={2.2} strokeLinecap="round" />);
		}
	}
	const mouth: Record<string, string> = {
		neutral: `M${mx - 4} ${my} h8`,
		happy: `M${mx - 6} ${my - 2} Q${mx} ${my + 6} ${mx + 6} ${my - 2}`,
		sad: `M${mx - 5} ${my + 3} Q${mx} ${my - 3} ${mx + 5} ${my + 3}`,
		angry: `M${mx - 5} ${my + 1} L${mx + 5} ${my - 1}`,
		dead: `M${mx - 4} ${my + 1} q4 -3 8 0`,
	};
	if (mood === 'shout' || mood === 'scared' || mood === 'talk') {
		const r = mood === 'shout' ? 5 : mood === 'scared' ? 3.2 : talkOpen;
		face.push(<ellipse key="m" cx={mx} cy={my + 1} rx={mood === 'talk' ? 4 : r * 0.9} ry={Math.max(1, r)} fill={ink} />);
	} else face.push(<path key="m" d={mouth[mood] ?? mouth.neutral} stroke={ink} strokeWidth={2.2} fill="none" strokeLinecap="round" />);
	if (mood === 'sad' && hat !== 'none') face.push(<path key="tear" d={`M${ex2} ${ey + 5} q-2 5 0 7 q2 -2 0 -7`} fill="#6f9dc2" />);
	const shadowX = (rft[0] + lft[0]) / 2;
	const dusts: React.ReactNode[] = [];
	if (dust) {
		for (let k = 0; k < 4; k++) {
			const age = ((f + k * 7 + seed * 5) % 28) / 28;
			dusts.push(<circle key={k} cx={shadowX - fx * (10 + age * 55)} cy={lowest - 4 - age * 14} r={5 + age * 13} fill="#b9a27a" opacity={(1 - age) * 0.4} />);
		}
	}
	return (
		<g transform={`translate(${x} ${0}) scale(${scale}) translate(0 ${oy})`} opacity={opacity}>
			{shadow && autoGround ? <ellipse cx={shadowX} cy={lowest + 1} rx={lying ? 70 : 32} ry={6} fill={ink} opacity={0.16} /> : null}
			{dusts}
			{cape ? <path d={capePath} fill={hat === 'hood' ? oc : acc} stroke={ink} strokeWidth={2.5} strokeLinejoin="round" opacity={0.95} /> : null}
			<g fill={ink} stroke="none">
				<path d={seg2(neck, le, w(4.6), w(3.8))} opacity={0.72} />
				<path d={seg2(le, lh, w(3.8), w(3))} opacity={0.72} />
				<path d={seg2(hip, lk, w(5.6), w(4.3))} opacity={0.72} />
				<path d={seg2(lk, lft, w(4.3), w(3.2))} opacity={0.72} />
				<path d={seg2(hip, neck, w(6.4), w(5))} />
				<path d={seg2(hip, rk, w(5.8), w(4.4))} />
				<path d={seg2(rk, rft, w(4.4), w(3.3))} />
				<path d={`M${rft[0]} ${rft[1]} l${9 * fx} 0`} stroke={ink} strokeWidth={4.5} strokeLinecap="round" />
				<path d={`M${lft[0]} ${lft[1]} l${9 * fx} 0`} stroke={ink} strokeWidth={4} strokeLinecap="round" opacity={0.72} />
			</g>
			{body === 'robe' ? (
				<g>
					<path d={`M${pt(neck, 11)} L${pt(hip, 20)} L${hem(hemSpread)[0].toFixed(1)} ${hem(hemSpread)[1].toFixed(1)} L${hem(-hemSpread)[0].toFixed(1)} ${hem(-hemSpread)[1].toFixed(1)} L${pt(hip, -20)} L${pt(neck, -11)} Z`} fill={oc} stroke={ink} strokeWidth={3} strokeLinejoin="round" />
					<path d={`M${pt(hip, 20)} L${pt(hip, -20)}`} stroke={GOLD} strokeWidth={4} />
					<path d={`M${neck[0].toFixed(1)} ${neck[1].toFixed(1)} L${hip[0] + px * 6} ${hip[1] + py * 6}`} stroke={ink} strokeWidth={1.6} opacity={0.5} />
				</g>
			) : null}
			{body === 'tunic' ? (
				<g>
					<path d={`M${pt(neck, 10)} L${pt(hip, 15)} L${(midThigh[0] + (lying ? px * 22 : 22)).toFixed(1)} ${(midThigh[1] + (lying ? py * 22 : 0)).toFixed(1)} L${(midThigh[0] - (lying ? px * 22 : 22)).toFixed(1)} ${(midThigh[1] - (lying ? py * 22 : 0)).toFixed(1)} L${pt(hip, -15)} L${pt(neck, -10)} Z`} fill={oc} stroke={ink} strokeWidth={2.6} strokeLinejoin="round" />
					<path d={`M${pt(hip, 15)} L${pt(hip, -15)}`} stroke={ink} strokeWidth={3} />
				</g>
			) : null}
			{body === 'armor' ? (
				<g>
					<path d={`M${pt(neck, 13)} L${pt(hip, 11)} L${pt(hip, -11)} L${pt(neck, -13)} Z`} fill="#8a6a3a" stroke={ink} strokeWidth={2.8} strokeLinejoin="round" />
					{[0.3, 0.55, 0.8].map((k) => {
						const a: [number, number] = [hip[0] + tdx * k, hip[1] + tdy * k];
						return <path key={k} d={`M${pt(a, 11)} Q${(a[0] + tdx * 0.05).toFixed(1)} ${(a[1] + tdy * 0.05 + 3).toFixed(1)} ${pt(a, -11)}`} stroke={ink} strokeWidth={1.5} fill="none" opacity={0.7} />;
					})}
					<path d={`M${pt(hip, 13)} L${(midThigh[0] + 16).toFixed(1)} ${(midThigh[1]).toFixed(1)} L${(midThigh[0] - 16).toFixed(1)} ${(midThigh[1]).toFixed(1)} L${pt(hip, -13)} Z`} fill={acc} stroke={ink} strokeWidth={2.4} strokeLinejoin="round" />
					<circle cx={neck[0]} cy={neck[1] + 4} r={9} fill="#8a6a3a" stroke={ink} strokeWidth={2.4} />
				</g>
			) : null}
			{body === 'sash' ? <path d={`M${pt(neck, 7)} L${pt(hip, -9)}`} stroke={acc} strokeWidth={5} strokeLinecap="round" /> : null}
			<circle cx={head[0]} cy={head[1]} r={L.head} fill="#f3e8d2" stroke={ink} strokeWidth={4.4} />
			{face}
			<Hat kind={hat} head={head} ang={headA} fx={fx} acc={acc} ink={ink} />
			<Weapon kind={weapon} hand={rh} ang={handAng} fx={fx} acc={acc} ink={ink} f={f} />
			<g fill={ink}>
				<path d={seg2(neck, re, w(4.8), w(4))} />
				<path d={seg2(re, rh, w(4), w(3.1))} />
				<circle cx={rh[0]} cy={rh[1]} r={4.2} />
			</g>
			{label ? (
				<g opacity={labelP} transform={`translate(${head[0]} ${head[1] - L.head - 62}) scale(${1 / scale})`}>
					<text textAnchor="middle" fontFamily='"Patrick Hand", cursive' fontSize={38} fill={ink} stroke="#f3e8d2" strokeWidth={6} paintOrder="stroke">
						{label}
					</text>
					<path d="M0 10 L0 34 M-7 26 L0 36 L7 26" stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />
				</g>
			) : null}
		</g>
	);
};

/** default facial expression for a pose name */
export const moodFor = (pose: string): string =>
	({cry: 'sad', fear: 'scared', panic: 'scared', swim: 'scared', fight: 'angry', stab: 'angry', shoot: 'angry', shootcycle: 'angry', cheer: 'happy', dead: 'dead', fallen: 'dead', talk: 'talk', raise: 'shout', run: 'angry', bow: 'sad', think: 'neutral', hammer: 'neutral', row: 'neutral'} as Record<string, string>)[pose] ?? 'neutral';

const Hat: React.FC<{kind: string; head: [number, number]; ang: number; fx: number; acc: string; ink: string}> = ({kind, head, ang, fx, acc, ink}) => {
	if (kind === 'none') return null;
	const r = L.head;
	const tr = `translate(${head[0]} ${head[1]}) rotate(${ang * fx}) scale(${fx} 1)`;
	const st = {stroke: ink, strokeWidth: 3.5, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const};
	switch (kind) {
		case 'band': // Viet soldier headband with tails
			return (
				<g transform={tr}>
					<path d={`M${-r} -6 Q0 -14 ${r} -6`} stroke={acc} strokeWidth={7} fill="none" strokeLinecap="round" />
					<path d={`M${-r + 2} -6 q-14 6 -22 20 M${-r + 2} -6 q-18 0 -26 10`} stroke={acc} strokeWidth={4.5} fill="none" strokeLinecap="round" />
				</g>
			);
		case 'conical': // nón lá
			return (
				<g transform={tr}>
					<path d={`M${-r - 16} -8 L0 ${-r - 26} L${r + 16} -8 Z`} fill="#d9b779" {...st} />
				</g>
			);
		case 'general':
			return (
				<g transform={tr}>
					<path d={`M${-r - 3} -4 Q${-r} ${-r - 10} 0 ${-r - 8} Q${r} ${-r - 10} ${r + 3} -4 Z`} fill="#8a6a3a" {...st} />
					<path d={`M0 ${-r - 8} q-4 -22 10 -34 q-2 16 4 30`} fill={acc} {...st} strokeWidth={2.5} />
					<path d={`M${-r - 6} -4 L${r + 6} -4`} {...st} />
				</g>
			);
		case 'king': // Vietnamese king: tall cap with side wings
			return (
				<g transform={tr}>
					<path d={`M${-r + 2} -8 L${-r + 4} ${-r - 20} L${r - 4} ${-r - 20} L${r - 2} -8 Z`} fill={GOLD} {...st} />
					<path d={`M${-r + 2} ${-r + 2} l-22 -6 l2 8 Z M${r - 2} ${-r + 2} l22 -6 l-2 8 Z`} fill={GOLD} {...st} strokeWidth={2.5} />
					<circle cx={0} cy={-r - 8} r={4} fill={acc} stroke="none" />
				</g>
			);
		case 'han': // Southern Han soldier cap
			return (
				<g transform={tr}>
					<path d={`M${-r - 2} -6 Q0 ${-r - 22} ${r + 2} -6 Z`} fill={HAN} {...st} />
					<circle cx={0} cy={-r - 12} r={4} fill={HAN} {...st} strokeWidth={2} />
				</g>
			);
		case 'hanofficial': // official cap with side flaps
			return (
				<g transform={tr}>
					<path d={`M${-r + 2} -6 L${-r + 4} ${-r - 12} L${r - 4} ${-r - 12} L${r - 2} -6 Z`} fill="#1d1d1d" {...st} />
					<path d={`M${-r + 2} ${-r} l-30 3 M${r - 2} ${-r} l30 3`} {...st} strokeWidth={4} />
				</g>
			);
		case 'hanking': // emperor mian crown
			return (
				<g transform={tr}>
					<path d={`M${-r + 4} -8 L${-r + 6} ${-r - 10} L${r - 6} ${-r - 10} L${r - 4} -8 Z`} fill="#1d1d1d" {...st} />
					<path d={`M${-r - 16} ${-r - 16} L${r + 16} ${-r - 10}`} stroke={ink} strokeWidth={7} strokeLinecap="round" />
					{[-14, -4, 6, 16].map((xx) => (
						<path key={xx} d={`M${xx} ${-r - 12} l0 14`} stroke={GOLD} strokeWidth={2.5} strokeDasharray="3 3" />
					))}
				</g>
			);
		case 'hair': // woman: bun + hairpin
			return (
				<g transform={tr}>
					<path d={`M${-r} -2 Q${-r} ${-r - 4} 0 ${-r - 2} Q${r} ${-r - 4} ${r} -2`} fill={ink} stroke="none" />
					<circle cx={-r + 2} cy={-r} r={10} fill={ink} />
					<path d={`M${-r - 12} ${-r - 8} l20 10`} stroke={acc} strokeWidth={3} />
				</g>
			);
		case 'hood':
			return (
				<g transform={tr}>
					<path d={`M${-r - 4} 8 Q${-r - 6} ${-r - 10} 0 ${-r - 6} Q${r + 6} ${-r - 10} ${r + 4} 0 L${r - 2} -4 Q0 -14 ${-r} 8 Z`} fill="#3a2e2a" {...st} />
				</g>
			);
		default:
			return null;
	}
};

const Weapon: React.FC<{kind: string; hand: [number, number]; ang: number; fx: number; acc: string; ink: string; f: number}> = ({kind, hand, ang, fx, acc, ink, f}) => {
	if (kind === 'none') return null;
	const deg = (ang * 180) / Math.PI;
	const st = {stroke: ink, strokeWidth: 3.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
	const at = `translate(${hand[0]} ${hand[1]})`;
	switch (kind) {
		case 'sword':
			return (
				<g transform={`${at} rotate(${deg})`}>
					<path d="M-4 0 L62 0" stroke="#8c8c8c" strokeWidth={5} strokeLinecap="round" />
					<path d="M0 -9 L0 9" {...st} strokeWidth={4.5} />
					<path d="M-14 0 L-3 0" {...st} strokeWidth={5} />
				</g>
			);
		case 'dagger':
			return (
				<g transform={`${at} rotate(${deg})`}>
					<path d="M0 0 L28 0" stroke="#8c8c8c" strokeWidth={4.5} strokeLinecap="round" />
					<path d="M0 -6 L0 6" {...st} />
				</g>
			);
		case 'spear':
			return (
				<g transform={at}>
					<path d="M0 60 L0 -120" {...st} strokeWidth={4} />
					<path d="M-7 -118 L0 -142 L7 -118 Z" fill="#8c8c8c" {...st} strokeWidth={2.5} />
					<path d="M-6 -112 q6 10 12 0" stroke={acc} strokeWidth={4} fill="none" />
				</g>
			);
		case 'flag': {
			const wv = Math.sin(f / 5) * 8;
			return (
				<g transform={at}>
					<path d="M0 40 L0 -170" {...st} strokeWidth={4.5} />
					<path d={`M0 -168 Q${34 * fx} ${-178 + wv} ${70 * fx} ${-166 - wv} L${66 * fx} ${-118 - wv} Q${32 * fx} ${-126 + wv} 0 -118 Z`} fill={acc} {...st} strokeWidth={3} />
				</g>
			);
		}
		case 'torch': {
			const fl = Math.sin(f / 2.3) * 3;
			return (
				<g transform={at}>
					<path d="M0 20 L0 -50" {...st} strokeWidth={5} />
					<path d={`M0 -48 q-14 -14 -4 -34 q2 10 8 6 q-2 -12 6 -22 q12 22 -2 50 Z`} transform={`skewX(${fl})`} fill="#e07b1f" stroke="#b3261e" strokeWidth={2} />
				</g>
			);
		}
		case 'bow':
			return (
				<g transform={at}>
					<path d="M0 -58 Q30 0 0 58" {...st} strokeWidth={4} fill="none" />
					<path d="M0 -58 L0 58" stroke={ink} strokeWidth={1.5} />
				</g>
			);
		case 'scroll':
			return (
				<g transform={at}>
					<rect x={-6} y={-30} width={46} height={40} fill="#efe1bf" {...st} strokeWidth={3} />
					<path d="M4 -18 h26 M4 -8 h26 M4 2 h18" stroke={ink} strokeWidth={2} />
				</g>
			);
		case 'oar':
			return (
				<g transform={`${at} rotate(${deg + 20})`}>
					<path d="M-30 0 L80 0" {...st} strokeWidth={4} />
					<path d="M70 -7 L104 -5 L104 5 L70 7 Z" fill="#b08850" {...st} strokeWidth={2.5} />
				</g>
			);
		case 'hammer':
			return (
				<g transform={`${at} rotate(${deg})`}>
					<path d="M-6 0 L46 0" {...st} strokeWidth={5} />
					<rect x={42} y={-14} width={20} height={28} fill="#6b4f2a" {...st} strokeWidth={3} />
				</g>
			);
		case 'log':
			return (
				<g transform={at}>
					<path d="M-150 -6 L110 -6 L140 0 L110 6 L-150 6 Z" fill="#a47c48" {...st} strokeWidth={3} />
					<path d="M110 -6 L140 0 L110 6" fill="#6f6f6f" {...st} strokeWidth={3} />
				</g>
			);
		case 'gift':
			return (
				<g transform={at}>
					<rect x={-4} y={-38} width={44} height={36} fill={GOLD} {...st} strokeWidth={3} />
					<path d="M18 -38 v36 M-4 -20 h44" stroke={acc} strokeWidth={3} />
				</g>
			);
		default:
			return null;
	}
};
