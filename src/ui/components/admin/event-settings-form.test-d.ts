import { describe, expectTypeOf, it } from "vitest";
import type { UpdateEventInput } from "./event-settings-form";

describe("UpdateEventInput (type test)", () => {
	it("has details, eventType, honoreeNames", () => {
		expectTypeOf<UpdateEventInput>().toHaveProperty("eventType");
		expectTypeOf<UpdateEventInput>().toHaveProperty("honoreeNames");
		expectTypeOf<UpdateEventInput>().toHaveProperty("details");
	});
});
