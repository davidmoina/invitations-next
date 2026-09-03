import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignInForm } from "./sign-in-form";

describe("SignInForm", () => {
	afterEach(cleanup);

	it("renders accessible Spanish card, guards submission, and shows errors", async () => {
		const user = userEvent.setup();
		let resolve!: (v: { ok: boolean }) => void;
		const onSignIn = vi.fn().mockImplementation(
			() =>
				new Promise<{ ok: boolean }>((r) => {
					resolve = r;
				}),
		);
		const { container } = render(<SignInForm onSignIn={onSignIn} />);

		expect(
			screen.getByRole("heading", { level: 1, name: "Inicia sesión" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Vuelve a tus celebraciones y sigue organizando."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Iniciar sesión" }),
		).toBeInTheDocument();

		const email = screen.getByLabelText("Correo electrónico");
		const pass = screen.getByLabelText("Contraseña");
		expect(email.id).toBe("sign-in-email");
		expect(email.getAttribute("type")).toBe("email");
		expect(email.getAttribute("autocomplete")).toBe("email");
		expect(pass.id).toBe("sign-in-password");
		expect(pass.getAttribute("type")).toBe("password");
		expect(pass.getAttribute("autocomplete")).toBe("current-password");

		const q = (s: string) => container.querySelector(s);
		expect(q('label[for="sign-in-email"]')).toBeInTheDocument();
		expect(q('label[for="sign-in-password"]')).toBeInTheDocument();

		await user.type(email, "ada@example.test");
		await user.type(pass, "a strong password");

		const form = q("form");
		const btn = screen.getByRole("button", { name: "Iniciar sesión" });
		expect(form).toHaveAttribute("aria-busy", "false");

		await user.click(btn);
		expect(form).toHaveAttribute("aria-busy", "true");
		expect(btn).toHaveTextContent("Iniciando sesión…");
		expect(btn).toBeDisabled();

		await user.click(btn);
		expect(onSignIn).toHaveBeenCalledTimes(1);
		expect(onSignIn).toHaveBeenCalledWith({
			email: "ada@example.test",
			password: "a strong password",
		});

		resolve({ ok: false });
		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				"No hemos podido iniciar sesión con esos datos.",
			);
		});
		expect(form).toHaveAttribute("aria-busy", "false");
		expect(btn).toHaveTextContent("Iniciar sesión");
		expect(btn).not.toBeDisabled();
	});
});
