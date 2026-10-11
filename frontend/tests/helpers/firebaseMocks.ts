/** Typed handles onto the global firebase mocks (see tests/mocks). */
import * as firestore from 'firebase/firestore';
import * as auth from 'firebase/auth';
import * as expoRouter from 'expo-router';

type Listener = { target: { path: string }; next: (snap: unknown) => void; error?: (e: Error) => void; unsubscribe: jest.Mock };

export const fs = firestore as unknown as typeof firestore & {
  __emit: (path: string, payload: Array<Record<string, unknown>> | { id: string; data: Record<string, unknown> | null }) => void;
  __emitError: (path: string, err: Error) => void;
  __listeners: Listener[];
  __listenersFor: (path?: string) => Listener[];
  __makeDocSnap: (id: string, data: unknown) => unknown;
  __makeQuerySnap: (docs: Array<Record<string, unknown>>) => unknown;
};

export const fbAuth = auth as unknown as typeof auth & {
  __setUser: (user: unknown) => void;
  __authListeners: unknown[];
};

export const mockRouter = (expoRouter as unknown as { router: Record<string, jest.Mock> }).router;
export const setParams = (expoRouter as unknown as { __setParams: (p: Record<string, unknown>) => void }).__setParams;

export const asMock = <T extends (...args: any[]) => any>(fn: T) => fn as unknown as jest.MockedFunction<T>;
