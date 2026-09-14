import {
	CalendarIcon,
	CheckCircleIcon,
	GiftIcon,
	MessageSquareIcon,
} from "./icons";

export type BottomNavProps = {
	hasRegistry: boolean;
};

export function BottomNav({ hasRegistry }: BottomNavProps) {
	return (
		<nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-md border-t border-stone-200 shadow-lg px-4 py-2 sm:hidden">
			<div className="flex items-center justify-around max-w-md mx-auto">
				<a
					href="#details"
					className="flex flex-col items-center justify-center p-1 text-secondary hover:text-primary transition-colors text-[11px] font-medium"
				>
					<CalendarIcon className="w-5 h-5 mb-0.5" />
					<span>Evento</span>
				</a>

				<a
					href="#rsvp"
					className="flex flex-col items-center justify-center p-1 text-primary hover:text-primary/80 transition-colors text-[11px] font-medium"
				>
					<CheckCircleIcon className="w-5 h-5 mb-0.5 text-primary" />
					<span>RSVP</span>
				</a>

				{hasRegistry && (
					<a
						href="#registry"
						className="flex flex-col items-center justify-center p-1 text-secondary hover:text-primary transition-colors text-[11px] font-medium"
					>
						<GiftIcon className="w-5 h-5 mb-0.5" />
						<span>Regalos</span>
					</a>
				)}

				<a
					href="#guestbook"
					className="flex flex-col items-center justify-center p-1 text-secondary hover:text-primary transition-colors text-[11px] font-medium"
				>
					<MessageSquareIcon className="w-5 h-5 mb-0.5" />
					<span>Mensajes</span>
				</a>
			</div>
		</nav>
	);
}
