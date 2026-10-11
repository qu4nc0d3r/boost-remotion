import React from 'react';
import {AbsoluteFill, Easing, Img, Loop, OffthreadVideo, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Safe, TornPaper} from './paper';
import {fonts} from './fonts';
import {EndCard, NoteSignature, brand} from './Brand';
import data from './data.json';

export type SceneData = (typeof data.scenes)[number];

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ACCENT = data.accentColor || '#b3261e';

type Media = {src: string; video: boolean; frames: number | null};

const KenBurns: React.FC<{media: Media; seed: string; dur: number; dim?: number}> = ({media, seed, dur, dim = 0}) => {
	const frame = useCurrentFrame();
	const dir = random(seed + 'dir') > 0.5 ? 1 : -1;
	const zoomIn = random(seed + 'zoom') > 0.35;
	if (media.video) {
		// user-supplied clip (muted): gentle push-in only, loops if shorter than the scene
		const style: React.CSSProperties = {
			width: '100%',
			height: '100%',
			objectFit: 'cover',
			scale: interpolate(frame, [0, dur], [1.04, 1.12], clamp),
			filter: `saturate(0.95) contrast(1.04) brightness(${1 - dim})`,
		};
		const clip = <OffthreadVideo src={staticFile(media.src)} muted style={style} />;
		return (
			<AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#1d1a16'}}>
				{media.frames && media.frames < dur ? <Loop durationInFrames={media.frames}>{clip}</Loop> : clip}
			</AbsoluteFill>
		);
	}
	return (
		<AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#1d1a16'}}>
			<Img
				src={staticFile(media.src)}
				style={{
					width: '100%',
					height: '100%',
					objectFit: 'cover',
					scale: interpolate(frame, [0, dur], zoomIn ? [1.08, 1.22] : [1.22, 1.08], clamp),
					translate: interpolate(frame, [0, dur], [`${-30 * dir}px 0px`, `${30 * dir}px -20px`], clamp),
					filter: `saturate(0.92) contrast(1.05) brightness(${1 - dim})`,
				}}
			/>
		</AbsoluteFill>
	);
};

const Label: React.FC<{scene: SceneData}> = ({scene}) => {
	const frame = useCurrentFrame();
	const t = frame - scene.lead - 4;
	const w = Math.min(900, Math.max(400, 170 + scene.label.length * 44));
	return (
		<TornPaper
			width={w}
			height={210}
			seed={scene.id + 'label'}
			paper="cream"
			rough={[10, 16, 12, 4]}
			rim={0}
			style={{
				left: 40,
				top: 150,
				translate: interpolate(t, [0, 16], [`${-w - 40}px 0px`, '0px 0px'], {...clamp, easing: Easing.out(Easing.back(1.4))}),
				rotate: `${-2 + random(scene.id + 'lr') * 2}deg`,
			}}
		>
			<div style={{position: 'absolute', left: 70, top: 30, fontFamily: fonts.body, fontWeight: 700, fontSize: 30, letterSpacing: 6, color: ACCENT}}>
				{data.chapterWord} {String(scene.index).padStart(2, '0')}
			</div>
			<div style={{position: 'absolute', left: 66, top: 70, fontFamily: fonts.hand, fontSize: 88, lineHeight: 1.1, color: '#1b1712', whiteSpace: 'nowrap'}}>
				{scene.label}
			</div>
		</TornPaper>
	);
};

const TitleCard: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const tc = data.titleCard;
	const out = interpolate(frame, [5.6 * fps, 6.4 * fps], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const longest = Math.max(...tc.lines.map((l) => l.length), 1);
	const lineSize = Math.min(104, Math.floor(860 / (longest * 0.66)));
	const accentSize = Math.min(176, Math.floor(860 / (Math.max(tc.accent.length, 1) * 0.72)));
	return (
		<TornPaper
			width={960}
			height={720}
			seed="titlecard"
			rough={[22, 10, 22, 10]}
			rim={0}
			shadow={1.3}
			style={{
				left: 60,
				top: 330,
				rotate: `${-2.5 - out * 12}deg`,
				translate: `${-out * 220}px ${interpolate(frame, [0, 14], [900, 0], {...clamp, easing: Easing.out(Easing.back(1.2))}) - out * 1700}px`,
			}}
		>
			<div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 40px'}}>
				<div style={{fontFamily: fonts.body, fontWeight: 700, fontSize: 44, letterSpacing: 10, color: '#3a332a'}}>{tc.kicker}</div>
				<div style={{fontFamily: fonts.display, fontWeight: 900, fontSize: lineSize, lineHeight: 1.05, color: '#15120e', marginTop: 16}}>
					{tc.lines.map((l) => (
						<div key={l}>{l}</div>
					))}
				</div>
				<div style={{fontFamily: fonts.display, fontWeight: 900, fontSize: accentSize, lineHeight: 1, color: ACCENT, marginTop: 6, whiteSpace: 'nowrap'}}>{tc.accent}</div>
				{brand?.channel ? (
					<div style={{fontFamily: fonts.hand, fontSize: 40, color: '#5a5045', marginTop: 18}}>— {brand.channel} —</div>
				) : null}
			</div>
		</TornPaper>
	);
};

