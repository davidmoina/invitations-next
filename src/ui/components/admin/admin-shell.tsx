"use client";
import { useState } from "react";
import {
	CalendarIcon,
	DashboardIcon,
	GiftIcon,
	HelpCircleIcon,
	LogOutIcon,
	MenuIcon,
	PlusIcon,
	SettingsIcon,
	UsersIcon,
	XCircleIcon,
} from "#/ui/components/icons";

export type AdminNavSection =
	| "dashboard"
	| "events"
	| "guests"
	| "registry"
	| "settings";

export type AdminShellProps = {
	currentSection?: AdminNavSection;
	currentEventTitle?: string;
	currentEventDate?: string;
	newEventHref?: string;
	eventsHref?: string;
	dashboardHref?: string;
	onSignOut?: () => Promise<void>;
	children: React.ReactNode;
};

export function AdminShell({
	currentSection = "events",
	currentEventTitle,
	currentEventDate,
	newEventHref = "/admin/new",
	eventsHref = "/admin",
	dashboardHref,
	onSignOut,
	children,
}: AdminShellProps) {
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

	const navItems: Array<{
		id: AdminNavSection;
		label: string;
		href?: string;
		icon: typeof DashboardIcon;
	}> = [
		{
			id: "dashboard",
			label: "Dashboard",
			href: dashboardHref,
			icon: DashboardIcon,
		},
		{
			id: "events",
			label: "Eventos",
			href: eventsHref,
			icon: CalendarIcon,
		},
		{
			id: "guests",
			label: "Invitados",
			icon: UsersIcon,
		},
		{
			id: "registry",
			label: "Lista de regalos",
			icon: GiftIcon,
		},
		{
			id: "settings",
			label: "Configuración",
			icon: SettingsIcon,
		},
	];

	return (
		<div className="min-h-screen bg-stone-50 text-on-surface font-sans antialiased flex flex-col md:flex-row">
			{/* Mobile Top Navigation */}
			<nav
				aria-label="Navegación móvil"
				className="md:hidden sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-surface-variant/60 shadow-xs px-4 py-3 flex items-center justify-between"
			>
				<a
					href={eventsHref}
					className="font-serif italic text-xl font-semibold text-primary"
				>
					Lumina Events
				</a>
				<div className="flex items-center gap-2">
					<button
						type="button"
						aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
						aria-expanded={mobileMenuOpen}
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
						className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface-variant/40 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
					>
						{mobileMenuOpen ? (
							<XCircleIcon className="w-6 h-6" />
						) : (
							<MenuIcon className="w-6 h-6" />
						)}
					</button>
				</div>
			</nav>

			{/* Mobile Drawer */}
			{mobileMenuOpen ? (
				<div
					role="dialog"
					aria-modal="true"
					aria-label="Menú principal"
					className="fixed inset-0 z-50 md:hidden bg-stone-900/40 backdrop-blur-xs flex flex-col"
				>
					<div className="bg-surface w-4/5 max-w-sm h-full shadow-xl flex flex-col p-6 overflow-y-auto">
						<div className="flex items-center justify-between pb-4 border-b border-surface-variant/50">
							<span className="font-serif italic text-xl font-semibold text-primary">
								Lumina Events
							</span>
							<button
								type="button"
								aria-label="Cerrar menú"
								onClick={() => setMobileMenuOpen(false)}
								className="p-2 rounded-lg text-secondary hover:text-primary focus-visible:ring-2 focus-visible:ring-primary"
							>
								<XCircleIcon className="w-5 h-5" />
							</button>
						</div>

						{currentEventTitle ? (
							<div className="my-4 p-3 bg-surface-container rounded-xl border border-stone-200/60">
								<p className="font-medium text-sm text-on-surface truncate">
									{currentEventTitle}
								</p>
								{currentEventDate ? (
									<p className="text-xs text-secondary mt-0.5">
										{currentEventDate}
									</p>
								) : null}
							</div>
						) : null}

						<nav
							aria-label="Navegación móvil principal"
							className="space-y-1.5 mt-4"
						>
							{navItems.map((item) => {
								const isActive = currentSection === item.id;
								const Icon = item.icon;
								if (item.href) {
									return (
										<a
											key={item.id}
											href={item.href}
											aria-current={isActive ? "page" : undefined}
											onClick={() => setMobileMenuOpen(false)}
											className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
												isActive
													? "bg-primary-container text-on-primary-container font-semibold"
													: "text-on-surface-variant hover:bg-surface-variant/50 hover:text-primary"
											}`}
										>
											<Icon className="w-5 h-5" />
											<span>{item.label}</span>
										</a>
									);
								}
								return (
									<span
										key={item.id}
										aria-disabled="true"
										className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm opacity-60 cursor-not-allowed ${
											isActive
												? "bg-primary-container text-on-primary-container font-semibold"
												: "text-on-surface-variant"
										}`}
									>
										<Icon className="w-5 h-5" />
										<span>{item.label}</span>
									</span>
								);
							})}
						</nav>

						<div className="mt-6 pt-4 border-t border-surface-variant/50">
							<a
								href={newEventHref}
								onClick={() => setMobileMenuOpen(false)}
								className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-white font-medium text-sm shadow-xs hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary"
							>
								<PlusIcon className="w-4 h-4" />
								<span>Crear evento</span>
							</a>
						</div>

						{onSignOut ? (
							<div className="mt-auto pt-6 border-t border-surface-variant/50">
								<button
									type="button"
									onClick={() => {
										setMobileMenuOpen(false);
										void onSignOut();
									}}
									className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-secondary hover:text-error hover:bg-stone-100 transition-colors"
								>
									<LogOutIcon className="w-5 h-5" />
									<span>Cerrar sesión</span>
								</button>
							</div>
						) : null}
					</div>
				</div>
			) : null}

			{/* Desktop Sidebar */}
			<aside className="hidden md:flex flex-col h-screen w-64 fixed left-0 top-0 bg-surface-container border-r border-surface-variant/70 z-40">
				<div className="px-6 py-6 border-b border-surface-variant/50">
					<div className="font-serif italic text-2xl font-bold text-primary">
						Lumina Admin
					</div>
					<div className="text-xs text-secondary mt-1 font-medium">
						Panel de Organización
					</div>
				</div>

				{currentEventTitle ? (
					<div className="mx-4 mt-4 p-3 bg-surface rounded-xl border border-stone-200/60 shadow-2xs">
						<p className="font-medium text-sm text-on-surface truncate">
							{currentEventTitle}
						</p>
						{currentEventDate ? (
							<p className="text-xs text-secondary mt-0.5">
								{currentEventDate}
							</p>
						) : null}
					</div>
				) : null}

				<nav
					aria-label="Navegación del panel"
					className="flex flex-col flex-1 py-4 space-y-1 px-3 overflow-y-auto"
				>
					{navItems.map((item) => {
						const isActive = currentSection === item.id;
						const Icon = item.icon;
						if (item.href) {
							return (
								<a
									key={item.id}
									href={item.href}
									aria-current={isActive ? "page" : undefined}
									className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors group relative overflow-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden ${
										isActive
											? "bg-primary-container text-on-primary-container font-semibold"
											: "text-on-surface-variant hover:bg-surface-variant hover:text-primary"
									}`}
								>
									{isActive ? (
										<div className="absolute inset-y-0 left-0 w-1 bg-primary rounded-r-full" />
									) : null}
									<Icon
										className={`w-5 h-5 ${isActive ? "text-primary" : "group-hover:text-primary"}`}
									/>
									<span>{item.label}</span>
								</a>
							);
						}
						return (
							<span
								key={item.id}
								aria-disabled="true"
								title="Próximamente"
								className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
									isActive
										? "bg-primary-container text-on-primary-container font-semibold"
										: "text-secondary/60 cursor-not-allowed"
								}`}
							>
								<Icon className="w-5 h-5 opacity-60" />
								<span>{item.label}</span>
							</span>
						);
					})}

					<div className="mt-6 px-1">
						<a
							href={newEventHref}
							className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-white font-medium text-sm shadow-xs hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
						>
							<PlusIcon className="w-4 h-4" />
							<span>Crear evento</span>
						</a>
					</div>

					<div className="mt-auto pt-4 border-t border-surface-variant/50 space-y-1">
						<span
							aria-disabled="true"
							className="flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-medium text-secondary/60 cursor-not-allowed"
						>
							<HelpCircleIcon className="w-4 h-4 opacity-60" />
							<span>Centro de ayuda</span>
						</span>

						{onSignOut ? (
							<button
								type="button"
								onClick={() => void onSignOut()}
								className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-secondary hover:text-error hover:bg-stone-100 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
							>
								<LogOutIcon className="w-4 h-4" />
								<span>Cerrar sesión</span>
							</button>
						) : null}
					</div>
				</nav>
			</aside>

			{/* Main Content Area */}
			<main className="flex-1 md:ml-64 bg-background min-h-screen">
				{children}
			</main>
		</div>
	);
}
