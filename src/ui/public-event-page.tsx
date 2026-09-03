"use client";
import { useEffect, useState } from "react";
import type { PublicEventPageProps as ContractPublicEventPageProps } from "#/server/contracts/public";
import { BottomNav } from "./components/bottom-nav";
import { EventDetailsSection } from "./components/event-details-section";
import { GiftRegistry } from "./components/gift-registry";
import { GuestMessageForm } from "./components/guest-message-form";
import {
	GuestRegistrationForm,
	type RegisterGuestInput,
	type RegisterGuestResult,
} from "./components/guest-registration-form";
import { HeroSection } from "./components/hero-section";
import { MediaGallery } from "./components/media-gallery";
import { RsvpForm } from "./components/rsvp-form";

export type { RegisterGuestInput, RegisterGuestResult };

export type PublicEventPageProps = ContractPublicEventPageProps & {
	onRegisterGuest?: (input: RegisterGuestInput) => Promise<RegisterGuestResult>;
};

export function PublicEventPage({
	event,
	guest,
	gifts,
	media,
	onSubmitRsvp,
	onReserveGift,
	onCancelReservation,
	onSubmitMessage,
	onRegisterGuest,
}: PublicEventPageProps) {
	const coverImage = media && media.length > 0 ? media[0]?.urls.full : null;
	const [currentGuest, setCurrentGuest] = useState(guest);

	useEffect(() => {
		setCurrentGuest(guest);
	}, [guest]);

	const handleRegisterGuest = async (
		input: RegisterGuestInput,
	): Promise<RegisterGuestResult> => {
		if (!onRegisterGuest) {
			return { ok: false, error: "Registration is not available" };
		}
		const result = await onRegisterGuest(input);
		if (result.ok && result.guest) {
			// An explicit guest identity is only supplied in tests or isolated
			// wiring. In production the server returns a generic { ok: true } and
			// the authenticated guest arrives through the route loader.
			setCurrentGuest(result.guest);
		}
		return result;
	};

	return (
		<div className="min-h-screen bg-stone-50 text-on-surface font-sans antialiased pb-20 sm:pb-12 selection:bg-primary-container/40 selection:text-primary">
			<main className="w-full max-w-[720px] mx-auto bg-surface shadow-sm sm:rounded-3xl sm:my-6 overflow-hidden border border-stone-200/60">
				{/* Hero section */}
				<HeroSection
					event={event}
					guest={currentGuest}
					coverMediaUrl={coverImage}
				/>

				{/* Event Details section */}
				<EventDetailsSection event={event} />

				{/* RSVP or Guest Registration section */}
				<div className="px-4 py-6">
					{currentGuest ? (
						<RsvpForm
							maxCompanions={event.maxCompanions}
							rsvpDeadline={event.rsvpDeadline}
							guest={currentGuest}
							onSubmitRsvp={onSubmitRsvp}
						/>
					) : (
						<GuestRegistrationForm
							onRegisterGuest={handleRegisterGuest}
							onSuccess={(newGuest) => {
								setCurrentGuest(newGuest);
							}}
						/>
					)}
				</div>

				{/* Gift registry section */}
				<GiftRegistry
					giftRegistryEnabled={event.giftRegistryEnabled}
					gifts={gifts}
					onReserveGift={onReserveGift}
					onCancelReservation={onCancelReservation}
				/>

				{/* Media gallery section */}
				<MediaGallery media={media} />

				{/* Guest message / Guestbook section */}
				<div className="px-4 py-8">
					<GuestMessageForm onSubmitMessage={onSubmitMessage} />
				</div>

				{/* Footer */}
				<footer className="py-8 px-4 text-center border-t border-stone-200/80 text-xs text-secondary">
					<p className="font-serif italic text-sm text-primary mb-1">
						{event.title}
					</p>
					<p>© {new Date().getFullYear()} — Diseñado con cariño</p>
				</footer>
			</main>

			{/* Sticky bottom navigation for mobile */}
			<BottomNav hasRegistry={event.giftRegistryEnabled} />
		</div>
	);
}
