import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, staticFile, useVideoConfig} from 'remotion';
import type {TransitionPresentation, TransitionPresentationComponentProps} from '@remotion/transitions';
import {edgeNoise, toClip} from './paper';

type Props = {
	seed: string;
	/** 'h' = tear runs left→right, halves fly up/down. 'v' = tear runs top→bottom, halves fly left/right. */
	axis: 'h' | 'v';
	/** where the tear crosses (0..1) and its tilt in px across the frame */
	at?: number;
	tilt?: number;
};

const PAD = 60;

const TearComp: React.FC<TransitionPresentationComponentProps<Props>> = ({
	children,
	presentationDirection,
	presentationProgress: p,
	passedProps,
}) => {
	const {width: W, height: H} = useVideoConfig();
	const {seed, axis, at = 0.5, tilt = 160} = passedProps;

	const geo = useMemo(() => {
		// work in (u along the tear, v across it)
		const U = axis === 'h' ? W : H;
		const V = axis === 'h' ? H : W;
		const n = Math.round((U + PAD * 2) / 9);
		const big = edgeNoise(seed + 'tear', n, 26);
		const fib = edgeNoise(seed + 'rim', n, 9);
		const fib2 = edgeNoise(seed + 'rim2', n, 6);
		const line: [number, number][] = [];
		const rimA: [number, number][] = [];
		const rimB: [number, number][] = [];
		for (let i = 0; i <= n; i++) {
			const u = -PAD + (i / n) * (U + PAD * 2);
			const v = V * at + tilt * (u / U - 0.5) + big[i];
			line.push([u, v]);
			rimA.push([u, v + 10 + Math.abs(fib[i]) * 1.4]);
			rimB.push([u, v - 4 - Math.abs(fib2[i])]);
		}
		const map = (pts: [number, number][]) => (axis === 'h' ? pts : pts.map(([u, v]) => [v, u] as [number, number]));
		const rev = <T,>(a: T[]) => [...a].reverse();
		const startCap: [number, number][] = [[-PAD, -PAD], [U + PAD, -PAD]];
		const endCap: [number, number][] = [[U + PAD, V + PAD], [-PAD, V + PAD]];
		return {
			a: toClip(map([...startCap, ...rev(line)])),
			aRim: toClip(map([...startCap, ...rev(rimA)])),
			b: toClip(map([...line, ...endCap])),
			bRim: toClip(map([...rimB, ...endCap])),
		};
	}, [W, H, seed, axis, at, tilt]);

	// Outside the active tear, render the scene untouched.
	if (p <= 0 || p >= 1) {
		return <AbsoluteFill>{children}</AbsoluteFill>;
	}

	if (presentationDirection === 'entering') {
		return (
			<AbsoluteFill
				style={{
					scale: interpolate(p, [0, 1], [1.08, 1], {easing: Easing.out(Easing.cubic)}),
					filter: `brightness(${interpolate(p, [0, 0.8], [0.55, 1], {extrapolateRight: 'clamp'})})`,
				}}
			>
				{children}
			</AbsoluteFill>
		);
	}

	// strain phase then accelerating separation
	const strain = interpolate(p, [0, 0.18], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)});
	const fly = interpolate(p, [0.14, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
	const gap = strain * 10 + fly * (axis === 'h' ? H : W) * 0.85;
	const rotA = -(strain * 0.6 + fly * 11);
	const rotB = strain * 0.5 + fly * 9;
	const tA = axis === 'h' ? `${-fly * 90}px ${-gap}px` : `${-gap}px ${fly * 70}px`;
	const tB = axis === 'h' ? `${fly * 70}px ${gap}px` : `${gap}px ${-fly * 60}px`;
	const paper = `url(${staticFile('paper-white.jpg')})`;

	const piece = ({
		clip,
		rim,
		translate,
		rotate,
		origin,
	}: {clip: string; rim: string; translate: string; rotate: number; origin: string}) => (
		<AbsoluteFill
			style={{
				translate,
				rotate: `${rotate}deg`,
				transformOrigin: origin,
				filter: `drop-shadow(0 ${10 + fly * 30}px ${18 + fly * 30}px rgba(0,0,0,${0.35 + strain * 0.2}))`,
			}}
		>
			<AbsoluteFill style={{clipPath: rim, backgroundImage: paper, backgroundSize: 'cover'}} />
			<AbsoluteFill style={{clipPath: clip}}>{children}</AbsoluteFill>
		</AbsoluteFill>
	);

	return (
		<AbsoluteFill style={{zIndex: 5}}>
			{piece({clip: geo.a, rim: geo.aRim, translate: tA, rotate: rotA, origin: axis === 'h' ? '100% 0%' : '0% 100%'})}
			{piece({clip: geo.b, rim: geo.bRim, translate: tB, rotate: rotB, origin: axis === 'h' ? '0% 100%' : '100% 0%'})}
		</AbsoluteFill>
	);
};

export const paperTear = (props: Props): TransitionPresentation<Props> => ({
	component: TearComp,
	props,
});
