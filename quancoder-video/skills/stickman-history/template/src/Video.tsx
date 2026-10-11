import React from 'react';
import {AbsoluteFill, Sequence, staticFile, useCurrentFrame, interpolate, random, Easing} from 'remotion';
import {Audio} from '@remotion/media';
import {SceneView, SceneData} from './SceneView';
import {fonts} from './fonts';
import data from './data.json';

const D: any = data;
const T: number = D.tear;
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

type Cap = {text: string; from: number; to: number};

// Ink-brush wipe: the entering scene is revealed left→right behind a ragged edge.
function wipeClip(p: number, seed: string) {
	const X = interpolate(p, [0, 1], [-160, 2080]);
	const pts: string[] = [];
	const n = 18;
	for (let i = 0; i <= n; i++) {
		const y = (1080 * i) / n;
		const off = (random(`${seed}-${i}`) - 0.5) * 120 + Math.sin(i * 1.3) * 40 - (i / n) * 80;
		pts.push(`${(X + off).toFixed(0)}px ${y.toFixed(0)}px`);
	}
	return `polygon(0px 0px, ${pts.join(', ')}, 0px 1080px)`;
}

/** Big brush-stroke chapter banner that flies into the corner stamp. */
const ChapterCard: React.FC<{text: string; f: number; lead: number; seed: string}> = ({text, f, lead, seed}) => {
	const acc = D.style?.accent ?? '#b3261e';
	const [num, title] = text.includes('·') ? text.split('·').map((x) => x.trim()) : ['', text];
	const t = f - lead;
	if (t < -2 || t > 64) return null;
	const draw = interpolate(t, [0, 12], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const out = interpolate(t, [46, 62], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const txt = interpolate(t, [6, 16], [0, 1], clamp);
	const W = 1150, H = 210;
	const top: string[] = [], bot: string[] = [];
	for (let i = 0; i <= 24; i++) {
		const x = 30 + (i / 24) * (W - 60);
		const taper = i > 20 ? (i - 20) * 14 : i < 2 ? (2 - i) * 10 : 0;
		top.push(`${x.toFixed(0)} ${(34 + taper + (random(`${seed}t${i}`) - 0.5) * 16).toFixed(0)}`);
		bot.push(`${x.toFixed(0)} ${(H - 30 - taper + (random(`${seed}b${i}`) - 0.5) * 16).toFixed(0)}`);
	}
	const d = `M${top.join(' L')} L${bot.reverse().join(' L')} Z`;
	return (
		<div
			style={{
				position: 'absolute',
				left: 960 - W / 2,
				top: 400 - H / 2,
				width: W,
				height: H,
				transform: `translate(${out * -620}px, ${out * -360}px) scale(${1 - out * 0.7}) rotate(${-2 - out * 2}deg)`,
				opacity: 1 - out * 0.9,
			}}
		>
			<svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
				<clipPath id={`cc-${seed}`}>
					<rect x={0} y={0} width={W * draw} height={H} />
				</clipPath>
				<g clipPath={`url(#cc-${seed})`}>
					<path d={d} fill={acc} opacity={0.93} />
					{[0, 1, 2, 3, 4].map((k) => (
						<path key={k} d={`M40 ${60 + k * 24} Q${W / 2} ${56 + k * 24 + (random(`${seed}s${k}`) - 0.5) * 20} ${W - 60 - k * 30} ${62 + k * 24}`} stroke="#000" strokeWidth={2} opacity={0.12} fill="none" />
					))}
				</g>
			</svg>
			<div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: txt, color: '#fbf4e2', textShadow: '0 3px 0 rgba(0,0,0,0.25)'}}>
				{num ? <div style={{fontFamily: fonts.body, fontWeight: 800, fontSize: 34, letterSpacing: 10}}>CHƯƠNG {num}</div> : null}
				<div style={{fontFamily: fonts.display, fontWeight: 900, fontSize: 92, lineHeight: 1.05, letterSpacing: 2}}>{title}</div>
			</div>
		</div>
	);
};

const Rod: React.FC<{x: number; flip?: boolean}> = ({x}) => (
	<div style={{position: 'absolute', left: x - 24, top: -20, width: 48, height: 1120, borderRadius: 24, background: 'linear-gradient(90deg,#4a2f18,#a8743e 35%,#e2b77a 50%,#a8743e 65%,#4a2f18)', boxShadow: '0 0 18px rgba(0,0,0,0.45)'}}>
		<div style={{position: 'absolute', left: -10, top: 0, width: 68, height: 34, borderRadius: 10, background: '#3a2414'}} />
		<div style={{position: 'absolute', left: -10, bottom: 0, width: 68, height: 34, borderRadius: 10, background: '#3a2414'}} />
	</div>
);

