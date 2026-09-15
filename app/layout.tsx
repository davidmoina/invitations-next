import { Toast } from "@heroui/react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: "Invit",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="es">
			<body>
				<Toast.Provider />
				{children}
			</body>
		</html>
	);
}
