"use client";

import { useRouter } from "next/navigation";
import { signUp } from "#/api-client";
import { SignUpForm } from "#/ui/components/auth/sign-up-form";

export function SignUpWrapper() {
	const router = useRouter();
	return (
		<SignUpForm
			onSignUp={async (input) => {
				const result = await signUp({ data: input });
				if (result.ok) {
					router.push("/admin");
					router.refresh();
				}
				return result;
			}}
		/>
	);
}
