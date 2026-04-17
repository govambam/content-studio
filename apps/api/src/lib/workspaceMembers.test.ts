import { describe, it, expect } from "vitest";
import { isAlreadyMember, WorkspaceMember } from "./workspaceMembers.js";

describe("isAlreadyMember", () => {
  const members: WorkspaceMember[] = [
    {
      id: "mem_1",
      role: "owner",
      provisioning: "invite",
      profile: { email: "alice@example.com", displayName: "Alice" },
    },
    {
      id: "mem_2",
      role: "admin",
      provisioning: "sso",
      profile: null,
    },
    {
      id: "mem_3",
      role: "editor",
      provisioning: "invite",
      profile: { email: "bob@example.com", displayName: "Bob" },
    },
  ];

  it("returns true for an existing member email (case-insensitive)", () => {
    expect(isAlreadyMember("Alice@Example.com", members)).toBe(true);
  });

  it("returns false for an unknown email", () => {
    expect(isAlreadyMember("unknown@example.com", members)).toBe(false);
  });

  it("does not throw when a member has a null profile", () => {
    expect(() => isAlreadyMember("anyone@example.com", members)).not.toThrow();
  });
});
