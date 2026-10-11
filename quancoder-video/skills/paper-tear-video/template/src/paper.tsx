import React from 'react';
import {AbsoluteFill, Img, random, staticFile} from 'remotion';
import data from './data.json';

/** Jagged offsets along an edge: mix of low-frequency wobble + fine fibre jitter. */
export const edgeNoise = (seed: string, count: number, amp: number) => {
	const out: number[] = [];
	const p1 = random(seed + 'p1') * Math.PI * 2;
	const p2 = random(seed + 'p2') * Math.PI * 2;
	for (let i = 0; i <= count; i++) {
		const u = i / count;
		const low = Math.sin(u * Math.PI * 2.3 + p1) * 0.45 + Math.sin(u * Math.PI * 5.1 + p2) * 0.25;
		const hi = (random(`${seed}-${i}`) - 0.5) * 0.9;
		const spike = random(`${seed}-s${i}`) > 0.93 ? (random(`${seed}-v${i}`) - 0.5) * 1.6 : 0;
		out.push((low + hi + spike) * amp);
	}
	return out;
};

/**
 * Polygon (in px) of a rectangle w×h whose edges are torn.
 * `rough` = [top, right, bottom, left] amplitude in px. `inset` shrinks it.
 */
export const tornRectPoints = (
	w: number,
	h: number,
	seed: string,
	rough: [number, number, number, number],
	inset = 0,
	step = 11,
) => {
	const pts: [number, number][] = [];
	const [rt, rr, rb, rl] = rough;
	const nx = Math.max(2, Math.round(w / step));
	const ny = Math.max(2, Math.round(h / step));
	const top = edgeNoise(seed + 't', nx, rt);
	const right = edgeNoise(seed + 'r', ny, rr);
	const bottom = edgeNoise(seed + 'b', nx, rb);
	const left = edgeNoise(seed + 'l', ny, rl);
	const m = (a: number) => Math.abs(a) + inset;
	for (let i = 0; i <= nx; i++) pts.push([(i / nx) * w, m(rt) * 0.6 + top[i]]);
	for (let i = 0; i <= ny; i++) pts.push([w - m(rr) * 0.6 - right[i], (i / ny) * h]);
	for (let i = nx; i >= 0; i--) pts.push([(i / nx) * w, h - m(rb) * 0.6 - bottom[i]]);
	for (let i = ny; i >= 0; i--) pts.push([m(rl) * 0.6 + left[i], (i / ny) * h]);
	return pts;
};

export const toClip = (pts: [number, number][]) =>
	`polygon(${pts.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(',')})`;

/** Fine paper grain over everything. */
export const Grain: React.FC<{opacity?: number}> = ({opacity = 0.18}) => (
	<AbsoluteFill style={{pointerEvents: 'none'}}>
		<Img
			src={staticFile('grain.png')}
			style={{width: '100%', height: '100%', mixBlendMode: 'overlay', opacity}}
		/>
	</AbsoluteFill>
);

/**
 * A piece of torn paper. The paper (with fibrous white rim) is slightly larger
 * than the content, so every edge shows the ragged white tear line.
 */
export const TornPaper: React.FC<{
	width: number;
	height: number;
	seed: string;
	rough?: [number, number, number, number];
	rim?: number;
	paper?: 'white' | 'cream';
	shadow?: number;
	style?: React.CSSProperties;
	children?: React.ReactNode;
}> = ({width, height, seed, rough = [14, 6, 14, 6], rim = 12, paper = 'white', shadow = 1, style, children}) => {
	const outer = toClip(tornRectPoints(width, height, seed, rough));
	const inner = toClip(
		tornRectPoints(width - rim * 2, height - rim * 2, seed + 'in', [rough[0] * 0.8, rough[1], rough[2] * 0.8, rough[3]], 0, 9),
	);
	return (
		<div
			style={{
				position: 'absolute',
				width,
				height,
				filter: `drop-shadow(0 ${14 * shadow}px ${22 * shadow}px rgba(0,0,0,${0.45 * shadow})) drop-shadow(0 2px 3px rgba(0,0,0,0.3))`,
				...style,
			}}
		>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					clipPath: outer,
					backgroundImage: `url(${staticFile(paper === 'white' ? 'paper-white.jpg' : 'paper.jpg')})`,
					backgroundSize: 'cover',
				}}
			/>
			<div style={{position: 'absolute', left: rim, top: rim, width: width - rim * 2, height: height - rim * 2, clipPath: inner, overflow: 'hidden'}}>
				{children}
			</div>
		</div>
	);
};

/**
 * Platform-safe area: shrinks all foreground layers (labels, cutouts, captions, cards, watermark)
 * toward a point slightly above centre, so nothing sits under TikTok/Reels/Shorts UI or gets
 * clipped by phones that crop 9:16 to fill taller screens. Backgrounds stay full-bleed.
 * Tuned by script.json "safeArea": {"scale": 0.86, "offsetX": -24, "offsetY": -30}.
 */
export const Safe: React.FC<{children?: React.ReactNode}> = ({children}) => {
	const sa = (data as {safeArea?: {scale: number; offsetX?: number; offsetY: number}}).safeArea ?? {scale: 0.86, offsetX: -24, offsetY: -30};
	return (
		<AbsoluteFill style={{scale: String(sa.scale), translate: `${sa.offsetX ?? 0}px ${sa.offsetY}px`, transformOrigin: '50% 42%'}}>
			{children}
		</AbsoluteFill>
	);
};
