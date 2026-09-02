"use client";

import { useEffect } from "react";

export default function ErrorPage({
	error,
}: {
	error: Error & { digest?: string };
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div>
			<h2>Algo salió mal.</h2>
		</div>
	);
}
