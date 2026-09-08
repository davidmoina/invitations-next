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
		<header
			data-purpose="hero-header"
			className="relative rounded-3xl overflow-hidden shadow-2xl bg-slate-950 border border-slate-700/40 min-h-[520px] sm:min-h-[580px] w-full flex flex-col justify-between text-white"
		>
			{/* Background Image with Atmosphere Gradients */}
			<div className="absolute inset-0 overflow-hidden">
				{coverMediaUrl ? (
					<div
						className="w-full h-full bg-cover bg-center transform scale-105 transition duration-1000 ease-out"
						style={{ backgroundImage: `url(${coverMediaUrl})` }}
					/>
				) : (
					<div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-[#1e344d]" />
				)}
				{/* Radial & Linear Vignettes */}
				<div className="absolute inset-0 bg-gradient-to-b from-stone-950/70 via-stone-900/35 to-stone-950/80" />
				<div className="absolute inset-0 bg-gradient-to-t from-[#0f1e2f]/80 via-[#1e344d]/30 to-transparent" />
			</div>

			{/* Hero Text & Content */}
			<div className="relative z-10 flex flex-col justify-between items-center text-center p-6 sm:p-10 min-h-[520px] sm:min-h-[580px]">
				{/* Personalized Guest Welcome Header */}
				<div className="pt-2">
					<span className="inline-flex items-center tracking-[0.25em] text-[11px] sm:text-xs uppercase font-semibold text-sky-100 bg-white/15 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-md shadow-sm">
						{guest
							? `Invitación para ${guest.displayName}`
							: "Estás cordialmente invitado"}
					</span>
				</div>

				{/* Main Title & Hosts */}
				<div className="space-y-3 my-auto max-w-xl py-6">
					<h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white drop-shadow-md leading-[1.08] capitalize">
						{event.title}
					</h1>
					{event.honoreeNames && event.honoreeNames.length > 0 && (
						<p className="text-sm sm:text-base tracking-widest uppercase font-light text-sky-200">
							{event.honoreeNames.join(" & ")}
						</p>
					)}
					<div className="flex items-center justify-center gap-3 pt-1">
						<span className="h-[1px] w-8 bg-sky-200/40" />
						<p className="font-serif italic text-lg sm:text-xl text-stone-100 capitalize">
							{formattedDate}
						</p>
						<span className="h-[1px] w-8 bg-sky-200/40" />
					</div>
				</div>

				{/* Countdown Counter */}
				{timeLeft && (
					<div className="w-full max-w-sm pb-2">
						<div className="glass-hero-badge rounded-2xl p-4 sm:p-5 shadow-2xl">
							<div className="grid grid-cols-3 divide-x divide-white/15 text-center items-center">
								<div className="px-2">
									<span className="block font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-none">
										{timeLeft.days}
									</span>
									<span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-sky-200/90 font-medium mt-1.5 block">
										Días
									</span>
								</div>
								<div className="px-2">
									<span className="block font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-none">
										{String(timeLeft.hours).padStart(2, "0")}
									</span>
									<span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-sky-200/90 font-medium mt-1.5 block">
										Horas
									</span>
								</div>
								<div className="px-2">
									<span className="block font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-white leading-none">
										{String(timeLeft.minutes).padStart(2, "0")}
									</span>
									<span className="text-[10px] sm:text-[11px] uppercase tracking-widest text-sky-200/90 font-medium mt-1.5 block">
										Min
									</span>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</header>
	);
}
