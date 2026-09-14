"use client";

import { useRouter } from "next/navigation";
import { signIn } from "#/api-client";
import { SignInForm } from "#/ui/components/auth/sign-in-form";

export function SignInWrapper() {
	const router = useRouter();
	return (
		<SignInForm
			onSignIn={async (input) => {
				const result = await signIn(input);
				if (result.ok) {
					router.push("/admin");
					router.refresh();
				}
				return result;
			}}
		/>
	);
}
