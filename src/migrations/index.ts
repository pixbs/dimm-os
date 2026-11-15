import * as migration_20261115_001553_initial from './20261115_001553_initial';

export const migrations = [
  {
    up: migration_20261115_001553_initial.up,
    down: migration_20261115_001553_initial.down,
    name: '20261115_001553_initial'
  },
];
