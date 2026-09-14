"use client";
export type AppHeaderProps = {
	title: string;
	subtitle?: string;
	homeHref: string;
	/** Absent means nobody is signed in — render no sign-out control. */
	onSignOut?: () => Promise<void>;
	actions?: React.ReactNode;
};

export function AppHeader({
	title,
	subtitle,
	homeHref,
	onSignOut,
	actions,
}: AppHeaderProps) {
	return (
		<header className="px-4 py-6">
			<div className="flex items-center justify-between gap-4 mb-3">
				<a
					href={homeHref}
					className="text-xs sm:text-sm font-medium text-secondary hover:text-primary transition-colors inline-flex items-center gap-1"
				>
					Inicio
				</a>
				<div className="flex items-center gap-2">
					{actions}
					{onSignOut ? (
						<button
							type="button"
							onClick={() => void onSignOut()}
							className="text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg border border-stone-300 text-secondary hover:text-on-surface hover:bg-stone-100 transition-colors"
						>
							Cerrar sesión
						</button>
					) : null}
				</div>
			</div>
			<h1 className="font-serif italic text-3xl text-primary">{title}</h1>
			{subtitle ? (
				<p className="text-sm text-secondary mt-1">{subtitle}</p>
			) : null}
		</header>
	);
}
