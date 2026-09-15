import "@testing-library/jest-dom/vitest";
import { toast } from "@heroui/react";
import { afterEach, vi } from "vitest";

if (typeof window !== "undefined" && !window.matchMedia) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
}

if (typeof window !== "undefined" && !window.ResizeObserver) {
	class MockResizeObserver {
		observe = vi.fn();
		unobserve = vi.fn();
		disconnect = vi.fn();
	}
	window.ResizeObserver =
		MockResizeObserver as unknown as typeof ResizeObserver;
}

afterEach(() => {
	toast.clear();
});
