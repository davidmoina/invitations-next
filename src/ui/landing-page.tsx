import {
	ArrowRightIcon,
	CalendarIcon,
	DashboardIcon,
	HeartIcon,
	UsersIcon,
} from "#/ui/components/icons";

export type LandingPageProps = {
	signUpHref: string; // the route passes "/sign-up"
	signInHref: string; // the route passes "/sign-in"
};

export function LandingPage({ signUpHref, signInHref }: LandingPageProps) {
	return (
		<div className="min-h-screen bg-stone-50 text-on-surface font-sans antialiased selection:bg-primary-container selection:text-on-primary-container flex flex-col">
			{/* Top Navigation */}
			<header className="sticky top-0 w-full z-50 backdrop-blur-md bg-surface/90 border-b border-stone-200/60 shadow-2xs">
				<div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<span className="font-serif italic text-2xl font-bold text-primary">
							Lumina Events
						</span>
					</div>
					<nav
						aria-label="Navegación pública"
						className="hidden sm:flex items-center gap-6 text-sm font-medium text-secondary"
					>
						<a
							href="#features"
							className="hover:text-primary transition-colors"
						>
							Funcionalidades
						</a>
						<a
							href="#event-types"
							className="hover:text-primary transition-colors"
						>
							Tipos de eventos
						</a>
					</nav>
					<div className="flex items-center gap-3">
						<a
							href={signInHref}
							className="text-xs sm:text-sm font-medium px-4 py-2 rounded-xl text-primary hover:bg-stone-100 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
						>
							Iniciar sesión
						</a>
						<a
							href={signUpHref}
							className="hidden sm:inline-flex text-xs sm:text-sm font-medium px-4 py-2 rounded-xl bg-primary text-white hover:opacity-90 transition-opacity shadow-2xs focus-visible:ring-2 focus-visible:ring-primary"
						>
							Empezar gratis
						</a>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-8 py-10 sm:py-16 flex flex-col gap-16 sm:gap-24">
				{/* Hero Section */}
				<section className="flex flex-col lg:flex-row items-center gap-12 pt-4 sm:pt-8">
					<div className="flex-1 flex flex-col gap-6 text-center lg:text-left">
						<div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-champagne-100 text-champagne-700 text-xs font-semibold self-center lg:self-start w-fit border border-champagne-700/20">
							<span className="inline-block w-2 h-2 rounded-full bg-champagne-700" />
							Plataforma de invitaciones de alta gama
						</div>

						<h1 className="font-serif italic text-3xl sm:text-5xl lg:text-6xl text-primary font-semibold leading-tight tracking-tight">
							Invitaciones que celebran cada momento
						</h1>

						<p className="text-secondary text-base sm:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed">
							Crea una experiencia digital inolvidable para bodas, cumpleaños,
							baby showers, galas y más con diseños inmersivos y gestión de RSVP
							en tiempo real.
						</p>

						<div className="flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start pt-2">
							<a
								href={signUpHref}
								className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm sm:text-base hover:opacity-90 transition-opacity shadow-sm active:scale-98 duration-150 focus-visible:ring-2 focus-visible:ring-primary"
							>
								<span>Crear invitación</span>
								<ArrowRightIcon className="w-4 h-4" />
							</a>
							<a
								href={signInHref}
								className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-surface border border-stone-300 text-on-surface font-medium text-sm sm:text-base hover:bg-stone-100 transition-colors active:scale-98 duration-150 focus-visible:ring-2 focus-visible:ring-primary"
							>
								Ir a mi cuenta
							</a>
						</div>
					</div>

					{/* Hero Visual Card */}
					<div className="flex-1 w-full max-w-md lg:max-w-none flex justify-center">
						<div className="relative w-full max-w-md bg-surface p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-card">
							<div className="space-y-4">
								<div className="h-44 sm:h-52 bg-champagne-50 rounded-2xl border border-champagne-100 flex flex-col items-center justify-center text-center p-6 relative overflow-hidden">
									<div className="absolute inset-0 bg-radial from-champagne-100/60 to-transparent" />
									<span className="font-serif italic text-2xl sm:text-3xl text-primary font-bold relative z-10">
										Sofía &amp; Mateo
									</span>
									<p className="text-xs sm:text-sm text-secondary font-medium mt-1 relative z-10">
										Sábado, 24 de Octubre de 2026
									</p>
									<span className="mt-3 px-3 py-1 bg-surface rounded-full text-xs font-semibold text-primary border border-stone-200/60 shadow-2xs relative z-10">
										RSVP Abierto
									</span>
								</div>

								<div className="grid grid-cols-2 gap-3">
									<div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/60">
										<p className="text-xs text-secondary">Confirmados</p>
										<p className="font-serif text-xl font-bold text-on-surface mt-0.5">
											86 / 100
										</p>
									</div>
									<div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/60">
										<p className="text-xs text-secondary">Regalos</p>
										<p className="font-serif text-xl font-bold text-primary mt-0.5">
											18 reservados
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Features Bento Grid */}
				<section id="features" className="flex flex-col gap-8">
					<div className="text-center max-w-2xl mx-auto">
						<h2 className="font-serif italic text-2xl sm:text-4xl text-primary font-semibold">
							Cualquier evento, una sola plataforma
						</h2>
						<p className="text-secondary text-sm sm:text-base mt-2">
							Herramientas diseñadas tanto para deslumbrar a tus invitados como
							para simplificar tu organización.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{/* Feature 1 */}
						<div className="bg-surface p-6 sm:p-8 rounded-2xl border border-stone-200/70 shadow-2xs flex flex-col gap-3 hover:shadow-card transition-shadow">
							<div className="w-12 h-12 rounded-full bg-champagne-100 text-champagne-700 flex items-center justify-center mb-2">
								<HeartIcon className="w-6 h-6" />
							</div>
							<h3 className="font-serif text-lg sm:text-xl font-semibold text-primary">
								Diseño Editorial
							</h3>
							<p className="text-sm text-secondary leading-relaxed">
								Invitaciones web inmersivas con itinerarios visuales, tipografía
								refinada, mapas interactivos y estilo de alta costura.
							</p>
						</div>

						{/* Feature 2 */}
						<div className="bg-surface p-6 sm:p-8 rounded-2xl border border-stone-200/70 shadow-2xs flex flex-col gap-3 hover:shadow-card transition-shadow">
							<div className="w-12 h-12 rounded-full bg-success-bg text-success-green flex items-center justify-center mb-2">
								<UsersIcon className="w-6 h-6" />
							</div>
							<h3 className="font-serif text-lg sm:text-xl font-semibold text-primary">
								RSVP Inteligente
							</h3>
							<p className="text-sm text-secondary leading-relaxed">
								Confirmación de asistencia instantánea, control estricto de
								acompañantes y gestión personalizada de restricciones.
							</p>
						</div>

						{/* Feature 3 */}
						<div className="bg-surface p-6 sm:p-8 rounded-2xl border border-stone-200/70 shadow-2xs flex flex-col gap-3 hover:shadow-card transition-shadow">
							<div className="w-12 h-12 rounded-full bg-primary-container/30 text-primary flex items-center justify-center mb-2">
								<DashboardIcon className="w-6 h-6" />
							</div>
							<h3 className="font-serif text-lg sm:text-xl font-semibold text-primary">
								Control Total
							</h3>
							<p className="text-sm text-secondary leading-relaxed">
								Panel de anfitrión intuitivo con métricas en tiempo real,
								gestión de lista de invitados y colaboración en equipo.
							</p>
						</div>
					</div>
				</section>

				{/* Event Types Showcase */}
				<section id="event-types" className="flex flex-col gap-6">
					<div className="text-center max-w-xl mx-auto">
						<span className="text-xs uppercase tracking-widest font-semibold text-champagne-700">
							Versatilidad
						</span>
						<h2 className="font-serif italic text-2xl sm:text-3xl text-primary font-semibold mt-1">
							Diseñado para cada ocasión
						</h2>
					</div>

					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
						<div className="p-5 rounded-2xl bg-surface border border-stone-200/70 text-center">
							<div className="w-10 h-10 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-primary mb-2">
								<HeartIcon className="w-5 h-5" />
							</div>
							<p className="font-serif font-bold text-on-surface text-base">
								Bodas
							</p>
							<p className="text-xs text-secondary mt-1">
								Elegancia y romanticismo
							</p>
						</div>
						<div className="p-5 rounded-2xl bg-surface border border-stone-200/70 text-center">
							<div className="w-10 h-10 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-primary mb-2">
								<CalendarIcon className="w-5 h-5" />
							</div>
							<p className="font-serif font-bold text-on-surface text-base">
								Baby Showers
							</p>
							<p className="text-xs text-secondary mt-1">Calidez y dulzura</p>
						</div>
						<div className="p-5 rounded-2xl bg-surface border border-stone-200/70 text-center">
							<div className="w-10 h-10 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-primary mb-2">
								<UsersIcon className="w-5 h-5" />
							</div>
							<p className="font-serif font-bold text-on-surface text-base">
								Cumpleaños
							</p>
							<p className="text-xs text-secondary mt-1">Alegría y fiesta</p>
						</div>
						<div className="p-5 rounded-2xl bg-surface border border-stone-200/70 text-center">
							<div className="w-10 h-10 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-primary mb-2">
								<DashboardIcon className="w-5 h-5" />
							</div>
							<p className="font-serif font-bold text-on-surface text-base">
								Galas &amp; Eventos
							</p>
							<p className="text-xs text-secondary mt-1">
								Distinción corporativa
							</p>
						</div>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="mt-auto border-t border-stone-200/60 bg-surface py-8">
				<div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-secondary">
					<p>© {new Date().getFullYear()} Lumina Events. Editorial Elegance.</p>
					<div className="flex items-center gap-6">
						<a
							href={signInHref}
							className="hover:text-primary transition-colors"
						>
							Iniciar sesión
						</a>
						<a
							href={signUpHref}
							className="hover:text-primary transition-colors"
						>
							Crear cuenta
						</a>
					</div>
				</div>
			</footer>
		</div>
	);
}
