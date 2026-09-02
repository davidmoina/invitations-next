import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SignUpForm } from "./sign-up-form";

describe("SignUpForm", () => {
	afterEach(cleanup);

	it("renders accessible Spanish card, guards submission, and shows errors", async () => {
		const user = userEvent.setup();
		let resolve!: (v: { ok: boolean }) => void;
		const onSignUp = vi.fn().mockImplementation(
			() =>
				new Promise<{ ok: boolean }>((r) => {
					resolve = r;
				}),
		);
		const { container } = render(<SignUpForm onSignUp={onSignUp} />);

		expect(
			screen.getByRole("heading", { level: 1, name: "Crea tu cuenta" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Organiza tu celebración y comparte cada detalle."),
		).toBeInTheDocument();
		expect(screen.getByText("Mínimo 8 caracteres")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Crear cuenta" }),
		).toBeInTheDocument();

		const name = screen.getByLabelText("Nombre");
		const email = screen.getByLabelText("Correo electrónico");
		const pass = screen.getByLabelText("Contraseña");
		expect(name.id).toBe("sign-up-name");
		expect(name.getAttribute("type")).toBe("text");
		expect(name.getAttribute("autocomplete")).toBe("name");
		expect(email.id).toBe("sign-up-email");
		expect(email.getAttribute("type")).toBe("email");
		expect(email.getAttribute("autocomplete")).toBe("email");
		expect(pass.id).toBe("sign-up-password");
		expect(pass.getAttribute("type")).toBe("password");
		expect(pass.getAttribute("autocomplete")).toBe("new-password");
		expect(pass.getAttribute("aria-describedby")).toBe("sign-up-password-hint");

		const q = (s: string) => container.querySelector(s);
		expect(q('label[for="sign-up-name"]')).toBeInTheDocument();
		expect(q('label[for="sign-up-email"]')).toBeInTheDocument();
		expect(q('label[for="sign-up-password"]')).toBeInTheDocument();

		await user.type(name, "Ada Lovelace");
		await user.type(email, "ada@example.test");
		await user.type(pass, "a strong password");

		const form = q("form");
		const btn = screen.getByRole("button", { name: "Crear cuenta" });
		expect(form).toHaveAttribute("aria-busy", "false");

		await user.click(btn);
		expect(form).toHaveAttribute("aria-busy", "true");
		expect(btn).toHaveTextContent("Creando cuenta…");
		expect(btn).toBeDisabled();

		await user.click(btn);
		expect(onSignUp).toHaveBeenCalledTimes(1);
		expect(onSignUp).toHaveBeenCalledWith({
			name: "Ada Lovelace",
			email: "ada@example.test",
			password: "a strong password",
		});

		resolve({ ok: false });
		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				"No hemos podido crear tu cuenta. Inténtalo de nuevo.",
			);
		});
		expect(form).toHaveAttribute("aria-busy", "false");
		expect(btn).toHaveTextContent("Crear cuenta");
		expect(btn).not.toBeDisabled();
	});
});
