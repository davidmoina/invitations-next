import { describe, expect, test } from "vitest";
import { toAdminDto, toPublicDto } from "./rules";

const reservation = {
	id: "gift",
	title: "Mixer",
	description: null,
	imagePublicId: null,
	url: null,
	reservation: { guestId: "guest", displayName: "Ana" },
};
describe("gift DTO visibility", () => {
	test("structurally omits reservation identity from the guest DTO", () => {
		const dto = toPublicDto(reservation, "guest");
		expect(dto.status).toBe("reserved");
		expect("reservedBy" in dto).toBe(false);
		expect(dto.reservedByMe).toBe(true);
	});
	test("includes reservation identity in the organizer DTO", () => {
		expect(toAdminDto(reservation).reservedBy).toEqual({
			guestId: "guest",
			displayName: "Ana",
		});
	});
});
