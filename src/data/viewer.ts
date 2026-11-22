import 'server-only'

// Its holder is sent to the uncached pages, where its signature is read.
export const VISITOR_COOKIE = 'visitor'

// The proxy notes the address asked for here, for the not-found page, which Next.js gives no address.
export const ASKED = 'x-asked'
