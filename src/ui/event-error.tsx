import { accessErrorCode } from "#/server/access-error";

/**
 * Presentational boundaries for the guest-facing routes.
 *
 * They import `accessErrorCode` and nothing else from outside `src/ui/**`:
 * it is a pure reader over a thrown value, with no server or platform reach
 * (design D9 seam guard (a)).
 */

function ErrorShell({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen bg-stone-50 text-on-surface font-sans antialiased flex items-center justify-center px-4">
			<main className="w-full max-w-md bg-surface border border-stone-200/60 rounded-3xl shadow-sm px-6 py-12 text-center">
				<h1 className="font-serif italic text-2xl text-primary mb-3">
					{title}
				</h1>
				<div className="text-sm text-secondary leading-relaxed">{children}</div>
			</main>
		</div>
	);
}

export function EventNotFound() {
	return (
		<ErrorShell title="No encontramos esta invitación">
			<p>
				Puede que el enlace se haya copiado a medias o que la celebración ya no
				esté disponible. Revisa el enlace que te enviaron.
			</p>
		</ErrorShell>
	);
}

export function EventAccessError({ error }: { error: unknown }) {
	const code = accessErrorCode(error);

	if (code === "unauthorized") {
		return (
			<ErrorShell title="Necesitamos identificarte">
				<p>
					Abre de nuevo el enlace personal que recibiste en tu invitación para
					continuar.
				</p>
			</ErrorShell>
		);
	}

	if (code === "forbidden") {
		return (
			<ErrorShell title="Esta invitación no es tuya">
				<p>
					No tienes acceso a esta celebración. Si crees que se trata de un
					fallo, pide a quien organiza que vuelva a enviarte tu enlace.
				</p>
			</ErrorShell>
		);
	}

	// Never dress an unexpected failure up as an access decision, and never
	// surface its message: it can carry internal detail.
	return (
		<ErrorShell title="Algo ha ido mal">
			<p>
				No hemos podido cargar la invitación. Vuelve a intentarlo en unos
				instantes.
			</p>
		</ErrorShell>
	);
}
