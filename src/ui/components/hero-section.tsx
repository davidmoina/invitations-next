"use client";
import { useEffect, useState } from "react";
import type { PublicEventPageData } from "#/server/contracts/public";

export type HeroSectionProps = {
	event: PublicEventPageData["event"];
	guest: PublicEventPageData["guest"];
	coverMediaUrl?: string | null;
};

type TimeLeft = {
	days: number;
	hours: number;
	minutes: number;
};

function calculateTimeLeft(targetDate: string): TimeLeft | null {
	const difference = +new Date(targetDate) - Date.now();
	if (difference <= 0) return null;

	return {
		days: Math.floor(difference / (1000 * 60 * 60 * 24)),
		hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
		minutes: Math.floor((difference / 1000 / 60) % 60),
	};
}

function formatDate(isoString: string, timezone: string): string {
	try {
		return new Intl.DateTimeFormat("es-ES", {
			dateStyle: "full",
			timeZone: timezone || "UTC",
		}).format(new Date(isoString));
	} catch {
		return new Date(isoString).toLocaleDateString("es-ES", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	}
}

export function HeroSection({ event, guest, coverMediaUrl }: HeroSectionProps) {
	const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() =>
		calculateTimeLeft(event.startsAt),
	);

	useEffect(() => {
		const timer = setInterval(() => {
			setTimeLeft(calculateTimeLeft(event.startsAt));
		}, 60000);
		return () => clearInterval(timer);
	}, [event.startsAt]);

	const formattedDate = formatDate(event.startsAt, event.timezone);

	return (
		<section className="relative min-h-[580px] w-full flex flex-col justify-between overflow-hidden bg-stone-900 text-white rounded-b-3xl shadow-lg">
			{/* Background Image / Backdrop */}
			{coverMediaUrl ? (
				<div
					className="absolute inset-0 bg-cover bg-center"
					style={{ backgroundImage: `url(${coverMediaUrl})` }}
				/>
			) : (
				<div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-champagne-700/40" />
			)}

			{/* Soft Warm Gradient Overlay */}
			<div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-900/40 to-stone-900/60" />

			{/* Top Header info */}
			<div className="relative z-10 pt-10 px-6 text-center">
				<p className="text-xs uppercase tracking-[0.25em] text-champagne-100 font-medium opacity-90">
					{guest
						? `Invitación para ${guest.displayName}`
						: "Estás cordialmente invitado"}
				</p>
			</div>

			{/* Main Hero Center / Bottom */}
			<div className="relative z-10 pb-12 px-6 flex flex-col items-center text-center max-w-lg mx-auto">
				<h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight mb-3 text-white drop-shadow-md">
					{event.title}
				</h1>
				{event.honoreeNames && event.honoreeNames.length > 0 && (
					<p className="text-champagne-200 font-serif text-lg sm:text-xl font-medium tracking-wide mb-3 drop-shadow-sm">
						{event.honoreeNames.join(" & ")}
					</p>
				)}
				<p className="text-champagne-100 font-serif italic text-lg sm:text-xl capitalize mb-8 drop-shadow-sm">
					{formattedDate}
				</p>

				{/* Countdown timer badge */}
				{timeLeft && (
					<div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex gap-6 text-white w-full max-w-xs justify-center shadow-md">
						<div className="flex flex-col items-center">
							<span className="font-serif text-2xl font-bold">
								{timeLeft.days}
							</span>
							<span className="text-[10px] uppercase tracking-wider opacity-80">
								Días
							</span>
						</div>
						<div className="w-px bg-white/20" />
						<div className="flex flex-col items-center">
							<span className="font-serif text-2xl font-bold">
								{timeLeft.hours}
							</span>
							<span className="text-[10px] uppercase tracking-wider opacity-80">
								Horas
							</span>
						</div>
						<div className="w-px bg-white/20" />
						<div className="flex flex-col items-center">
							<span className="font-serif text-2xl font-bold">
								{timeLeft.minutes}
							</span>
							<span className="text-[10px] uppercase tracking-wider opacity-80">
								Min
							</span>
						</div>
					</div>
				)}
			</div>
		</section>
	);
}
