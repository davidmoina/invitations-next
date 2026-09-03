"use client";
import { type FormEvent, useState } from "react";

export type SignUpFormProps = {
	onSignUp: (input: {
		name: string;
		email: string;
		password: string;
	}) => Promise<{ ok: boolean }>;
};

export function SignUpForm({ onSignUp }: SignUpFormProps) {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (submitting) return;
		setSubmitting(true);
		setError(null);
		try {
			const result = await onSignUp({ name, email, password });
			if (!result.ok)
				setError("No hemos podido crear tu cuenta. Inténtalo de nuevo.");
		} catch {
			setError("No hemos podido crear tu cuenta. Inténtalo de nuevo.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-surface text-on-surface">
			<div className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-sm p-6 sm:p-8">
				<header className="text-center mb-6 sm:mb-8">
					<h1 className="font-serif italic text-2xl sm:text-3xl text-primary font-semibold mb-2">
						Crea tu cuenta
					</h1>
					<p className="text-secondary text-sm leading-relaxed">
						Organiza tu celebración y comparte cada detalle.
					</p>
				</header>
				<form onSubmit={submit} aria-busy={submitting} className="space-y-5">
					<div className="space-y-1.5">
						<label htmlFor="sign-up-name" className={labelCls}>
							Nombre
						</label>
						<input
							id="sign-up-name"
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							autoComplete="name"
							required
							disabled={submitting}
							className={inputCls}
						/>
					</div>
					<div className="space-y-1.5">
						<label htmlFor="sign-up-email" className={labelCls}>
							Correo electrónico
						</label>
						<input
							id="sign-up-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoComplete="email"
							required
							disabled={submitting}
							className={inputCls}
						/>
					</div>
					<div className="space-y-1.5">
						<label htmlFor="sign-up-password" className={labelCls}>
							Contraseña
						</label>
						<input
							id="sign-up-password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete="new-password"
							minLength={8}
							aria-describedby="sign-up-password-hint"
							required
							disabled={submitting}
							className={inputCls}
						/>
						<p id="sign-up-password-hint" className="text-xs text-secondary">
							Mínimo 8 caracteres
						</p>
					</div>
					{error ? (
						<p
							role="alert"
							className="p-3 rounded-xl bg-error-container text-error text-sm font-medium"
						>
							{error}
						</p>
					) : null}
					<button
						type="submit"
						disabled={submitting}
						className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl bg-primary text-white text-sm sm:text-base font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 motion-reduce:transition-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
					>
						{submitting ? "Creando cuenta…" : "Crear cuenta"}
					</button>
				</form>
			</div>
		</div>
	);
}

const labelCls = "block text-sm font-medium text-on-surface";
const inputCls =
	"w-full bg-surface-container-low border border-surface-dim text-on-surface rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200 motion-reduce:transition-none disabled:opacity-60";
