import { describe, expect, it } from "vitest";
import { InvalidContributionError, validateContribution } from "../../../src/features/goals/domain/contribution.js";

describe("Validação de aportes", () => {
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "100", null, undefined])("recusa valor %j", value => {
    expect(() => validateContribution(1, value as number)).toThrow(InvalidContributionError);
  });
  it.each([0, -1, 1.1, NaN, Number.MAX_SAFE_INTEGER + 1])("recusa ID %j", id => {
    expect(() => validateContribution(id, 100)).toThrow(InvalidContributionError);
  });
  it("aceita o menor e o maior aporte seguro", () => {
    expect(() => validateContribution(1, 1)).not.toThrow();
    expect(() => validateContribution(1, Number.MAX_SAFE_INTEGER)).not.toThrow();
  });
});
