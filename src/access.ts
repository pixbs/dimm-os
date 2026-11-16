import type { PayloadRequest } from 'payload'

export const signedIn = ({ req }: { req: PayloadRequest }) => Boolean(req.user)

export const isAdmin = ({ req }: { req: PayloadRequest }) => req.user?.role === 'admin'
