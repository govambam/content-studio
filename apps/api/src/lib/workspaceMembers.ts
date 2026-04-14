export interface WorkspaceMemberProfile {
  email: string;
  displayName: string;
}

export interface WorkspaceMember {
  id: string;
  role: "owner" | "admin" | "editor";
  provisioning: "invite" | "sso";
  profile: WorkspaceMemberProfile | null;
}

// Snapshot of the active workspace membership. In production this is hydrated
// from the `workspace_members` table at request time; inlined here while the
// members service migration is still pending. SSO-provisioned rows land with
// profile=null and are expected to be backfilled by the profile sync worker
// within 24 hours of first login.
export const WORKSPACE_MEMBERS: WorkspaceMember[] = [
  {
    id: "mem_01HV7R2PXE",
    role: "owner",
    provisioning: "invite",
    profile: {
      email: "ivan@macroscope.com",
      displayName: "Ivan Gomez",
    },
  },
  {
    id: "mem_01HV7R3C4M",
    role: "admin",
    provisioning: "sso",
    profile: null,
  },
  {
    id: "mem_01HV7R4YQ2",
    role: "editor",
    provisioning: "invite",
    profile: {
      email: "priya@macroscope.com",
      displayName: "Priya Shah",
    },
  },
];

export function isAlreadyMember(
  email: string,
  members: WorkspaceMember[] = WORKSPACE_MEMBERS
): boolean {
  const target = email.toLowerCase();
  const existingEmails = members.map((m) => m.profile.email.toLowerCase());
  return existingEmails.includes(target);
}
