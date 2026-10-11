import React from 'react';
import {AbsoluteFill, Audio, Easing, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {fonts} from './fonts';
import data from './aff.json';

// ---------- style ----------
const PAL = data.palette as Record<string, string>;
const C = {green: PAL.primary, dark: PAL.dark, red: PAL.accent, yellow: PAL.highlight, cream: PAL.light, white: '#ffffff'};
const E = data.energy as number; // motion energy: 0.5 calm … 1.3 wild
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const STROKE = (w: number) => ({WebkitTextStroke: `${w}px ${C.dark}`, paintOrder: 'stroke fill'} as React.CSSProperties);

type Any = any; // scene props come from script.json (see references/scene-kinds.md)
type Sc = {id: string; kind: string; from: number; dur: number; text: string; beats: Any} & Any;
const scenes = data.scenes as Sc[];

const pop = (f: number, fps: number, delay = 0, damping = 11) =>
	spring({frame: f - delay, fps, config: {damping: Math.max(6, damping / Math.max(0.6, E) + (E < 0.8 ? 6 : 0)), stiffness: 180, mass: 0.7}});
// font size that keeps the longest line of `t` inside ~940 px (ExtraBold caps ≈ 0.74 em/glyph + overshoot)
const fit = (t: string, max: number) => Math.min(max, Math.floor(940 / (Math.max(1, ...String(t ?? '').split('\n').map((l) => l.length)) * 0.8)));
// split a long one-liner at the space nearest its middle (big hook/statement text reads best on 2 lines)
const brk = (t: string, max = 11) => {
	t = String(t ?? '');
	if (t.includes('\n') || t.length <= max) return t;
	const mid = t.length / 2;
	let best = -1;
	for (let i = 0; i < t.length; i++) if (t[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
	return best < 0 ? t : t.slice(0, best) + '\n' + t.slice(best + 1);
};
const rot = (deg: number) => deg * Math.min(1.4, E);

// ---------- building blocks ----------
const Photo: React.FC<{src: string; dur: number; zoomFrom?: number; zoomTo?: number; blur?: number; dim?: number; pos?: string}> = ({src, dur, zoomFrom = 1.05, zoomTo = 1.18, blur = 0, dim = 0, pos = 'center'}) => {
	const f = useCurrentFrame();
	const s = interpolate(f, [0, dur], [zoomFrom, zoomTo], clamp);
	return (
		<AbsoluteFill style={{overflow: 'hidden', background: C.cream}}>
			<Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos, transform: `scale(${s})`, filter: blur ? `blur(${blur}px)` : undefined}} />
			{dim > 0 && <AbsoluteFill style={{background: `rgba(0,0,0,${dim})`}} />}
		</AbsoluteFill>
	);
};

const BlurBg: React.FC<{src: string; dur: number; dim?: number}> = ({src, dur, dim = 0.45}) => <Photo src={src} dur={dur} blur={16} dim={dim} zoomFrom={1.3} zoomTo={1.4} />;

const Card: React.FC<{src: string; delay?: number; top?: number; size?: number; tilt?: number}> = ({src, delay = 0, top = 300, size = 840, tilt = -2}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const p = pop(f, fps, delay, 9);
	const s = interpolate(p, [0, 1], [1 + 0.6 * E, 1]);
	const breathe = 1 + 0.015 * E * Math.sin((f - delay) / 9);
	return (
		<div style={{position: 'absolute', left: (1080 - size) / 2, top, width: size, height: size, opacity: interpolate(p, [0, 0.2], [0, 1], clamp),
			transform: `scale(${s * breathe}) rotate(${rot(tilt) * p}deg)`, borderRadius: 36, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.35)', border: '10px solid white'}}>
			<Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
		</div>
	);
};

const Chip: React.FC<{text: string; delay: number; x: number | 'center'; y: number; bg?: string; color?: string; size?: number; tilt?: number}> = ({text, delay, x, y, bg = C.yellow, color = C.dark, size = 54, tilt = -3}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	if (!text || f < delay) return null;
	const p = pop(f, fps, delay, 8);
	const wobble = E > 1.1 ? Math.sin((f - delay) / 4) * 2 * (E - 1) : 0;
	const box: React.CSSProperties = {background: bg, color, fontFamily: fonts.body, fontWeight: 800, fontSize: size, padding: '14px 30px', borderRadius: 22,
		boxShadow: '0 10px 0 rgba(0,0,0,0.18)', whiteSpace: 'nowrap', transform: `scale(${p}) rotate(${rot(tilt) + wobble}deg)`};
	if (x === 'center')
		return <div style={{position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center'}}><div style={box}>{text}</div></div>;
	return <div style={{position: 'absolute', left: x, top: y, ...box}}>{text}</div>;
};

const Title: React.FC<{text: string; delay: number; top: number; size?: number; color?: string}> = ({text, delay, top, size = 84, color = C.white}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	if (!text) return null;
	return (
		<div style={{position: 'absolute', top, left: 40, right: 40, textAlign: 'center', fontFamily: fonts.body, fontWeight: 800, fontSize: size, lineHeight: 1.08, color, whiteSpace: 'pre-line',
			...STROKE(Math.round(size / 8)), transform: `scale(${Math.max(0, pop(f, fps, delay))})`}}>{text}</div>
	);
};

// ---------- kinetic captions ----------
const Caption: React.FC<{text: string; dur: number}> = ({text, dur}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const words = text.split(/\s+/).filter(Boolean);
	const lead = 0.12 * fps, tail = 0.3 * fps;
	const span = Math.max(1, dur - lead - tail);
	const weights = words.map((w) => w.length + 2);
	const total = weights.reduce((a, b) => a + b, 0);
	let acc = 0;
	const starts = weights.map((w) => {const s = lead + (acc / total) * span; acc += w; return s;});
	let cur = 0;
	starts.forEach((s, i) => {if (f >= s) cur = i;});
	const G = 4;
	const g0 = Math.floor(cur / G) * G;
	const pIn = pop(f, fps, starts[g0], 12);
	return (
		<div style={{position: 'absolute', left: 60, right: 170, top: 1330, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 18px',
			transform: `scale(${interpolate(pIn, [0, 1], [0.85, 1])})`}}>
			{words.slice(g0, g0 + G).map((w, i) => {
				const idx = g0 + i;
				return (
					<span key={idx} style={{fontFamily: fonts.body, fontWeight: 800, fontSize: 76, lineHeight: 1.15, textTransform: 'uppercase', display: 'inline-block',
						color: idx === cur ? C.yellow : idx < cur ? C.white : 'rgba(255,255,255,0.55)', ...STROKE(10), transform: idx === cur ? 'scale(1.08)' : undefined}}>{w}</span>
				);
			})}
		</div>
	);
};

// ---------- scene kinds ----------
const Hook: React.FC<{sc: Sc}> = ({sc}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const b = sc.beats;
	const shake = f < 18 ? Math.sin(f * 2.2) * interpolate(f, [0, 18], [14 * E, 0]) : 0;
	const p1 = Math.max(0.6, pop(f, fps, b.top, 8)), p2 = Math.max(0.5, pop(f, fps, b.big, 7));
	return (
		<AbsoluteFill>
			<Photo src={sc.image} dur={sc.dur} blur={14} dim={0.55} zoomFrom={1.25} zoomTo={1.35} />
			<AbsoluteFill style={{transform: `translateX(${shake}px)`, alignItems: 'center', paddingTop: 360}}>
				{sc.top && <div style={{transform: `scale(${p1}) rotate(${rot(-4)}deg)`, background: C.white, color: C.dark, fontFamily: fonts.body, fontWeight: 800, fontSize: 84, padding: '18px 40px', borderRadius: 20, whiteSpace: 'nowrap'}}>{sc.top}</div>}
				<div style={{marginTop: 30, transform: `scale(${p2}) rotate(${rot(3)}deg)`, color: C.yellow, fontFamily: fonts.body, fontWeight: 800, fontSize: sc.bigSize ?? fit(brk(sc.big), 150), lineHeight: 1.05,
					textAlign: 'center', padding: '0 40px', whiteSpace: 'pre-line', ...STROKE(14)}}>{brk(sc.big)}</div>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};

const Product: React.FC<{sc: Sc}> = ({sc}) => (
	<AbsoluteFill>
		<BlurBg src={sc.bg ?? sc.image} dur={sc.dur} dim={0.35} />
		<Card src={sc.image} top={260} />
		<Chip text={sc.tag} delay={sc.beats.tag} x={70} y={170} bg={C.red} color={C.white} size={64} tilt={-5} />
		<Chip text={sc.chip} delay={sc.beats.chip} x={sc.chipX ?? 400} y={1080} size={56} tilt={4} />
	</AbsoluteFill>
);

const Chips: React.FC<{sc: Sc}> = ({sc}) => (
	<AbsoluteFill>
		<Photo src={sc.image} dur={sc.dur} zoomFrom={1.05} zoomTo={1.15} pos={sc.pos ?? 'center'} />
		<AbsoluteFill style={{background: `linear-gradient(180deg, rgba(0,0,0,0) 30%, ${C.dark}cc 100%)`}} />
		<Chip text={sc.title} delay={sc.beats.title} x="center" y={150} bg={C.green} color={C.white} size={70} tilt={-2} />
		{(sc.items as string[]).map((it, i) => (
			<Chip key={i} text={it} delay={sc.beats.items[i]} x={i % 2 ? 560 : 60} y={860 + Math.floor(i / 2) * 150} bg={C.white} color={C.green} size={it.length > 14 ? 42 : 52} tilt={i % 2 ? 3 : -3} />
		))}
	</AbsoluteFill>
);

const Steps: React.FC<{sc: Sc}> = ({sc}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const steps = sc.steps as [string, string][];
	const w = Math.min(300, Math.floor((960 - (steps.length - 1) * 24) / steps.length));
	return (
		<AbsoluteFill>
			<BlurBg src={sc.image} dur={sc.dur} />
			<Title text={sc.title} delay={sc.beats.title} top={200} />
			<div style={{position: 'absolute', top: 400, left: 60, right: 60, display: 'flex', justifyContent: 'center', gap: 24}}>
				{steps.map(([big, small], i) => {
					const p = pop(f, fps, sc.beats.steps[i], 8);
					return (
						<div key={i} style={{width: w, height: 360, background: C.cream, borderRadius: 32, transform: `scale(${p}) translateY(${(1 - p) * 80}px)`, display: 'flex', flexDirection: 'column',
							alignItems: 'center', justifyContent: 'center', boxShadow: '0 14px 0 rgba(0,0,0,0.25)', border: `8px solid ${C.green}`, padding: 10}}>
							<div style={{fontFamily: fonts.body, fontWeight: 800, fontSize: big.length > 3 ? 100 : 150, color: C.red, lineHeight: 1}}>{big}</div>
							<div style={{fontFamily: fonts.body, fontWeight: 800, fontSize: 38, color: C.green, marginTop: 14, textAlign: 'center'}}>{small}</div>
						</div>
					);
				})}
			</div>
			<Chip text={sc.chip} delay={sc.beats.chip} x="center" y={900} size={56} tilt={-3} />
		</AbsoluteFill>
	);
};

const Proof: React.FC<{sc: Sc}> = ({sc}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const b = sc.beats;
	const target = sc.count ?? 0;
	const v = Math.round(interpolate(f, [b.countFrom, b.countTo], [0, target], {...clamp, easing: Easing.out(Easing.cubic)}));
	const rating = sc.rating ?? 0;
	const stars = interpolate(f, [b.countTo, b.starsTo], [0, rating], clamp);
	return (
		<AbsoluteFill>
			<BlurBg src={sc.image} dur={sc.dur} dim={0.55} />
			<div style={{position: 'absolute', top: 170, width: '100%', textAlign: 'center'}}>
				{target > 0 && <>
					<div style={{fontFamily: fonts.body, fontWeight: 800, fontSize: 170, color: C.yellow, lineHeight: 1, ...STROKE(12)}}>{v >= target ? sc.countLabel : v.toLocaleString('vi-VN')}</div>
					<div style={{fontFamily: fonts.body, fontWeight: 800, fontSize: 60, color: C.white, marginTop: 4}}>{sc.countText}</div>
				</>}
				{rating > 0 && <div style={{marginTop: 30, display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center'}}>
					{[0, 1, 2, 3, 4].map((i) => (
						<div key={i} style={{position: 'relative', fontSize: 90, lineHeight: 1}}>
							<span style={{color: 'rgba(255,255,255,0.3)'}}>★</span>
							<span style={{position: 'absolute', left: 0, top: 0, width: `${Math.max(0, Math.min(1, stars - i)) * 100}%`, overflow: 'hidden', color: C.yellow}}>★</span>
						</div>
					))}
					<span style={{fontFamily: fonts.body, fontWeight: 800, fontSize: 80, color: C.white, marginLeft: 16}}>{stars.toFixed(1)}</span>
				</div>}
			</div>
			{(sc.reviews as [string, string, number?][]).map(([txt, user, st], i) => {
				const d = b.reviews[i];
				if (f < d) return null;
				return (
					<div key={i} style={{position: 'absolute', left: i % 2 ? 140 : 60, top: 640 + i * 190, width: 800, transform: `scale(${pop(f, fps, d, 10)}) rotate(${rot(i % 2 ? 2 : -2)}deg)`,
						background: 'white', borderRadius: 26, padding: '22px 30px', boxShadow: '0 12px 30px rgba(0,0,0,0.35)'}}>
						<div style={{fontFamily: fonts.body, fontWeight: 700, fontSize: 30, color: '#888'}}>{user}{st ? ' · ' + '★'.repeat(st) : ''}</div>
						<div style={{fontFamily: fonts.body, fontWeight: 800, fontSize: 40, color: C.dark, marginTop: 6}}>“{txt}”</div>
					</div>
				);
			})}
		</AbsoluteFill>
	);
};

const Price: React.FC<{sc: Sc}> = ({sc}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const b = sc.beats;
	const strike = interpolate(f, [b.strikeFrom, b.strikeTo], [0, 100], clamp);
	const pNew = pop(f, fps, b.new, 7);
	const pBadge = pop(f, fps, b.badge, 6);
	const flash = interpolate(f, [b.new, b.new + 2, b.new + 10], [0, 0.7 * Math.min(1, E), 0], clamp);
	return (
		<AbsoluteFill>
			<Photo src={sc.image} dur={sc.dur} zoomFrom={1.1} zoomTo={1.25} />
			<AbsoluteFill style={{background: `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 40%, ${C.dark}dd 70%)`}} />
			<div style={{position: 'absolute', top: 820, width: '100%', textAlign: 'center'}}>
				{sc.old && <div style={{position: 'relative', display: 'inline-block', fontFamily: fonts.body, fontWeight: 800, fontSize: 96, color: 'rgba(255,255,255,0.85)'}}>
					{sc.old}
					<div style={{position: 'absolute', left: -10, top: '52%', height: 12, width: `${strike * 1.05}%`, background: C.red, transform: 'rotate(-6deg)', borderRadius: 6}} />
				</div>}
				<div style={{fontFamily: fonts.body, fontWeight: 800, fontSize: Math.min(210, Math.floor(940 / (String(sc.new).length * 0.9))), color: C.yellow, lineHeight: 1.05, transform: `scale(${pNew})`, ...STROKE(14)}}>{sc.new}</div>
				<div style={{fontFamily: fonts.body, fontWeight: 700, fontSize: 32, color: 'rgba(255,255,255,0.85)', marginTop: 6, opacity: pNew, padding: '0 60px'}}>{sc.note}</div>
			</div>
			{sc.badge && <div style={{position: 'absolute', right: 150, top: 260, width: 260, height: 260, borderRadius: '50%', background: C.red, color: 'white', display: 'flex', alignItems: 'center',
				justifyContent: 'center', fontFamily: fonts.body, fontWeight: 800, fontSize: sc.badge.length > 4 ? 72 : 96,
				transform: `scale(${pBadge * (1 + 0.05 * E * Math.sin(f / 3))}) rotate(${12 + 4 * E * Math.sin(f / 5)}deg)`,
				boxShadow: '0 0 0 12px rgba(255,255,255,0.9), 0 20px 50px rgba(0,0,0,0.4)'}}>{sc.badge}</div>}
			<AbsoluteFill style={{background: 'white', opacity: flash}} />
		</AbsoluteFill>
	);
};

// before/after: left image, a wipe reveals the right image
const Compare: React.FC<{sc: Sc}> = ({sc}) => {
	const f = useCurrentFrame();
	const b = sc.beats;
	const x = interpolate(f, [b.wipe, b.wipe + 14], [100, 0], {...clamp, easing: Easing.inOut(Easing.cubic)});
	return (
		<AbsoluteFill>
			<Photo src={sc.left} dur={sc.dur} />
			<AbsoluteFill style={{clipPath: `inset(0 0 0 ${x}%)`}}><Photo src={sc.right} dur={sc.dur} /></AbsoluteFill>
			{x > 0 && x < 100 && <div style={{position: 'absolute', top: 0, bottom: 0, left: `${x}%`, width: 10, background: 'white', boxShadow: '0 0 20px rgba(0,0,0,0.5)'}} />}
			<Chip text={sc.leftLabel} delay={b.left} x={70} y={220} bg={C.white} color={C.dark} size={60} tilt={-4} />
			<Chip text={sc.rightLabel} delay={b.right} x={520} y={220} bg={C.yellow} color={C.dark} size={60} tilt={4} />
		</AbsoluteFill>
	);
};

const Statement: React.FC<{sc: Sc}> = ({sc}) => {
	const big = brk(sc.big, 14);
	const lines = big.split('\n');
	const size = sc.bigSize ?? fit(big, 120);
	const top = sc.top ?? 360;
	return (
		<AbsoluteFill>
			<Photo src={sc.image} dur={sc.dur} dim={0.45} blur={sc.blur ?? 10} zoomFrom={1.2} zoomTo={1.3} />
			<Title text={big} delay={sc.beats.big} top={top} size={size} color={C.yellow} />
			<Chip text={sc.sub} delay={sc.beats.sub} x="center" y={top + Math.round(lines.length * size * 1.1) + 60} bg={C.white} color={C.dark} size={54} tilt={-2} />
		</AbsoluteFill>
	);
};

const Cta: React.FC<{sc: Sc}> = ({sc}) => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const bob = Math.abs(Math.sin(f / 5)) * 40 * Math.max(0.6, E);
	const p = pop(f, fps, sc.beats.main, 8);
	const left = data.arrow === 'bottom-center' ? 430 : 90;
	return (
		<AbsoluteFill>
			<Photo src={sc.image} dur={sc.dur} zoomFrom={1.0} zoomTo={1.1} />
			<AbsoluteFill style={{background: 'rgba(0,0,0,0.3)'}} />
			<div style={{position: 'absolute', top: 260, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${p})`}}>
				<div style={{background: C.red, color: 'white', fontFamily: fonts.body, fontWeight: 800, fontSize: 92, padding: '20px 44px', borderRadius: 30, transform: `rotate(${rot(-3)}deg)`,
					boxShadow: '0 12px 0 rgba(0,0,0,0.25)', whiteSpace: 'nowrap'}}>{sc.main ?? 'BẤM GIỎ HÀNG'}</div>
				{sc.sub && <div style={{marginTop: 26, background: 'white', color: C.green, fontFamily: fonts.body, fontWeight: 800, fontSize: 54, padding: '12px 32px', borderRadius: 20, transform: `rotate(${rot(2)}deg)`}}>{sc.sub}</div>}
			</div>
			<div style={{position: 'absolute', left, top: 1060 + bob, transform: `rotate(${data.arrow === 'bottom-center' ? 0 : 20}deg)`, opacity: interpolate(f, [sc.beats.arrow, sc.beats.arrow + 6], [0, 1], clamp)}}>
				<svg width="220" height="300" viewBox="0 0 220 300">
					{[[C.dark, 64], [C.yellow, 40]].map(([c, w], i) => (
						<g key={i} stroke={c as string} strokeWidth={w as number} fill="none" strokeLinecap="round" strokeLinejoin="round">
							<path d="M110 0 L110 200" /><path d="M20 170 L110 280 L200 170" />
						</g>
					))}
				</svg>
			</div>
		</AbsoluteFill>
	);
};

const KINDS: Record<string, React.FC<{sc: Sc}>> = {hook: Hook, product: Product, chips: Chips, steps: Steps, proof: Proof, price: Price, compare: Compare, statement: Statement, cta: Cta};

const Enter: React.FC<{children: React.ReactNode; first: boolean}> = ({children, first}) => {
	const f = useCurrentFrame();
	const p = first ? 1 : interpolate(f, [0, 6], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const blur = interpolate(p, [0, 1], [18 * Math.min(1, E), 0]);
	return <AbsoluteFill style={{transform: `scale(${interpolate(p, [0, 1], [1 + 0.25 * Math.min(1.2, E), 1])})`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined}}>{children}</AbsoluteFill>;
};

const Flash: React.FC = () => {
	const f = useCurrentFrame();
	return <AbsoluteFill style={{background: 'white', opacity: interpolate(f, [0, 5], [0.55 * Math.min(1, E), 0], clamp)}} />;
};

export const AffVideo: React.FC = () => {
	const f = useCurrentFrame();
	const {durationInFrames} = useVideoConfig();
	return (
		<AbsoluteFill style={{background: C.dark}}>
			{scenes.map((sc, i) => {
				const K = KINDS[sc.kind];
				return (
					<Sequence key={sc.id} from={sc.from} durationInFrames={sc.dur}>
						<Enter first={i === 0}><K sc={sc} /></Enter>
						{sc.caption !== false && <Caption text={sc.text} dur={sc.kind === 'cta' ? sc.dur - Math.round(((data as Any).ctaHoldSec ?? 1.5) * 30) : sc.dur} />}
					</Sequence>
				);
			})}
			{E >= 0.8 && scenes.slice(1).map((sc) => <Sequence key={'fl' + sc.id} from={sc.from} durationInFrames={5}><Flash /></Sequence>)}
			<div style={{position: 'absolute', top: 0, left: 0, height: 14, width: `${(f / durationInFrames) * 100}%`, background: C.yellow}} />
			<Audio src={staticFile('beat.m4a')} volume={data.musicVolume as number} />
			{scenes.map((sc) => <Sequence key={'a' + sc.id} from={sc.from}><Audio src={staticFile(`audio/${sc.id}.wav`)} /></Sequence>)}
			{(data.sfx as [string, number, number][]).map(([name, at, vol], i) => (
				<Sequence key={'x' + i} from={at} durationInFrames={45}><Audio src={staticFile(`sfx/${name}.wav`)} volume={vol} /></Sequence>
			))}
		</AbsoluteFill>
	);
};