const Cutout: React.FC<{scene: SceneData; media: Media; from: number; dur: number}> = ({scene, media, from, dur}) => {
	const frame = useCurrentFrame();
	const t = frame - from;
	if (t < 0) return null;
	const side = random(scene.id + 'side') > 0.5 ? 1 : -1;
	const rot = (random(scene.id + 'crot') * 3 + 1.5) * -side;
	return (
		<TornPaper
			width={960}
			height={720}
			seed={scene.id + 'cut'}
			rough={[18, 12, 18, 12]}
			rim={14}
			shadow={1.2}
			style={{
				left: 60,
				top: 470,
				rotate: `${interpolate(t, [0, 18], [rot + side * 8, rot], {...clamp, easing: Easing.out(Easing.back(1.6))})}deg`,
				translate: interpolate(t, [0, 18], [`${side * 1150}px 60px`, '0px 0px'], {...clamp, easing: Easing.out(Easing.cubic)}),
			}}
		>
			<KenBurns media={media} seed={scene.id + 'b'} dur={dur} />
		</TornPaper>
	);
};

const Caption: React.FC<{scene: SceneData}> = ({scene}) => {
	const frame = useCurrentFrame();
	const i = scene.captions.findIndex((c) => frame >= c.from && frame < c.to);
	if (i < 0) return null;
	const c = scene.captions[i];
	const t = frame - c.from;
	const lines = Math.ceil(c.text.length / 23);
	const h = lines * 84 + 70;
	const rot = (random(scene.id + i + 'cr') - 0.5) * 3;
	return (
		<TornPaper
			width={880}
			height={h}
			seed={`${scene.id}-cap-${i}`}
			rough={[9, 5, 9, 5]}
			rim={0}
			style={{
				left: 100,
				top: 1470 - h / 2,
				rotate: `${rot}deg`,
				scale: interpolate(t, [0, 6], [0.9, 1], {...clamp, easing: Easing.out(Easing.back(2))}),
				opacity: interpolate(t, [0, 3], [0, 1], clamp),
			}}
		>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					textAlign: 'center',
					padding: '0 50px',
					fontFamily: fonts.body,
					fontWeight: 800,
					fontSize: 62,
					lineHeight: 1.3,
					color: '#16130f',
				}}
			>
				{c.text}
			</div>
			<NoteSignature />
		</TornPaper>
	);
};

export const Scene: React.FC<{scene: SceneData}> = ({scene}) => {
	if (scene.kind === 'outro') {
		return (
			<AbsoluteFill>
				<EndCard lead={scene.lead} />
				<Safe>
					<Caption scene={scene} />
				</Safe>
			</AbsoluteFill>
		);
	}
	const [a, b] = scene.images;
	const cutAt = scene.lead + Math.round(scene.audioFrames * 0.48);
	return (
		<AbsoluteFill style={{backgroundImage: `url(${staticFile('paper.jpg')})`, backgroundSize: 'cover'}}>
			{a ? <KenBurns media={a} seed={scene.id + 'a'} dur={scene.duration} dim={0.08} /> : null}
			<AbsoluteFill
				style={{
					background:
						'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.55) 100%)',
				}}
			/>
			<Safe>
				{b ? <Cutout scene={scene} media={b} from={cutAt} dur={scene.duration - cutAt} /> : null}
				{scene.index === 1 ? <TitleCard /> : <Label scene={scene} />}
				<Caption scene={scene} />
			</Safe>
		</AbsoluteFill>
	);
};
