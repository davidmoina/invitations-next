"use client";
import { useEffect, useState } from "react";
import { MAX_GIFT_RESERVATIONS_PER_GUEST } from "#/gifts/rules";
import type { PublicGift, ReserveGiftResult } from "#/server/contracts/public";
import { ExternalLinkIcon, GiftIcon } from "./icons";

export type GiftRegistryProps = {
  giftRegistryEnabled: boolean;
  gifts: PublicGift[];
  onReserveGift: (input: { giftId: string }) => Promise<ReserveGiftResult>;
  onCancelReservation: (input: {
    giftId: string;
  }) => Promise<ReserveGiftResult>;
};

/** The status half of a gift, patched locally after a successful reserve or
 *  cancel so the card reflects the new state without a page reload. */
type GiftStatusOverride = Pick<PublicGift, "status" | "reservedByMe">;

/** Two columns, not three. This grid renders inside the guest canvas, which
 *  `design.md` caps at `container-max-guest: 720px`; a third column would
 *  shrink each card to ~213px. The Stitch registry screen reaches ~320px cards
 *  by placing the same grid in a standalone 1024px page, a composition this
 *  app does not have — the registry is a section of the invitation, not a
 *  separate route. */
const GIFT_GRID_CLASS = "grid grid-cols-1 sm:grid-cols-2 gap-6";

