import { vi } from 'vitest'

// Load .env files
import 'dotenv/config'

// Tests run outside React's server environment, where src/data's server-only marker would throw.
vi.mock('server-only', () => ({}))
