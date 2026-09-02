import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	GuestRegistrationForm,
	type GuestRegistrationFormProps,
} from "./guest-registration-form";

type RegisterGuestCallback = NonNullable<
	GuestRegistrationFormProps["onRegisterGuest"]
>;

describe("GuestRegistrationForm", () => {
	afterEach(cleanup);

	it("renders the guest registration form with accessible controls", () => {
		render(<GuestRegistrationForm />);

		expect(
			screen.getByRole("heading", { name: /join the celebration/i }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				/please provide your details to view the full invitation and rsvp/i,
			),
		).toBeInTheDocument();
		expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /continue to rsvp/i }),
		).toBeInTheDocument();
	});

	it("validates required name field and blocks submission when blank", async () => {
		const user = userEvent.setup();
		const onRegisterGuest = vi
			.fn<RegisterGuestCallback>()
			.mockResolvedValue({ ok: true });

		render(<GuestRegistrationForm onRegisterGuest={onRegisterGuest} />);

		await user.click(screen.getByRole("button", { name: /continue to rsvp/i }));

		expect(screen.getByRole("alert")).toHaveTextContent(
			/please enter your name/i,
		);
		expect(screen.getByLabelText(/full name/i)).toHaveAttribute(
			"aria-invalid",
			"true",
		);
		expect(screen.getByLabelText(/full name/i)).toHaveAttribute(
			"aria-describedby",
			"name-validation-error",
		);
		expect(screen.getByLabelText(/email address/i)).not.toHaveAttribute(
			"aria-invalid",
		);
		expect(onRegisterGuest).not.toHaveBeenCalled();
	});

	it("validates email format if an invalid email is provided", async () => {
		const user = userEvent.setup();
		const onRegisterGuest = vi
			.fn<RegisterGuestCallback>()
			.mockResolvedValue({ ok: true });

		render(<GuestRegistrationForm onRegisterGuest={onRegisterGuest} />);

		await user.type(screen.getByLabelText(/full name/i), "Elena Rodriguez");
		await user.type(screen.getByLabelText(/email address/i), "not-an-email");
		await user.click(screen.getByRole("button", { name: /continue to rsvp/i }));

		expect(screen.getByRole("alert")).toHaveTextContent(
			/please enter a valid email address/i,
		);
		expect(screen.getByLabelText(/email address/i)).toHaveAttribute(
			"aria-invalid",
			"true",
		);
		expect(screen.getByLabelText(/email address/i)).toHaveAttribute(
			"aria-describedby",
			"email-validation-error",
		);
		expect(screen.getByLabelText(/full name/i)).not.toHaveAttribute(
			"aria-invalid",
		);
		expect(onRegisterGuest).not.toHaveBeenCalled();
	});

	it("submits with normalized data when both name and email are provided", async () => {
		const user = userEvent.setup();
		const onRegisterGuest = vi
			.fn<RegisterGuestCallback>()
			.mockResolvedValue({ ok: true });

		render(<GuestRegistrationForm onRegisterGuest={onRegisterGuest} />);

		await user.type(screen.getByLabelText(/full name/i), "  Elena Rodriguez  ");
		await user.type(
			screen.getByLabelText(/email address/i),
			"  Elena.Rodriguez@Example.COM  ",
		);
		await user.click(screen.getByRole("button", { name: /continue to rsvp/i }));

		await waitFor(() => expect(onRegisterGuest).toHaveBeenCalledOnce());
		expect(onRegisterGuest).toHaveBeenCalledWith({
			displayName: "Elena Rodriguez",
			email: "elena.rodriguez@example.com",
		});
	});

	it("submits with normalized null email when email is omitted or whitespace only", async () => {
		const user = userEvent.setup();
		const onRegisterGuest = vi
			.fn<RegisterGuestCallback>()
			.mockResolvedValue({ ok: true });

		render(<GuestRegistrationForm onRegisterGuest={onRegisterGuest} />);

		await user.type(screen.getByLabelText(/full name/i), "Elena Rodriguez");
		await user.type(screen.getByLabelText(/email address/i), "   ");
		await user.click(screen.getByRole("button", { name: /continue to rsvp/i }));

		await waitFor(() => expect(onRegisterGuest).toHaveBeenCalledOnce());
		expect(onRegisterGuest).toHaveBeenCalledWith({
			displayName: "Elena Rodriguez",
			email: null,
		});
	});

	it("displays pending state while submission is in progress", async () => {
		const user = userEvent.setup();
		let resolveSubmission: (value: { ok: true }) => void = () => {};
		const submissionPromise = new Promise<{ ok: true }>((resolve) => {
			resolveSubmission = resolve;
		});
		const onRegisterGuest = vi
			.fn<RegisterGuestCallback>()
			.mockReturnValue(submissionPromise);

		render(<GuestRegistrationForm onRegisterGuest={onRegisterGuest} />);

		await user.type(screen.getByLabelText(/full name/i), "Elena Rodriguez");
		await user.click(screen.getByRole("button", { name: /continue to rsvp/i }));

		// While in flight, pending text should be visible and button disabled
		expect(screen.getByText(/preparing your invitation/i)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /preparing your invitation/i }),
		).toBeDisabled();

		// Complete the submission
		resolveSubmission({ ok: true });
		await waitFor(() => {
			expect(
				screen.queryByText(/preparing your invitation/i),
			).not.toBeInTheDocument();
		});
	});

	it("displays a user-safe error state when onRegisterGuest returns { ok: false }", async () => {
		const user = userEvent.setup();
		const onRegisterGuest = vi
			.fn<RegisterGuestCallback>()
			.mockResolvedValue({ ok: false });

		render(<GuestRegistrationForm onRegisterGuest={onRegisterGuest} />);

		await user.type(screen.getByLabelText(/full name/i), "Elena Rodriguez");
		await user.click(screen.getByRole("button", { name: /continue to rsvp/i }));

		expect(await screen.findByRole("alert")).toHaveTextContent(
			/unable to complete registration/i,
		);
		// Crucially, never reveal whether the email was previously known or newly created
		expect(screen.queryByText(/already exists/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/newly created/i)).not.toBeInTheDocument();
	});

	it("displays a user-safe error state when onRegisterGuest throws an exception", async () => {
		const user = userEvent.setup();
		const onRegisterGuest = vi
			.fn<RegisterGuestCallback>()
			.mockRejectedValue(new Error("Network failed"));

		render(<GuestRegistrationForm onRegisterGuest={onRegisterGuest} />);

		await user.type(screen.getByLabelText(/full name/i), "Elena Rodriguez");
		await user.click(screen.getByRole("button", { name: /continue to rsvp/i }));

		expect(await screen.findByRole("alert")).toBeInTheDocument();
	});

	it("displays success state and invokes onSuccess when registration succeeds", async () => {
		const user = userEvent.setup();
		const registeredGuest = {
			id: "gst-new-1",
			displayName: "Elena Rodriguez",
			attending: null,
			companions: 0,
		};
		const onRegisterGuest = vi
			.fn<RegisterGuestCallback>()
			.mockResolvedValue({ ok: true, guest: registeredGuest });
		const onSuccess = vi.fn();

		render(
			<GuestRegistrationForm
				onRegisterGuest={onRegisterGuest}
				onSuccess={onSuccess}
			/>,
		);

		await user.type(screen.getByLabelText(/full name/i), "Elena Rodriguez");
		await user.click(screen.getByRole("button", { name: /continue to rsvp/i }));

		await waitFor(() => {
			expect(onSuccess).toHaveBeenCalledWith(registeredGuest);
		});
	});

	it("does not synthesize a guest identity when the result omits it", async () => {
		const user = userEvent.setup();
		const onRegisterGuest = vi
			.fn<RegisterGuestCallback>()
			.mockResolvedValue({ ok: true });
		const onSuccess = vi.fn();

		render(
			<GuestRegistrationForm
				onRegisterGuest={onRegisterGuest}
				onSuccess={onSuccess}
			/>,
		);

		await user.type(screen.getByLabelText(/full name/i), "Elena Rodriguez");
		await user.click(screen.getByRole("button", { name: /continue to rsvp/i }));

		await waitFor(() => {
			expect(
				screen.getByRole("heading", { name: /registration complete/i }),
			).toBeInTheDocument();
		});
		expect(onSuccess).not.toHaveBeenCalled();
	});
});
