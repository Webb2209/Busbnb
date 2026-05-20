/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/src/__tests__/**/*.test.ts'],
  transform: {
    '^.+\.tsx?$': ['ts-jest', { tsconfig: { esModuleInterop: true } }],
  },
  moduleNameMapper: {
    // Map bare imports to src paths if needed
  },
  // Collect coverage from the main source files
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',  // Entry point \u2014 not unit testable
  ],
  coverageThreshold: {
    global: {
      lines: 35,
    },
  },
  // Give each test file a generous timeout (DB + Redis ops)
  testTimeout: 15000,
  // Force Jest to exit after all tests complete — prevents hanging due to open
  // handles (e.g. the cron job timer in seatLock.service.ts)
  forceExit: true,
};
