import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import type { PublicGift } from "#/server/contracts/public";

// Bootstrap for the `ui` Vitest project, the counterpart of src/smoke.test.ts
// for the unit project. It proves four things the public-UI workstream needs
// before it can write a single component test: the jsdom environment, the JSX
// transform, Testing Library's render plus the jest-dom matchers, and that the
// frozen contract seam resolves from inside src/ui.
//
// Ownership: this file is created by the data/server workstream only to prove
// the tooling. `src/ui/**` belongs to the public-UI workstream (design D9,
// Rule 0), which may extend or delete it freely.

function GiftBadge({ gift }: { gift: PublicGift }) {
	return <span>{gift.status === "reserved" ? "Reserved" : "Available"}</span>;
}

test("the ui project renders a contract-typed component in jsdom", () => {
	const gift: PublicGift = {
		id: "gift-1",
		title: "A cot mobile",
		description: null,
		imagePublicId: null,
		url: null,
		status: "reserved",
		reservedByMe: false,
	};

	render(<GiftBadge gift={gift} />);

	expect(screen.getByText("Reserved")).toBeInTheDocument();
});
