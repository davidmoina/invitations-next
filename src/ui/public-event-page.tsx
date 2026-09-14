"use client";
import { useEffect, useState } from "react";
import type {
  PublicEventPageProps as ContractPublicEventPageProps,
  RequestGuestLinkInput,
  RequestGuestLinkResult,
} from "#/server/contracts/public";
import { BottomNav } from "./components/bottom-nav";
import { EventDetailsSection } from "./components/event-details-section";
import { GiftRegistry } from "./components/gift-registry";
import { GuestMessageForm } from "./components/guest-message-form";
import type {
  RegisterGuestInput,
  RegisterGuestResult,
} from "./components/guest-registration-form";
import { HeroSection } from "./components/hero-section";
import { MediaGallery } from "./components/media-gallery";
import { RsvpForm } from "./components/rsvp-form";

export type {
  RegisterGuestInput,
  RegisterGuestResult,
  RequestGuestLinkInput,
  RequestGuestLinkResult,
};

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
  onRequestGuestLink: _onRequestGuestLink,
}: PublicEventPageProps) {
  const coverImage = media?.find((m) => m.isCover)?.urls.full ?? null;
  const galleryMedia = media?.filter((m) => !m.isCover) ?? [];
  const [currentGuest, setCurrentGuest] = useState(guest);

  useEffect(() => {
    setCurrentGuest(guest);
  }, [guest]);

  return (
    <div className="min-h-screen py-6 sm:py-12 px-3 sm:px-6 flex justify-center bg-[#f8fafc] text-slate-800 selection:bg-[#d1e4ff] selection:text-[#113657] pb-24 sm:pb-16 font-sans antialiased">
      <main className="w-full max-w-3xl flex flex-col gap-10">
        {/* Hero section */}
        <HeroSection
          event={event}
          guest={currentGuest}
          coverMediaUrl={coverImage}
        />

        {/* Event Details section (Quote + When/Where grid + Type details) */}
        <EventDetailsSection event={event} />

        {/* RSVP section */}
        {currentGuest ? (
          <RsvpForm
            maxCompanions={event.maxCompanions}
            rsvpDeadline={event.rsvpDeadline}
            guest={currentGuest}
            onSubmitRsvp={onSubmitRsvp}
          />
        ) : (
          <div id="rsvp" />
        )}

        {/* Gift registry section */}
        <GiftRegistry
          giftRegistryEnabled={event.giftRegistryEnabled}
          gifts={gifts}
          onReserveGift={onReserveGift}
          onCancelReservation={onCancelReservation}
        />

        {/* Media gallery section */}
        <MediaGallery media={galleryMedia} />

        {/* Guest message / Guestbook section */}
        <GuestMessageForm
          onSubmitMessage={onSubmitMessage}
          storageKey={`guest-message:${event.id}:${currentGuest?.id ?? "guest"}`}
        />

        {/* Footer */}
        <footer
          data-purpose="page-footer"
          className="text-center py-6 text-slate-500 border-t border-slate-200 space-y-1.5"
        >
          <p className="font-serif italic text-xl tracking-wide text-slate-700">
            {event.title}
          </p>
          <p className="text-xs text-slate-400 font-light">
            © {new Date().getFullYear()} — Diseñado con cariño
          </p>
        </footer>
      </main>

      {/* Sticky bottom navigation for mobile */}
      <BottomNav hasRegistry={event.giftRegistryEnabled} />
    </div>
  );
}