const SceneBlock: React.FC<{s: SceneData & {captions: Cap[]}; first: boolean}> = ({s, first}) => {
	const f = useCurrentFrame();
	const tr: string = (s as any).transition ?? D.style?.transition ?? 'ink';
	const p = first ? 1 : interpolate(f, [0, T], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
	let style: React.CSSProperties = {};
	let over: React.ReactNode = null;
	if (p < 1) {
		if (tr === 'fade') style = {opacity: p};
		else if (tr === 'scroll') {
			const X = (1 - p) * 50;
			style = {clipPath: `inset(0 ${X}% 0 ${X}%)`};
			over = (
				<>
					<Rod x={960 - (960 * (100 - 2 * X)) / 100} />
					<Rod x={960 + (960 * (100 - 2 * X)) / 100} />
				</>
			);
		} else if (tr === 'page') style = {transform: `translateX(${(1 - p) * 1920}px)`, boxShadow: '-40px 0 60px rgba(40,25,10,0.45)'};
		else if (tr === 'cut') style = {opacity: p > 0.5 ? 1 : 0};
		else style = {clipPath: wipeClip(p, s.id)};
	}
	const cap = s.captions.find((c) => f >= c.from && f < c.to);
	const CF: number = D.chapterFrames ?? 110;
	const chapP = s.chapter ? interpolate(f, [s.lead, s.lead + 12, s.lead + CF, s.lead + CF + 15], [0, 1, 1, 0], clamp) : 0;
	const card = s.chapter && D.style?.chapterCard !== false;
	const chapStamp = card ? interpolate(f, [s.lead + 54, s.lead + 62], [0, 1], clamp) : 1;
	return (
		<AbsoluteFill>
		<AbsoluteFill style={style}>
			<SceneView s={s} frame={f} />
			{card ? <ChapterCard text={s.chapter as string} f={f} lead={s.lead} seed={s.id} /> : null}
			{s.chapter ? (
				<div
					style={{
						position: 'absolute',
						left: 70,
						top: 56,
						opacity: chapP * chapStamp,
						transform: `translateX(${(1 - chapP) * -40}px) rotate(-2deg)`,
						border: `5px solid ${D.style?.accent ?? '#b3261e'}`,
						borderRadius: 8,
						padding: '8px 22px',
						color: D.style?.accent ?? '#b3261e',
						fontFamily: fonts.body,
						fontWeight: 800,
						fontSize: 36,
						letterSpacing: 4,
						background: 'rgba(243,232,210,0.7)',
					}}
				>
					{s.chapter}
				</div>
			) : null}
			{cap && D.captions !== false ? (
				<div style={{position: 'absolute', left: 0, right: 0, bottom: 44, display: 'flex', justifyContent: 'center'}}>
					<div
						style={{
							maxWidth: 1560,
							padding: '12px 34px 14px',
							background: 'rgba(250,243,226,0.93)',
							border: '3px solid #2b1d12',
							borderRadius: '14px 22px 12px 26px',
							boxShadow: '4px 5px 0 rgba(43,29,18,0.35)',
							fontFamily: fonts.body,
							fontWeight: 700,
							fontSize: D.captionFontSize ?? 46,
							lineHeight: 1.25,
							color: '#2b1d12',
							textAlign: 'center',
						}}
					>
						{cap.text}
					</div>
				</div>
			) : null}
		</AbsoluteFill>
		{over}
		</AbsoluteFill>
	);
};

const SPOTS: React.CSSProperties[] = [
	{top: 40, right: 56, textAlign: 'right'},
	{top: 40, left: 0, right: 0, textAlign: 'center'},
	{top: 190, right: 56, textAlign: 'right'},
	{bottom: 160, right: 56, textAlign: 'right'},
];

const Watermark: React.FC = () => {
	const f = useCurrentFrame();
	const b = D.branding;
	const st = D.style ?? {};
	if (!b?.channel || st.watermark === false) return null;
	const period = Math.round((st.watermarkEverySeconds ?? 7) * (D.fps ?? 30));
	const wo = st.watermarkOpacity ?? 0.55;
	const k = Math.floor(f / period);
	const t = f - k * period;
	const spot = SPOTS[Math.floor(random(`wm-${k}`) * SPOTS.length)];
	const op = interpolate(t, [0, 10, period - 10, period], [0, wo, wo, 0], clamp);
	return (
		<div style={{position: 'absolute', opacity: op, color: st.ink ?? '#2b1d12', fontFamily: fonts.body, ...spot}}>
			<div style={{fontWeight: 800, fontSize: 30, letterSpacing: 1}}>{b.channel}</div>
			{b.sub ? <div style={{fontWeight: 700, fontSize: 18, letterSpacing: 2}}>{b.sub}</div> : null}
		</div>
	);
};

export const MainVideo: React.FC = () => {
	let cursor = 0;
	const blocks: React.ReactNode[] = [];
	const audio: React.ReactNode[] = [];
	D.scenes.forEach((s: any, i: number) => {
		const start = i === 0 ? 0 : cursor - T;
		blocks.push(
			<Sequence key={s.id} from={start} durationInFrames={s.duration} name={`${s.id} ${s.label}`}>
				<SceneBlock s={s} first={i === 0} />
			</Sequence>,
		);
		audio.push(
			<Sequence key={`a-${s.id}`} from={start + s.lead} durationInFrames={s.audioFrames + 5}>
				<Audio src={staticFile(s.audio)} />
			</Sequence>,
		);
		if (i > 0)
			audio.push(
				<Sequence key={`w-${s.id}`} from={start} durationInFrames={30}>
					<Audio src={staticFile(`sfx/swish${i % 3}.wav`)} volume={D.swishVolume ?? 0.35} />
				</Sequence>,
			);
		for (const [t, name, vol] of s.sfx ?? []) {
			const at = start + s.lead + Math.round(t * s.audioFrames);
			audio.push(
				<Sequence key={`s-${s.id}-${t}-${name}`} from={at} durationInFrames={s.duration}>
					<Audio src={staticFile(`sfx/${name}.wav`)} volume={(vol ?? 0.5) * (D.sfxVolume ?? 1)} />
				</Sequence>,
			);
		}
		cursor = start + s.duration;
	});
	return (
		<AbsoluteFill style={{backgroundColor: '#e9dcc0'}}>
			{blocks}
			{audio}
			<Audio src={staticFile('music.m4a')} volume={D.musicVolume ?? 0.12} />
			<Watermark />
		</AbsoluteFill>
	);
};
