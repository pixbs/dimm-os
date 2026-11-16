import type { PayloadRequest, TypedLocale } from 'payload'

// A call given the request writes its own locale onto it, and the save around it then writes in that locale.
export const nested = (req: PayloadRequest) => ({ locale: req.locale as TypedLocale, req })
