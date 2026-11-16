import type { PayloadRequest } from 'payload'

import type { Visitor } from './payload-types'

declare module 'payload' {
  export interface RequestContext {
    // Whom the site's own server code reads for: a guest (null) or a visitor, who is never a Payload user.
    viewer?: null | Visitor
  }
}

export const signedIn = ({ req }: { req: PayloadRequest }) => Boolean(req.user)

export const isAdmin = ({ req }: { req: PayloadRequest }) => req.user?.role === 'admin'

// No REST, MCP or admin request can set the context, so only the site's own code names a viewer.
export const signedInOrSite = ({ req }: { req: PayloadRequest }) =>
  Boolean(req.user) || req.context.viewer !== undefined
