import { expectTypeOf } from "vitest";

import type { EventDetails, NewEventInput } from "./admin";
import type { BabySex, EventType } from "./event-types";

expectTypeOf<NewEventInput["details"]>().toEqualTypeOf<EventDetails>();
expectTypeOf<NewEventInput["eventType"]>().toEqualTypeOf<EventType>();
expectTypeOf<NewEventInput["honoreeNames"]>().toEqualTypeOf<string[]>();

expectTypeOf<
	Extract<EventDetails, { type: "baby_shower" }>["babySex"]
>().toEqualTypeOf<BabySex | null>();

expectTypeOf<
	Extract<EventDetails, { type: "birthday" }>["turningAge"]
>().toEqualTypeOf<number | null>();
