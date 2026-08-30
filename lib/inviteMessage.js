const ROLE_TEXT = { read: 'view-only', edit: 'edit', admin: 'admin' }

function roleText(role) {
  return ROLE_TEXT[role] || role
}

export function buildProfileInviteMessage({ profileName, role, invitedEmail, acceptUrl }) {
  return `Hey! I'm inviting you to Personal Fin — ${roleText(role)} access to "${profileName}".\n` +
    `Open this to accept (sign in with ${invitedEmail}):\n${acceptUrl}\n\n` +
    `This link expires in 7 days.\n— Powered by Personal Fin`
}

export function buildLendInviteMessage({ personName, role, invitedEmail, acceptUrl }) {
  return `Hey! I'm inviting you to Personal Fin — ${roleText(role)} access to our lend/borrow record with ${personName}.\n` +
    `Open this to accept (sign in with ${invitedEmail}):\n${acceptUrl}\n\n` +
    `This link expires in 7 days.\n— Powered by Personal Fin`
}
