"use client";
import { Alert, Button, Input, Label, TextField } from "@heroui/react";
import { type FormEvent, useState } from "react";

export type SignInFormProps = {
	onSignIn: (input: {
		email: string;
		password: string;
	}) => Promise<{ ok: boolean }>;
};

export function SignInForm({ onSignIn }: SignInFormProps) {
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
			const result = await onSignIn({ email, password });
			if (!result.ok)
				setError("No hemos podido iniciar sesión con esos datos.");
		} catch {
			setError("No hemos podido iniciar sesión con esos datos.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-surface text-on-surface">
			<div className="w-full max-w-md bg-surface-container-lowest rounded-2xl border border-surface-variant shadow-sm p-6 sm:p-8">
				<header className="text-center mb-6 sm:mb-8">
					<h1 className="font-serif italic text-2xl sm:text-3xl text-primary font-semibold mb-2">
						Inicia sesión
					</h1>
					<p className="text-secondary text-sm leading-relaxed">
						Vuelve a tus celebraciones y sigue organizando.
					</p>
				</header>
				<form onSubmit={submit} aria-busy={submitting} className="space-y-5">
					<TextField className="space-y-1.5 w-full">
						<Label htmlFor="sign-in-email" className={labelCls}>
							Correo electrónico
						</Label>
						<Input
							id="sign-in-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							autoComplete="email"
							required
							disabled={submitting}
							className={inputCls}
						/>
					</TextField>
					<TextField className="space-y-1.5 w-full">
						<Label htmlFor="sign-in-password" className={labelCls}>
							Contraseña
						</Label>
						<Input
							id="sign-in-password"
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							autoComplete="current-password"
							minLength={8}
							required
							disabled={submitting}
							className={inputCls}
						/>
					</TextField>
					{error ? (
						<Alert status="danger" role="alert">
							<Alert.Description>{error}</Alert.Description>
						</Alert>
					) : null}
					<Button
						type="submit"
						variant="primary"
						fullWidth
						isDisabled={submitting}
						isPending={submitting}
					>
						{submitting ? "Iniciando sesión…" : "Iniciar sesión"}
					</Button>
				</form>
			</div>
		</div>
	);
}

const labelCls = "block text-sm font-medium text-on-surface";
const inputCls =
	"w-full bg-surface-container-low border border-surface-dim text-on-surface rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200 motion-reduce:transition-none disabled:opacity-60";
