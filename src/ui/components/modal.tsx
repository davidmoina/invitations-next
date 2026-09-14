"use client";

import { useEffect } from "react";
import { XIcon } from "./icons";

export type ModalProps = {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	description?: string;
	children: React.ReactNode;
	maxWidthClass?: string;
};

export function Modal({
	isOpen,
	onClose,
	title,
	description,
	children,
	maxWidthClass = "max-w-xl",
}: ModalProps) {
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		const originalOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.body.style.overflow = originalOverflow;
		};
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
			aria-describedby={description ? "modal-description" : undefined}
			className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
		>
			{/* Backdrop */}
			<button
				type="button"
				aria-label="Cerrar fondo de modal"
				onClick={onClose}
				tabIndex={-1}
				className="fixed inset-0 w-full h-full bg-stone-900/60 backdrop-blur-xs cursor-default transition-opacity"
			/>

			{/* Modal Card */}
			<div
				className={`relative z-10 w-full ${maxWidthClass} bg-surface rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]`}
			>
				{/* Modal Header */}
				<div className="flex items-start justify-between p-6 pb-4 border-b border-stone-100">
					<div>
						<h2
							id="modal-title"
							className="font-serif italic text-2xl font-bold text-primary"
						>
							{title}
						</h2>
						{description && (
							<p id="modal-description" className="text-xs text-secondary mt-1">
								{description}
							</p>
						)}
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label="Cerrar modal"
						className="p-2 -mr-1 text-secondary hover:text-primary hover:bg-stone-100 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-primary"
					>
						<XIcon className="w-5 h-5" />
					</button>
				</div>

				{/* Modal Body */}
				<div className="p-6 overflow-y-auto">{children}</div>
			</div>
		</div>
	);
}
