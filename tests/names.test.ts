import { describe, expect, it } from "vitest";
import {
	normalizeProjectTitle,
	parseModuleName,
	validatePackageName,
} from "../src/names.js";

describe("validatePackageName", () => {
	it("accepts scoped lowercase package names", () => {
		expect(validatePackageName("@acme/customer-portal")).toBe(
			"@acme/customer-portal",
		);
	});

	it("rejects invalid npm package names", () => {
		expect(() => validatePackageName("Customer Portal")).toThrow(
			"Invalid package name",
		);
	});
});

describe("parseModuleName", () => {
	it("computes identifier variants", () => {
		expect(parseModuleName("billing-ledger")).toEqual({
			kebab: "billing-ledger",
			camel: "billingLedger",
			pascal: "BillingLedger",
			display: "Billing Ledger",
		});
	});

	it("rejects generated core module names", () => {
		expect(() => parseModuleName("kernel")).toThrow(
			"part of the generated core",
		);
	});
});

describe("normalizeProjectTitle", () => {
	it("builds a readable title from package names", () => {
		expect(normalizeProjectTitle("@acme/customer-portal")).toBe(
			"Customer Portal",
		);
	});
});