export function GiftRegistry({
  giftRegistryEnabled,
  gifts,
  onReserveGift,
  onCancelReservation,
}: GiftRegistryProps) {
  const [loadingGiftId, setLoadingGiftId] = useState<string | null>(null);
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, GiftStatusOverride>
  >({});

  // Server data is the source of truth. Once a fresh `gifts` prop reflects an
  // optimistic override, drop that override so the two can never disagree;
  // keep any override the server has not caught up to yet.
  useEffect(() => {
    setStatusOverrides((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next: Record<string, GiftStatusOverride> = {};
      for (const gift of gifts) {
        const override = prev[gift.id];
        if (
          override &&
          (override.status !== gift.status ||
            override.reservedByMe !== gift.reservedByMe)
        ) {
          next[gift.id] = override;
        }
      }
      return next;
    });
  }, [gifts]);

  if (!giftRegistryEnabled) return null;

  const handleReserve = async (giftId: string) => {
    setLoadingGiftId(giftId);
    setErrorMap((prev) => ({ ...prev, [giftId]: "" }));

    try {
      const result = await onReserveGift({ giftId });
      if (!result.ok) {
        if (result.error.code === "gift_already_reserved") {
          setErrorMap((prev) => ({
            ...prev,
            [giftId]: "Este regalo ya ha sido reservado por otro invitado.",
          }));
        } else if (result.error.code === "gift_limit_reached") {
          const { limit } = result.error;
          setErrorMap((prev) => ({
            ...prev,
            [giftId]: `Solo puedes reservar ${limit} regalos. Cancela una reserva para elegir otro.`,
          }));
        } else {
          setErrorMap((prev) => ({
            ...prev,
            [giftId]: "No se pudo realizar la reserva. Inténtalo de nuevo.",
          }));
        }
      } else {
        setStatusOverrides((prev) => ({
          ...prev,
          [giftId]: { status: "reserved", reservedByMe: true },
        }));
      }
    } catch {
      setErrorMap((prev) => ({
        ...prev,
        [giftId]: "Error de conexión al reservar el regalo.",
      }));
    } finally {
      setLoadingGiftId(null);
    }
  };

  const handleCancel = async (giftId: string) => {
    setLoadingGiftId(giftId);
    setErrorMap((prev) => ({ ...prev, [giftId]: "" }));

    try {
      const result = await onCancelReservation({ giftId });
      if (!result.ok) {
        setErrorMap((prev) => ({
          ...prev,
          [giftId]: "No se pudo cancelar la reserva.",
        }));
      } else {
        setStatusOverrides((prev) => ({
          ...prev,
          [giftId]: { status: "available", reservedByMe: false },
        }));
      }
    } catch {
      setErrorMap((prev) => ({
        ...prev,
        [giftId]: "Error de conexión al cancelar la reserva.",
      }));
    } finally {
      setLoadingGiftId(null);
    }
  };

  // Count against the derived state so the cap reacts to an optimistic
  // reserve/cancel immediately, not only after the next server payload.
  const reservedByMeCount = gifts.reduce((total, gift) => {
    const current = { ...gift, ...(statusOverrides[gift.id] ?? {}) };
    return current.status === "reserved" && current.reservedByMe
      ? total + 1
      : total;
  }, 0);
  const reservationLimitReached =
    reservedByMeCount >= MAX_GIFT_RESERVATIONS_PER_GUEST;

  return (
    <section
      id="registry"
      data-purpose="gift-registry"
      className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-200"
    >
      <div className="text-center max-w-xl mx-auto mb-9">
        <div className="w-14 h-14 rounded-full bg-[#e8f1fa] text-[#274b70] mx-auto flex items-center justify-center mb-4 shadow-sm border border-[#d1e4ff]">
          <GiftIcon className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-slate-800">
          Mesa de regalos
        </h2>
        <p className="text-slate-600 text-sm sm:text-base mt-2 leading-relaxed font-light">
          Tu presencia es nuestro mejor regalo, pero si deseas hacernos un
          detalle, aquí tienes algunas ideas que nos encantarían.
        </p>
      </div>

      {reservationLimitReached && gifts.length > 0 && (
        <p className="text-center text-xs text-primary font-medium mb-6 -mt-4">
          Has reservado el máximo de {MAX_GIFT_RESERVATIONS_PER_GUEST} regalos.
          Cancela una reserva para elegir otro.
        </p>
      )}

      {gifts.length === 0 ? (
        <div className="p-8 text-center bg-[#f8fafc] rounded-2xl border border-slate-200 text-slate-500 text-sm">
          No hay regalos añadidos todavía.
        </div>
      ) : (
        <div className={GIFT_GRID_CLASS}>
          {gifts.map((gift) => {
            const isActionLoading = loadingGiftId === gift.id;
            const error = errorMap[gift.id];
            const displayGift = {
              ...gift,
              ...(statusOverrides[gift.id] ?? {}),
            };

            return (
              <div
                key={gift.id}
                className={`p-5 rounded-2xl border flex flex-col justify-between transition-all bg-surface-container-lowest ${
                  displayGift.status === "reserved"
                    ? displayGift.reservedByMe
                      ? "border-primary-container bg-champagne-50/50 shadow-sm"
                      : "border-stone-200 opacity-75"
                    : "border-stone-200 shadow-sm hover:border-stone-300"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-lg text-slate-800 capitalize">
                      {gift.title}
                    </h3>
                    {displayGift.status === "available" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-bg text-success-green shrink-0">
                        Disponible
                      </span>
                    ) : displayGift.reservedByMe ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-champagne-100 text-champagne-700 shrink-0">
                        Reservado por ti
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200/80 text-slate-600 shrink-0">
                        Reservado
                      </span>
                    )}
                  </div>

                  {gift.description && (
                    <p className="text-xs text-slate-500 mb-6">
                      {gift.description}
                    </p>
                  )}

                  {gift.url && (
                    <a
                      href={gift.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-[#2c4d6f] hover:underline mb-4 font-medium"
                    >
                      <span>Ver producto</span>
                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                    </a>
                  )}

                  {error && (
                    <p className="text-xs text-red-600 font-medium mb-3">
                      {error}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  {displayGift.status === "available" ? (
                    reservationLimitReached ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 px-4 bg-stone-100 text-secondary rounded-xl text-xs font-medium cursor-not-allowed opacity-75"
                      >
                        Máximo {MAX_GIFT_RESERVATIONS_PER_GUEST} regalos
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Reservar regalo: ${gift.title}`}
                        disabled={isActionLoading}
                        onClick={() => handleReserve(gift.id)}
                        className="w-full py-2.5 px-4 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-1.5"
                      >
                        {isActionLoading ? "Reservando..." : "Reservar regalo"}
                      </button>
                    )
                  ) : displayGift.reservedByMe ? (
                    <button
                      type="button"
                      aria-label={`Cancelar reserva: ${gift.title}`}
                      disabled={isActionLoading}
                      onClick={() => handleCancel(gift.id)}
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#274b70] font-medium text-xs sm:text-sm tracking-wide transition shadow-sm active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isActionLoading ? "Cancelando..." : "Cancelar reserva"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-100 text-slate-400 font-medium text-xs sm:text-sm cursor-not-allowed border border-slate-200/60"
                    >
                      Reservado por otro invitado
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
