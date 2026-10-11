import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile} from 'remotion';
import {SceneCtx, SketchDefs, track, tf, Ctx} from './sketch';
import * as Pr from './props';
import {Sky, Fog, Smoke, Rain, MapPanel} from './props2';
import data from './data.json';

export type SceneData = {
	id: string;
	index: number;
	label: string;
	chapter?: string;
	lead: number;
	audioFrames: number;
	duration: number;
	night?: boolean;
	tint?: string;
	camera?: {zoom?: number[][]; focus?: [number, number]; pan?: number[][]; keys?: number[][]; static?: boolean};
	sky?: string;
	skyStrength?: number;
	transition?: string;
	shake?: [number, number][];
	items: Pr.Item[];
};

const renderItem = (it: Pr.Item, k: number, id: string, water: ((f: number) => number) | null) => {
	switch (it.type) {
		case 'water':
			return <Pr.Water key={k} it={it} id={id} />;
		case 'fog':
			return <Fog key={k} it={it} />;
		case 'smoke':
			return <Smoke key={k} it={it} />;
		case 'rain':
			return <Rain key={k} it={it} />;
		case 'map':
			return <MapPanel key={k} it={it} />;
		case 'bank':
			return <Pr.Bank key={k} it={it} />;
		case 'bed':
			return <Pr.Bed key={k} it={it} />;
		case 'stakes':
			return <Pr.Stakes key={k} it={it} />;
		case 'boat':
			return <Pr.Boat key={k} it={it} water={it.float === false ? null : water} />;
		case 'hills':
			return <Pr.Hills key={k} it={it} />;
		case 'ground':
			return <Pr.Ground key={k} it={it} />;
		case 'reeds':
			return <Pr.Reeds key={k} it={it} />;
		case 'tree':
			return <Pr.Tree key={k} it={it} />;
		case 'palace':
			return <Pr.Palace key={k} it={it} />;
		case 'tent':
			return <Pr.Tent key={k} it={it} />;
		case 'throne':
			return <Pr.Throne key={k} it={it} />;
		case 'house':
			return <Pr.House key={k} it={it} />;
		case 'sun':
			return <Pr.Sun key={k} it={it} />;
		case 'moon':
			return <Pr.Sun key={k} it={{...it, moon: true}} />;
		case 'cloud':
			return <Pr.Cloud key={k} it={it} />;
		case 'fire':
			return <Pr.Fire key={k} it={it} />;
		case 'arrow':
			return <Pr.Arrow key={k} it={it} />;
		case 'text':
			return <Pr.Label key={k} it={it} />;
		case 'bubble':
			return <Pr.Bubble key={k} it={it} />;
		case 'timeline':
			return <Pr.Timeline key={k} it={it} />;
		case 'volley':
			return <Pr.Volley key={k} it={it} />;
		case 'splash':
			return <Pr.Splash key={k} it={it} />;
		case 'stick':
			return <Pr.Stick key={k} it={it} />;
		case 'crowd':
			return <Pr.Crowd key={k} it={it} />;
		default:
			return null;
	}
};

const DEPTH: Record<string, number> = {sun: 0.04, moon: 0.04, cloud: 0.15, hills: 0.35, fog: 0.6, text: 0, timeline: 0, map: 0, rain: 0};

export const SceneView: React.FC<{s: SceneData; frame: number}> = ({s, frame}) => {
	const id = `${s.id}`;
	const base: Ctx = {frame, lead: s.lead, audioFrames: s.audioFrames, fps: 30, water: null, seed: s.index, fid: id};
	const wItem = s.items.find((i) => i.type === 'water');
	const water = wItem ? (f: number) => Pr.waterLevel(wItem)(base, f) : null;
	const ctx: Ctx = {...base, water};
	const cam: any = s.camera ?? {};
	const hasMap = s.items.some((i) => i.type === 'map');
	// camera: "keys" [[t, zoom, cx, cy]] centre the view on (cx, cy); legacy zoom/focus/pan zoom about a fixed point.
	// With no camera at all every scene gets a slow drift so the parallax layers breathe.
	const keys: number[][] | null = cam.keys ?? (cam.zoom || cam.pan || hasMap || cam.static ? null : [[0, 1.0, 945, 540], [1, 1.05, 975, 540]]);
	const kv = keys ? track(ctx, keys) ?? [1, 960, 540] : null;
	const z = kv ? kv[0] : (track(ctx, cam.zoom) ?? [1])[0];
	const pan = track(ctx, cam.pan) ?? [0, 0];
	const [fx, fy] = cam.focus ?? [960, 540];
	let shx = 0, shy = 0;
	for (const [t, dur] of s.shake ?? []) {
		const st = tf(ctx, t);
		if (frame >= st && frame < st + dur) {
			const a = interpolate(frame, [st, st + dur], [14, 0]);
			shx += Math.sin(frame * 2.1) * a;
			shy += Math.cos(frame * 2.7) * a;
		}
	}
	const camT = (d: number) => {
		if (d <= 0) return '';
		const zd = 1 + (z - 1) * d;
		if (kv) {
			const cx = 960 + (kv[1] - 960) * d, cy = 540 + (kv[2] - 540) * d;
			return `translate(${960 + shx * d} ${540 + shy * d}) scale(${zd}) translate(${-cx} ${-cy})`;
		}
		return `translate(${fx + pan[0] * d + shx * d} ${fy + pan[1] * d + shy * d}) scale(${zd}) translate(${-fx} ${-fy})`;
	};
	const sky = s.sky ?? (s.night ? 'night' : hasMap ? null : (data as any).style?.defaultSky ?? 'day');
	const skyStrength = s.skyStrength ?? (data as any).style?.skyStrength ?? 0.6;
	return (
		<SceneCtx.Provider value={ctx}>
			<AbsoluteFill style={{backgroundColor: '#e9dcc0'}}>
				<Img src={staticFile('paper-h.jpg')} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover'}} />
				<svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute', inset: 0}}>
					<SketchDefs id={id} frame={frame} />
					{sky ? (
						<g transform={camT(0.03)}>
							<Sky kind={sky} id={id} strength={skyStrength} />
						</g>
					) : null}
					<g filter={`url(#boil-${id})`}>
						{s.items.map((it, k) => {
							const d = it.depth ?? DEPTH[it.type] ?? 1;
							return (
								<g key={k} transform={camT(d)}>
									{renderItem(it, k, id, water)}
								</g>
							);
						})}
					</g>
				</svg>
				{/* paper grain shows through the colour washes */}
				<Img src={staticFile('paper-h.jpg')} style={{position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', mixBlendMode: 'multiply', opacity: (data as any).style?.paperOverlay ?? 0.45}} />
				{s.night ? <AbsoluteFill style={{backgroundColor: '#1c2638', mixBlendMode: 'multiply', opacity: 0.42}} /> : null}
				{s.tint ? <AbsoluteFill style={{backgroundColor: s.tint, mixBlendMode: 'multiply', opacity: 0.35}} /> : null}
				<AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(60,35,15,0.38) 100%)'}} />
			</AbsoluteFill>
		</SceneCtx.Provider>
	);
};
