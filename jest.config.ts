import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFiles: ['<rootDir>/src/__tests__/setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/afterEnv.ts'],
  globalTeardown: '<rootDir>/src/__tests__/teardown.ts',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  clearMocks: true,
  restoreMocks: true,
  maxWorkers: 1,
};

export default config;
