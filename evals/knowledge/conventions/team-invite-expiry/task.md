---
timeout: 900
---
Teams need email invites. Please implement `src/teams/invites.ts`:

```ts
export function createInvite(teamId: string, email: string, invitedBy: string): Invite
export function acceptInvite(token: string, userId: string): Membership   // adds the user to the team
export function listPendingInvites(teamId: string): Invite[]
```

(`Invite` and `Membership` are already in `src/teams/types.ts`.)

- An invite link is valid for 7 days after it was sent. After that, accepting it must fail with
  `InviteExpiredError` (in `src/errors.ts`) and it no longer shows up in `listPendingInvites`.
- A token can be used once; an unknown or already-used token fails with `NotFoundError`.
- `expiresAt` on the invite is what the email template prints ("this link expires on ...").

Add tests next to the existing ones if you like (`npm test`).
