export const runtime = "nodejs";

export function POST(
	_request: Request,
	_context: { params: Promise<{ slug: string }> },
): Promise<Response> {
	// Deliberately disabled: this issued a guest session without invitation proof.
	// The domain path remains for a future opt-in secondary registration flow.
	return Promise.resolve(Response.json({ code: "gone" }, { status: 410 }));
}
