import React from 'react';
import {AbsoluteFill, Easing, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Safe, TornPaper} from './paper';
import {fonts} from './fonts';
import data from './data.json';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const brand = data.branding;

/**
 * Anti-reupload watermark: channel name that hops between safe spots every few
 * seconds, so it can't be removed with one static crop or blur box.
 * Spots avoid the chapter label (top-left), the caption band and TikTok's right-side buttons.
 */
const SPOTS: React.CSSProperties[] = [
	{top: 64, right: 48, alignItems: 'flex-end'},
	{top: 1232, left: 0, right: 0, alignItems: 'center'},
	{top: 1560, left: 56, alignItems: 'flex-start'},
	{top: 400, left: 56, alignItems: 'flex-start'},
];

export const Watermark: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	if (!brand?.channel) return null;
	// hide on the end card (it already shows the channel in full)
	const outroStart = data.scenes.reduce((acc, s, i) => (s.kind === 'outro' ? acc : acc + s.duration - data.tear), 0);
	const hasOutro = data.scenes.some((s) => s.kind === 'outro');
	if (hasOutro && frame >= outroStart + data.tear) return null;
	const period = Math.round(7 * fps);
	const k = Math.floor(frame / period);
	const t = frame - k * period;
	// deterministic but irregular order
	const spot = SPOTS[Math.floor(random(`wm-${k}`) * SPOTS.length)];
	const opacity = interpolate(t, [0, 10, period - 10, period], [0, 0.62, 0.62, 0], clamp);
	return (
		<Safe>
			<div
				style={{
					position: 'absolute',
					display: 'flex',
					flexDirection: 'column',
					opacity,
					color: 'white',
					textShadow: '0 2px 6px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)',
					...spot,
				}}
			>
				<div style={{fontFamily: fonts.body, fontWeight: 800, fontSize: 38, letterSpacing: 1}}>{brand.channel}</div>
				{brand.sub ? <div style={{fontFamily: fonts.body, fontWeight: 700, fontSize: 22, letterSpacing: 2, marginTop: 2}}>{brand.sub}</div> : null}
			</div>
		</Safe>
	);
};

/** Tiny signature printed on every caption note (cropping it out removes the subtitles too). */
export const NoteSignature: React.FC = () =>
	brand?.channel ? (
		<div
			style={{
				position: 'absolute',
				right: 26,
				bottom: 8,
				fontFamily: fonts.body,
				fontWeight: 700,
				fontSize: 19,
				letterSpacing: 1,
				color: 'rgba(60,50,40,0.55)',
			}}
		>
			{brand.channel}
		</div>
	) : null;

/** Closing card: channel + fanpage on torn paper. */
export const EndCard: React.FC<{lead: number}> = ({lead}) => {
	const frame = useCurrentFrame() - lead;
	const accent = data.accentColor || '#b3261e';
	return (
		<AbsoluteFill style={{backgroundImage: `url(${staticFile('paper.jpg')})`, backgroundSize: 'cover'}}>
			<Safe>
			<TornPaper
				width={940}
				height={640}
				seed="endcard"
				rough={[22, 10, 22, 10]}
				rim={0}
				shadow={1.3}
				style={{
					left: 70,
					top: 380,
					rotate: '-2deg',
					translate: interpolate(frame, [0, 16], ['0px -1200px', '0px 0px'], {...clamp, easing: Easing.out(Easing.back(1.3))}),
				}}
			>
				<div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 40px'}}>
					<div style={{fontFamily: fonts.body, fontWeight: 700, fontSize: 40, letterSpacing: 8, color: '#3a332a'}}>{brand.endKicker || 'CẢM ƠN BẠN ĐÃ XEM'}</div>
					<div style={{fontFamily: fonts.display, fontWeight: 900, fontSize: Math.min(130, Math.floor(860 / (brand.channel.length * 0.5))), lineHeight: 1.05, color: accent, marginTop: 24}}>
						{brand.channel}
					</div>
					{brand.tiktok ? (
						<div style={{fontFamily: fonts.body, fontWeight: 800, fontSize: 50, color: '#15120e', marginTop: 30}}>TikTok: {brand.tiktok}</div>
					) : null}
				</div>
			</TornPaper>
			{brand.fanpage ? (
				<TornPaper
					width={760}
					height={170}
					seed="endcard-fb"
					paper="cream"
					rough={[10, 14, 12, 14]}
					rim={0}
					style={{
						left: 170,
						top: 1060,
						rotate: '2.5deg',
						translate: interpolate(frame, [12, 28], ['1200px 0px', '0px 0px'], {...clamp, easing: Easing.out(Easing.back(1.4))}),
					}}
				>
					<div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.hand, fontSize: 68, color: '#1b1712'}}>
						Fanpage: {brand.fanpage}
					</div>
				</TornPaper>
			) : null}
			</Safe>
		</AbsoluteFill>
	);
};
