// dsh-settings-tidy - Host half.
// Minimal host: the plugin is primarily a client-side UI enhancement.
// It registers no routes, no services, no credentials.

export const name = 'dsh-settings-tidy'
export const inject = []

export function apply(ctx) {
  // Nothing to do on the host side - all work is in the client bundle.
}
