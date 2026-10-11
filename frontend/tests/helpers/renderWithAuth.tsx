import React from 'react';
import { act, render } from '@testing-library/react-native';
import { AuthProvider } from '../../context/AuthContext';
import { fbAuth, fs } from './firebaseMocks';

export const OFFICER = { uid: 'admin-1', email: 'officer@dmc.lk', displayName: 'Officer Perera' };

/**
 * Renders inside the real AuthProvider and signs `user` in (null = signed out).
 * `profile` is pushed as the users/{uid} doc so role-gated screens see it.
 */
export async function renderWithAuth(
  ui: React.ReactElement,
  { user = OFFICER as any, profile = { fullName: 'Officer Perera', role: 'admin' } as Record<string, unknown> | null } = {}
) {
  const utils = await render(<AuthProvider>{ui}</AuthProvider>);
  await act(async () => {
    fbAuth.__setUser(user);
  });
  if (user && profile !== undefined) {
    await act(async () => {
      fs.__emit(`users/${user.uid}`, { id: user.uid, data: profile });
    });
  }
  return utils;
}
