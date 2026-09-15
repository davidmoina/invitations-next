"use client";

import { Modal as HeroModal } from "@heroui/react";
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
	return (
		<HeroModal.Backdrop
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
			className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/60 backdrop-blur-xs"
		>
			<HeroModal.Container className="w-full flex items-center justify-center">
				<HeroModal.Dialog
					aria-labelledby="modal-title"
					aria-describedby={description ? "modal-description" : undefined}
					className={`relative z-10 w-full ${maxWidthClass} bg-surface rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] outline-none`}
				>
					<HeroModal.Header className="flex items-start justify-between p-6 pb-4 border-b border-stone-100">
						<div>
							<HeroModal.Heading
								id="modal-title"
								className="font-serif italic text-2xl font-bold text-primary"
							>
								{title}
							</HeroModal.Heading>
							{description && (
								<p
									id="modal-description"
									className="text-xs text-secondary mt-1"
								>
									{description}
								</p>
							)}
						</div>
						<HeroModal.CloseTrigger
							aria-label="Cerrar modal"
							className="p-2 -mr-1 text-secondary hover:text-primary hover:bg-stone-100 rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
						>
							<XIcon className="w-5 h-5" />
						</HeroModal.CloseTrigger>
					</HeroModal.Header>
					<HeroModal.Body className="p-6 overflow-y-auto">
						{children}
					</HeroModal.Body>
				</HeroModal.Dialog>
			</HeroModal.Container>
		</HeroModal.Backdrop>
	);
}
