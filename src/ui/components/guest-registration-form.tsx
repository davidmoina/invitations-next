"use client";
import { type FormEvent, useState } from "react";

import { ArrowRightIcon, CheckCircleIcon, SpinnerIcon } from "./icons";

export type RegisterGuestInput = {
	displayName: string;
	email: string | null;
};

export type RegisterGuestResult =
	| {
			ok: true;
			guest?: {
				id: string;
				displayName: string;
				attending: boolean | null;
				companions: number;
			};
	  }
	| {
			ok: false;
			error?: unknown;
	  };

export type GuestRegistrationFormProps = {
	onRegisterGuest?: (input: RegisterGuestInput) => Promise<RegisterGuestResult>;
	onSuccess?: (guest: {
		id: string;
		displayName: string;
		attending: boolean | null;
		companions: number;
	}) => void;
};

export function GuestRegistrationForm({
	onRegisterGuest,
	onSuccess,
}: GuestRegistrationFormProps) {
	const [displayName, setDisplayName] = useState("");
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);
	const [nameError, setNameError] = useState<string | null>(null);
	const [emailError, setEmailError] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isSubmitting) return;

		let hasValidationError = false;

		const trimmedName = displayName.trim();
		if (!trimmedName) {
			setNameError("Please enter your name.");
			hasValidationError = true;
		} else {
			setNameError(null);
		}

		const trimmedEmail = email.trim();
		if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
			setEmailError("Please enter a valid email address.");
			hasValidationError = true;
		} else {
			setEmailError(null);
		}

		if (hasValidationError) return;

		setNameError(null);
		setEmailError(null);
		setErrorMessage(null);
		setIsSubmitting(true);

		const normalizedData: RegisterGuestInput = {
			displayName: trimmedName,
			email: trimmedEmail === "" ? null : trimmedEmail.toLowerCase(),
		};

		try {
			if (!onRegisterGuest) {
				setErrorMessage(
					"Registration is currently unavailable. Please try again later.",
				);
				setIsSubmitting(false);
				return;
			}

			const result = await onRegisterGuest(normalizedData);
			if (result.ok) {
				setIsSuccess(true);
				// The server returns a generic { ok: true } with no identity. The
				// actual guest is supplied by the route loader after cookie
				// resolution; we only forward an identity if the caller explicitly
				// included one (used in tests and isolated component wiring).
				if (result.guest) {
					onSuccess?.(result.guest);
				}
			} else {
				// User-safe generic message: never reveal whether an email was known or new
				setErrorMessage(
					"Unable to complete registration. Please check your information and try again.",
				);
			}
		} catch {
			// User-safe generic connection error
			setErrorMessage(
				"Unable to complete registration. Please check your connection and try again.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isSuccess) {
		return (
			<section
				id="rsvp"
				aria-label="Guest registration"
				className="w-full max-w-md mx-auto p-8 bg-champagne-50 rounded-2xl border border-champagne-100 shadow-sm text-center"
			>
				<div className="w-16 h-16 rounded-full bg-success-bg text-success-green mx-auto mb-4 flex items-center justify-center">
					<CheckCircleIcon className="w-8 h-8" />
				</div>
				<h2 className="font-serif text-2xl text-primary font-semibold mb-2">
					Registration complete
				</h2>
				<p className="text-secondary text-sm">
					Your invitation details are ready.
				</p>
			</section>
		);
	}

	return (
		<section
			id="rsvp"
			aria-label="Guest registration"
			className="w-full max-w-md mx-auto p-6 sm:p-8 bg-surface-container-lowest rounded-2xl border border-stone-200 shadow-sm"
		>
			<div className="text-center mb-6 sm:mb-8">
				<h2 className="font-serif text-2xl sm:text-3xl text-primary font-semibold mb-2">
					Join the celebration
				</h2>
				<p className="text-secondary text-sm">
					Please provide your details to view the full invitation and RSVP.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-5" noValidate>
				{/* Name input */}
				<div className="space-y-1.5">
					<label
						htmlFor="guest-name"
						className="block text-sm font-medium text-on-surface"
					>
						Full Name{" "}
						<span className="text-error" aria-hidden="true">
							*
						</span>
					</label>
					<div className="relative">
						<input
							id="guest-name"
							name="displayName"
							type="text"
							required
							aria-required="true"
							aria-invalid={nameError ? "true" : undefined}
							aria-describedby={nameError ? "name-validation-error" : undefined}
							value={displayName}
							onChange={(event) => {
								setDisplayName(event.target.value);
								if (nameError) setNameError(null);
								if (errorMessage) setErrorMessage(null);
							}}
							placeholder="e.g. Elena Rodriguez"
							disabled={isSubmitting}
							className="w-full bg-stone-50 border border-stone-300 text-on-surface rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 placeholder:text-stone-400 disabled:opacity-60"
						/>
						{displayName.trim().length > 1 && (
							<span
								className="absolute right-3.5 top-1/2 -translate-y-1/2 text-success-green pointer-events-none"
								aria-hidden="true"
							>
								<CheckCircleIcon className="w-5 h-5" />
							</span>
						)}
					</div>
					{nameError && (
						<p
							id="name-validation-error"
							role="alert"
							className="text-xs text-error font-medium"
						>
							{nameError}
						</p>
					)}
				</div>

				{/* Email input */}
				<div className="space-y-1.5">
					<label
						htmlFor="guest-email"
						className="block text-sm font-medium text-on-surface"
					>
						Email Address{" "}
						<span className="text-secondary/70 font-normal text-xs ml-1">
							(Optional)
						</span>
					</label>
					<input
						id="guest-email"
						name="email"
						type="email"
						aria-invalid={emailError ? "true" : undefined}
						aria-describedby={emailError ? "email-validation-error" : undefined}
						value={email}
						onChange={(event) => {
							setEmail(event.target.value);
							if (emailError) setEmailError(null);
							if (errorMessage) setErrorMessage(null);
						}}
						placeholder="For event updates"
						disabled={isSubmitting}
						className="w-full bg-stone-50 border border-stone-300 text-on-surface rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 placeholder:text-stone-400 disabled:opacity-60"
					/>
					{emailError && (
						<p
							id="email-validation-error"
							role="alert"
							className="text-xs text-error font-medium"
						>
							{emailError}
						</p>
					)}
				</div>

				{/* Server/submission error alert */}
				{errorMessage && (
					<div
						role="alert"
						className="p-3.5 bg-error-container/40 border border-error/20 text-error rounded-xl text-xs font-medium"
					>
						{errorMessage}
					</div>
				)}

				{/* Submit button */}
				<div className="pt-2">
					<button
						type="submit"
						disabled={isSubmitting}
						className="w-full bg-primary text-white font-medium text-sm py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
					>
						{isSubmitting ? (
							<>
								<SpinnerIcon className="w-4 h-4 animate-spin" />
								<span>Preparing your invitation...</span>
							</>
						) : (
							<>
								<span>Continue to RSVP</span>
								<ArrowRightIcon className="w-4 h-4" />
							</>
						)}
					</button>
				</div>
			</form>

			{/* Privacy disclaimer */}
			<div className="mt-6 text-center">
				<p className="text-xs text-secondary/80 max-w-xs mx-auto">
					By continuing, you agree to share these details with the event host.
				</p>
			</div>
		</section>
	);
}
