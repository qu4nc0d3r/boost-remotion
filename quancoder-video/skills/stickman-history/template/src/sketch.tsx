import React, {createContext, useContext} from 'react';
import {interpolate, Easing} from 'remotion';

import data from './data.json';

// ---------- palette (from config.json → style, via src/data.json) ----------
const ST: any = (data as any).style ?? {};
export const INK: string = ST.ink ?? '#2b1d12';
export const RED: string = ST.accent ?? '#b3261e';
export const HAN: string = ST.enemy ?? '#2f4a6d';
export const GOLD: string = ST.gold ?? '#b8860b';
export const WATER: string = ST.water ?? '#6f9491';
const BOIL: number = ST.lineBoil ?? 3.2;

// ---------- scene context (frame, timing helpers, water level) ----------
export type Ctx = {
	frame: number; // frame inside the scene (0 = scene start incl. lead)
	lead: number; // frames before narration starts
	audioFrames: number;
	fps: number;
	water: ((f: number) => number) | null; // current water surface y
	seed: number;
	fid: string; // scene id used for per-scene SVG filter ids
};
export const SceneCtx = createContext<Ctx>({frame: 0, lead: 0, audioFrames: 300, fps: 30, water: null, seed: 1, fid: 'x'});
export const useScene = () => useContext(SceneCtx);

/** Convert a scene fraction (0..1 of the narration) to a scene frame. */
export const tf = (c: Ctx, t: number | undefined, dflt = 0) => c.lead + (t ?? dflt) * c.audioFrames;

/** Keyframe track: [[t, v1, v2 ...], ...] with t in scene fractions → values at current frame (eased). */
export function track(c: Ctx, keys: number[][] | undefined, frame = c.frame): number[] | null {
	if (!keys || keys.length === 0) return null;
	const fs = keys.map((k) => tf(c, k[0]));
	if (frame <= fs[0]) return keys[0].slice(1);
	if (frame >= fs[fs.length - 1]) return keys[keys.length - 1].slice(1);
	let i = 0;
	while (i < fs.length - 1 && frame > fs[i + 1]) i++;
	const p = Easing.inOut(Easing.quad)((frame - fs[i]) / Math.max(1, fs[i + 1] - fs[i]));
	return keys[i].slice(1).map((v, j) => v + (keys[i + 1][j + 1] - v) * p);
}

/** 0→1 draw-on progress starting at fraction `at`, lasting `dur` frames. */
export const drawOn = (c: Ctx, at: number | undefined, dur = 14) =>
	interpolate(c.frame, [tf(c, at), tf(c, at) + dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});

/** visibility factor for items with at/out */
export function vis(c: Ctx, at?: number, out?: number, dur = 12) {
	const a = drawOn(c, at, dur);
	if (out === undefined) return a;
	const o = interpolate(c.frame, [tf(c, out), tf(c, out) + dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return Math.min(a, o);
}

// ---------- deterministic noise ----------
export function rand(seed: number) {
	const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
}

/** hand-drawn polyline: small perpendicular jitter so straight lines look sketched */
export function sketchLine(pts: [number, number][], seed = 1, amp = 1.6): string {
	if (pts.length < 2) return '';
	let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
	for (let i = 1; i < pts.length; i++) {
		const [x0, y0] = pts[i - 1];
		const [x1, y1] = pts[i];
		const mx = (x0 + x1) / 2 + (rand(seed + i) - 0.5) * amp * 2;
		const my = (y0 + y1) / 2 + (rand(seed + i * 7) - 0.5) * amp * 2;
		d += ` Q${mx.toFixed(1)} ${my.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
	}
	return d;
}

/** A path that draws itself on (pathLength trick). */
export const DrawPath: React.FC<{d: string; p: number; stroke?: string; w?: number; fill?: string; fillOpacity?: number; dash?: string; opacity?: number}> = ({d, p, stroke = INK, w = 4, fill = 'none', fillOpacity = 1, dash, opacity = 1}) => {
	if (p <= 0) return null;
	return (
		<g opacity={opacity}>
			{fill !== 'none' ? <path d={d} fill={fill} fillOpacity={fillOpacity * Math.min(1, p * 1.5)} stroke="none" /> : null}
			<path
				d={d}
				fill="none"
				stroke={stroke}
				strokeWidth={w}
				strokeLinecap="round"
				strokeLinejoin="round"
				pathLength={1}
				strokeDasharray={dash ? undefined : '1 1'}
				strokeDashoffset={dash ? undefined : 1 - p}
				style={dash ? {strokeDasharray: dash} : undefined}
			/>
		</g>
	);
};

/** SVG filters: line boil (hand-drawn wobble that changes every 4 frames) and watercolor edge.
 * Speed: sRGB skips Chrome's per-pixel linearRGB round trip (these filters only move pixels or blur single-colour shapes,
 * so the look is unchanged); the boil noise is one seamless 200 px tile repeated with feTile instead of full-frame turbulence. */
export const SketchDefs: React.FC<{id: string; frame: number}> = ({id, frame}) => {
	const seed = Math.floor(frame / 4) % 7;
	return (
		<defs>
			{/* fixed screen-space region (the boil group is untransformed) so the tile at 0,0 always lies inside it */}
			<filter id={`boil-${id}`} filterUnits="userSpaceOnUse" x={-40} y={-40} width={2000} height={1160} colorInterpolationFilters="sRGB">
				<feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves={2} seed={seed} stitchTiles="stitch" x={0} y={0} width={200} height={200} result="t" />
				<feTile in="t" result="n" />
				<feDisplacementMap in="SourceGraphic" in2="n" scale={BOIL} xChannelSelector="R" yChannelSelector="G" />
			</filter>
			<linearGradient id="hillshade" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor="#ffffff" stopOpacity={0.35} />
				<stop offset="1" stopColor="#2b1d12" stopOpacity={0.3} />
			</linearGradient>
			<radialGradient id="fireglow">
				<stop offset="0" stopColor="#ffb347" stopOpacity={0.55} />
				<stop offset="0.5" stopColor="#ff8a2a" stopOpacity={0.18} />
				<stop offset="1" stopColor="#ff8a2a" stopOpacity={0} />
			</radialGradient>
			<filter id={`soft-${id}`} x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
				<feGaussianBlur stdDeviation={18} />
			</filter>
			<filter id={`wash-${id}`} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
				<feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={3} seed={3} result="n" />
				<feDisplacementMap in="SourceGraphic" in2="n" scale={14} xChannelSelector="R" yChannelSelector="G" />
			</filter>
		</defs>
	);
};
