import { vi } from 'vitest'

// Integration tests reach the sandbox database through .env.
import 'dotenv/config'

// Tests run outside React's server environment, where src/data's server-only marker would throw.
vi.mock('server-only', () => ({}))
