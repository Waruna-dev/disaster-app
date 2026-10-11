import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SplashScreen from '../../app/index';
import LoginScreen from '../../app/(auth)/login';
import RegisterScreen from '../../app/(auth)/register';
import ForgotPasswordScreen from '../../app/(auth)/forgot-password';
import CreateReportScreen from '../../app/(user)/report/create';
import EditProfileScreen from '../../app/(user)/edit-profile';
import CreateAlertScreen from '../../app/(DMC)/create-alert';
import IncidentDetailScreen from '../../app/(DMC)/incident/[id]';
import { AuthProvider } from '../../context/AuthContext';
import * as authService from '../../services/authService';
import * as reportService from '../../services/reportService';
import * as userService from '../../services/userService';
import * as alertService from '../../services/alertService';
import * as reviewActions from '../../services/reportReviewActions';
import { renderWithAuth, OFFICER } from '../helpers/renderWithAuth';
import { fbAuth, fs, mockRouter, setParams } from '../helpers/firebaseMocks';
import { ts } from '../helpers/factories';
import en from '../../i18n/locales/en.json';

let alertSpy: jest.SpyInstance;
let logSpies: jest.SpyInstance[];
beforeEach(() => {
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  logSpies = (['log', 'warn', 'info', 'error'] as const).map((m) => jest.spyOn(console, m).mockImplementation(() => undefined));
});
afterEach(() => {
  alertSpy.mockRestore();
  logSpies.forEach((s) => s.mockRestore());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const lastAlert = () => alertSpy.mock.calls.at(-1) as [string, string, any[]?];
async function pressAlertButton(label: string) {
  const buttons = lastAlert()[2] as { text: string; onPress?: () => any }[];
  await act(async () => {
    await buttons.find((b) => b.text === label)!.onPress?.();
  });
}

describe('Splash (app/index) routing', () => {
  // 2.5s splash, re-render into the loading step, then the 1.5s redirect delay.
  // Separate act() calls so React commits the first step before the second timer is armed.
  async function passSplashTimers() {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(2500);
    });
    await act(async () => {
      await jest.advanceTimersByTimeAsync(1500);
    });
  }

  // Splash reads auth from context; mount it inside the provider.
  const render2 = (ui: React.ReactElement) => render(<AuthProvider>{ui}</AuthProvider>);

  it.each([
    ['first launch → onboarding', {}, '/(auth)/onboarding'],
    ['onboarded, no language → language-select', { hasSeenOnboarding: 'true' }, '/(auth)/language-select'],
    ['language chosen, no welcome → welcome', { hasSeenOnboarding: 'true', hasSelectedLanguage: 'true' }, '/(auth)/welcome'],
    ['returning user → login', { hasSeenOnboarding: 'true', hasSelectedLanguage: 'true', hasSeenWelcome: 'true' }, '/(auth)/login'],
  ])('signed out: %s', async (_l, storage, target) => {
    for (const [k, v] of Object.entries(storage)) await AsyncStorage.setItem(k, v as string);
    jest.useFakeTimers();
    await render2(<SplashScreen />);
    await act(async () => fbAuth.__setUser(null));
    await passSplashTimers();
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith(target));
  });

  it('signed in → straight to the resident home tabs', async () => {
    jest.useFakeTimers();
    await render2(<SplashScreen />);
    await act(async () => fbAuth.__setUser({ uid: 'u1' }));
    await passSplashTimers();
    expect(mockRouter.replace).toHaveBeenCalledWith('/(user)/(tabs)');
  });

  it('falls back to onboarding if storage throws', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk'));
    jest.useFakeTimers();
    await render2(<SplashScreen />);
    await act(async () => fbAuth.__setUser(null));
    await passSplashTimers();
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/onboarding'));
  });
});

describe('Login', () => {
  const fill = async (email: string, password: string) => {
    await fireEvent.changeText(screen.getByPlaceholderText(en.login.emailPlaceholder), email);
    await fireEvent.changeText(screen.getByPlaceholderText(en.login.passwordPlaceholder), password);
  };

  it.each([
    ['empty fields', '', ''],
    ['bad email', 'not-an-email', 'pw'],
  ])('rejects %s without calling Firebase', async (_l, email, pw) => {
    const spy = jest.spyOn(authService, 'loginUser');
    await render(<LoginScreen />);
    await fill(email, pw);
    await fireEvent.press(screen.getByText(en.login.loginButton));
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(spy).not.toHaveBeenCalled();
  });

  it.failing('KNOWN BUG: a malformed email shows the raw key "register.invalidEmail" instead of a message', async () => {
    await render(<LoginScreen />);
    await fill('not-an-email', 'pw');
    await fireEvent.press(screen.getByText(en.login.loginButton));
    expect(lastAlert()[1]).toBe('Invalid email address format.');
  });

  it('logs in, remembers the email, and routes home', async () => {
    const spy = jest.spyOn(authService, 'loginUser').mockResolvedValue({} as any);
    await render(<LoginScreen />);
    await fill('  ann@example.com ', 'Secret#1');
    await fireEvent.press(screen.getByText(en.login.rememberMe));
    await fireEvent.press(screen.getByText(en.login.loginButton));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(user)/(tabs)'));
    expect(spy).toHaveBeenCalledWith('ann@example.com', 'Secret#1');
    expect(await AsyncStorage.getItem('rememberedEmail')).toBe('ann@example.com');
  });

  it('prefills a remembered email and forgets it when unticked', async () => {
    await AsyncStorage.setItem('rememberedEmail', 'old@example.com');
    jest.spyOn(authService, 'loginUser').mockResolvedValue({} as any);
    await render(<LoginScreen />);
    await waitFor(() => expect(screen.getByDisplayValue('old@example.com')).toBeTruthy());
    await fireEvent.changeText(screen.getByPlaceholderText(en.login.passwordPlaceholder), 'pw');
    await fireEvent.press(screen.getByText(en.login.rememberMe)); // untick
    await fireEvent.press(screen.getByText(en.login.loginButton));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
    expect(await AsyncStorage.getItem('rememberedEmail')).toBeNull();
  });

  it('shows a generic failure without revealing which field was wrong', async () => {
    jest.spyOn(authService, 'loginUser').mockRejectedValue({ code: 'auth/user-not-found' });
    await render(<LoginScreen />);
    await fill('ann@example.com', 'wrong');
    await fireEvent.press(screen.getByText(en.login.loginButton));
    await waitFor(() => expect(lastAlert()).toEqual(['Login Failed', 'Invalid email or password.']));
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('links to forgot-password and register', async () => {
    await render(<LoginScreen />);
    await fireEvent.press(screen.getByText(en.login.forgotPassword));
    await fireEvent.press(screen.getByText(en.login.register));
    expect(mockRouter.push.mock.calls.map((c) => c[0])).toEqual(['/(auth)/forgot-password', '/(auth)/register']);
  });
});

describe('Register', () => {
  const valid = { name: 'Ann Perera', email: 'ann@example.com', phone: '0712345678', pw: 'Secret#123' };

  async function fill(v: Partial<typeof valid> & { confirm?: string } = {}) {
    const f = { ...valid, ...v };
    await fireEvent.changeText(screen.getByPlaceholderText(en.register.fullNamePlaceholder), f.name);
    await fireEvent.changeText(screen.getByPlaceholderText(en.register.emailPlaceholder), f.email);
    await fireEvent.changeText(screen.getByPlaceholderText('0712345678'), f.phone);
    await fireEvent.changeText(screen.getByPlaceholderText(en.register.passwordPlaceholder), f.pw);
    await fireEvent.changeText(screen.getByPlaceholderText(en.register.confirmPasswordPlaceholder), v.confirm ?? f.pw);
  }
  const agree = () => fireEvent.press(screen.getByText(en.register.terms));
  // "Create account" is both the card title and the button label; the button is last.
  const submit = () => fireEvent.press(screen.getAllByText(en.register.createAccount).at(-1)!);

  const BAD_INPUTS = [
    ['bad email', { email: 'nope' }, 'Invalid email address format.'],
    ['bad phone', { phone: '12345' }, 'Please enter a valid Sri Lankan phone number (e.g., 0712345678 or +94712345678).'],
    ['short password', { pw: 'Ab1!' }, 'Password must be at least 8 characters.'],
    ['no uppercase', { pw: 'secret#123' }, 'Password must contain at least one uppercase letter.'],
    ['no lowercase', { pw: 'SECRET#123' }, 'Password must contain at least one lowercase letter.'],
    ['no number', { pw: 'Secret#abc' }, 'Password must contain at least one number.'],
    ['no special char', { pw: 'Secret1234' }, 'Password must contain at least one special character.'],
  ] as const;

  it('blocks missing fields', async () => {
    const spy = jest.spyOn(authService, 'registerUser');
    await render(<RegisterScreen />);
    await fill({ name: '' });
    await agree();
    await submit();
    expect(lastAlert()).toEqual([en.register.error, en.register.fillFields]);
    expect(spy).not.toHaveBeenCalled();
  });

  it.each(BAD_INPUTS)('blocks %s', async (_l, override) => {
    const spy = jest.spyOn(authService, 'registerUser');
    await render(<RegisterScreen />);
    await fill(override);
    await agree();
    await submit();
    expect(lastAlert()[0]).toBe(en.register.error);
    expect(spy).not.toHaveBeenCalled();
  });

  it.failing.each(BAD_INPUTS)('KNOWN BUG: %s shows a raw i18n key instead of the message', async (_l, override, message) => {
    await render(<RegisterScreen />);
    await fill(override);
    await agree();
    await submit();
    expect(lastAlert()[1]).toBe(message);
  });

  it('requires agreeing to the terms, then matching passwords', async () => {
    const spy = jest.spyOn(authService, 'registerUser');
    await render(<RegisterScreen />);
    await fill();
    await submit();
    expect(lastAlert()[1]).toBe(en.register.agreeRequired);
    await fill({ confirm: 'Different#1' });
    await agree();
    await submit();
    expect(lastAlert()[1]).toBe(en.register.passwordMismatch);
    expect(spy).not.toHaveBeenCalled();
  });

  it('creates the account with trimmed values and routes home', async () => {
    const spy = jest.spyOn(authService, 'registerUser').mockResolvedValue({} as any);
    await render(<RegisterScreen />);
    await fill({ name: '  Ann Perera ', email: ' ann@example.com ', phone: '+94712345678' });
    await agree();
    await submit();
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(user)/(tabs)'));
    expect(spy).toHaveBeenCalledWith('ann@example.com', valid.pw, 'Ann Perera', '+94712345678');
  });

  it('explains an email that is already registered', async () => {
    jest.spyOn(authService, 'registerUser').mockRejectedValue({ code: 'auth/email-already-in-use' });
    await render(<RegisterScreen />);
    await fill();
    await agree();
    await submit();
    await waitFor(() => expect(lastAlert()).toEqual([en.register.errorRegistering, en.register.emailInUse]));
  });
});

describe('Forgot password', () => {
  it('requires an email', async () => {
    const spy = jest.spyOn(authService, 'resetPassword');
    await render(<ForgotPasswordScreen />);
    await fireEvent.press(screen.getByText(en.forgotPassword.sendLink));
    expect(lastAlert()).toEqual([en.forgotPassword.error, en.forgotPassword.enterEmail]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('sends the reset link and goes back', async () => {
    const spy = jest.spyOn(authService, 'resetPassword').mockResolvedValue();
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText(en.forgotPassword.emailPlaceholder), ' ann@example.com ');
    await fireEvent.press(screen.getByText(en.forgotPassword.sendLink));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith('ann@example.com');
    expect(lastAlert()[0]).toBe(en.forgotPassword.linkSent);
  });

  it('shows Firebase errors', async () => {
    jest.spyOn(authService, 'resetPassword').mockRejectedValue(new Error('auth/invalid-email'));
    await render(<ForgotPasswordScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText(en.forgotPassword.emailPlaceholder), 'x@y.z');
    await fireEvent.press(screen.getByText(en.forgotPassword.sendLink));
    await waitFor(() => expect(lastAlert()).toEqual([en.forgotPassword.error, 'auth/invalid-email']));
  });
});

describe('Create report (resident)', () => {
  beforeEach(() => {
    setParams({ lat: '6.95', lng: '79.92', address: 'Kelaniya Bridge' });
    jest.spyOn(userService, 'getUserProfile').mockResolvedValue({ contactNumber: '0712345678' });
  });

  it('validates required fields in order (manual-entry mode, no map pin)', async () => {
    setParams({});
    const spy = jest.spyOn(reportService, 'createReport');
    await renderWithAuth(<CreateReportScreen />);
    await waitFor(() => expect(screen.getByText('0712345678')).toBeTruthy()); // contact prefilled from profile
    await fireEvent.changeText(screen.getByPlaceholderText(en.reportCreate.enterAffectedArea), '');
    await fireEvent.press(screen.getByText(en.reportCreate.submitReport));
    expect(lastAlert()[1]).toBe(en.reportCreate.provideArea);
    await fireEvent.changeText(screen.getByPlaceholderText(en.reportCreate.enterAffectedArea), 'Kelaniya');
    await fireEvent.press(screen.getByText(en.reportCreate.submitReport));
    expect(lastAlert()[1]).toBe('Please select at least one affected item.');
    await fireEvent.press(screen.getByText('Road'));
    await fireEvent.press(screen.getByText(en.reportCreate.submitReport));
    expect(lastAlert()[1]).toBe(en.reportCreate.enterDescription);
    expect(spy).not.toHaveBeenCalled();
  });

  it('submits a geotagged report and routes to the success screen', async () => {
    const spy = jest.spyOn(reportService, 'createReport').mockResolvedValue('REP-12345');
    await renderWithAuth(<CreateReportScreen />);
    await waitFor(() => expect(screen.getByText('0712345678')).toBeTruthy());
    expect(screen.getByText('Kelaniya Bridge')).toBeTruthy(); // read-only location from the map pin
    await fireEvent.press(screen.getByText('Home'));
    await fireEvent.press(screen.getByText('People'));
    await fireEvent.changeText(screen.getByPlaceholderText(en.reportCreate.describeHappening), ' Water at knee level ');
    await fireEvent.press(screen.getByText(en.reportCreate.landslide));
    await fireEvent.press(screen.getByText(en.reportCreate.submitReport));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith({
      userId: OFFICER.uid,
      disasterType: 'landslide',
      affectedArea: 'Kelaniya Bridge',
      description: 'Water at knee level',
      contactNumber: '0712345678',
      affectedItems: ['Home', 'People'],
      photoUrls: [],
      latitude: 6.95,
      longitude: 79.92,
    });
    expect(mockRouter.replace.mock.calls[0][0]).toMatchObject({
      pathname: '/(user)/report/success',
      params: { referenceNumber: 'REP-12345', disasterType: 'landslide', affectedArea: 'Kelaniya Bridge' },
    });
  });

  it('shows the error and stays put when submission fails', async () => {
    jest.spyOn(reportService, 'createReport').mockRejectedValue(new Error('permission-denied'));
    await renderWithAuth(<CreateReportScreen />);
    await waitFor(() => expect(screen.getByText('0712345678')).toBeTruthy());
    await fireEvent.press(screen.getByText('Road'));
    await fireEvent.changeText(screen.getByPlaceholderText(en.reportCreate.describeHappening), 'x');
    await fireEvent.press(screen.getByText(en.reportCreate.submitReport));
    await waitFor(() => expect(lastAlert()).toEqual([en.reportCreate.submissionFailed, 'permission-denied']));
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

describe('Edit profile → delete account', () => {
  it('deletes Firestore data, then the auth account, then routes to register', async () => {
    jest.spyOn(userService, 'getUserProfile').mockResolvedValue({ fullName: 'Ann' });
    const order: string[] = [];
    jest.spyOn(userService, 'deleteUserData').mockImplementation(async () => void order.push('data'));
    jest.spyOn(authService, 'deleteUserAccount').mockImplementation(async () => void order.push('auth'));
    await renderWithAuth(<EditProfileScreen />);
    await fireEvent.press(await screen.findByText(en.editProfile.deleteAccount));
    await pressAlertButton(en.editProfile.delete);
    expect(order).toEqual(['data', 'auth']);
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/register');
  });

  it('asks for a fresh login when Firebase requires recent auth', async () => {
    jest.spyOn(userService, 'getUserProfile').mockResolvedValue({ fullName: 'Ann' });
    jest.spyOn(userService, 'deleteUserData').mockResolvedValue();
    jest.spyOn(authService, 'deleteUserAccount').mockRejectedValue({ code: 'auth/requires-recent-login' });
    await renderWithAuth(<EditProfileScreen />);
    await fireEvent.press(await screen.findByText(en.editProfile.deleteAccount));
    await pressAlertButton(en.editProfile.delete);
    expect(lastAlert()[1]).toBe(en.editProfile.reloginDelete);
  });

  it.failing(
    'KNOWN BUG: if the auth deletion needs a recent login, the Firestore profile has ALREADY been deleted (data deleted before auth)',
    async () => {
      jest.spyOn(userService, 'getUserProfile').mockResolvedValue({ fullName: 'Ann' });
      const dataSpy = jest.spyOn(userService, 'deleteUserData').mockResolvedValue();
      jest.spyOn(authService, 'deleteUserAccount').mockRejectedValue({ code: 'auth/requires-recent-login' });
      await renderWithAuth(<EditProfileScreen />);
      await fireEvent.press(await screen.findByText(en.editProfile.deleteAccount));
      await pressAlertButton(en.editProfile.delete);
      // Expected: nothing destroyed when the operation as a whole failed.
      expect(dataSpy).not.toHaveBeenCalled();
    }
  );
});

describe('DMC: create public warning', () => {
  beforeEach(() => setParams({}));

  it.each([
    ['title', {}, 'Please enter a warning title.'],
    ['affected area', { title: 'Flood' }, 'Please enter the affected area.'],
    ['message', { title: 'Flood', area: 'Kelaniya' }, 'Please enter a warning message.'],
  ])('requires a %s', async (_l, v: any, message) => {
    const spy = jest.spyOn(alertService, 'createWarning');
    await renderWithAuth(<CreateAlertScreen />);
    if (v.title) await fireEvent.changeText(screen.getByPlaceholderText('e.g. Flood Warning'), v.title);
    if (v.area) await fireEvent.changeText(screen.getByPlaceholderText('e.g. Negombo'), v.area);
    await fireEvent.press(screen.getByText('Create Warning'));
    expect(lastAlert()).toEqual(['Required field', message]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('publishes a warning as the signed-in officer and returns to the list', async () => {
    const spy = jest.spyOn(alertService, 'createWarning').mockResolvedValue('w-new');
    await renderWithAuth(<CreateAlertScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Flood Warning'), ' River overflow ');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Negombo'), ' Kelaniya ');
    await fireEvent.changeText(screen.getByPlaceholderText('Describe the situation and any instructions for residents.'), ' Move to higher ground ');
    await fireEvent.press(screen.getByText('Create Warning'));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const data = spy.mock.calls[0][0];
    expect(data).toMatchObject({ title: 'River overflow', affectedArea: 'Kelaniya', message: 'Move to higher ground', createdBy: OFFICER.uid });
    expect(data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(lastAlert()[0]).toBe('Warning created');
    await pressAlertButton('OK');
    expect(mockRouter.replace).toHaveBeenCalledWith('/(DMC)/alerts');
  });

  it('reports a failed publish', async () => {
    jest.spyOn(alertService, 'createWarning').mockRejectedValue(new Error('Missing or insufficient permissions.'));
    await renderWithAuth(<CreateAlertScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Flood Warning'), 'T');
    await fireEvent.changeText(screen.getByPlaceholderText('e.g. Negombo'), 'A');
    await fireEvent.changeText(screen.getByPlaceholderText('Describe the situation and any instructions for residents.'), 'M');
    await fireEvent.press(screen.getByText('Create Warning'));
    await waitFor(() => expect(lastAlert()).toEqual(['Failed to create warning', 'Missing or insufficient permissions.']));
  });
});

describe('DMC: report detail review', () => {
  const pending = {
    status: 'Pending',
    disasterType: 'flood',
    affectedArea: 'Kelaniya',
    description: 'Water rising',
    referenceNumber: 'REP-11111',
    userId: 'u1',
    createdAt: ts(Date.now() - 3_600_000),
  };

  it('shows Approve/Reject for a pending report and approves through the dialog', async () => {
    setParams({ id: 'r1' });
    const spy = jest.spyOn(reviewActions, 'approveReport').mockResolvedValue();
    await renderWithAuth(<IncidentDetailScreen />);
    await act(async () => fs.__emit('reports/r1', { id: 'r1', data: pending }));
    await fireEvent.press(screen.getByText('Approve'));
    expect(screen.getByText('Approve this report?')).toBeTruthy();
    const approveButtons = screen.getAllByText('Approve');
    await fireEvent.press(approveButtons.at(-1)!);
    await waitFor(() => expect(spy).toHaveBeenCalledWith('r1', OFFICER.uid));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalled());
  });

  it('hides review actions once a report is decided', async () => {
    setParams({ id: 'r1' });
    await renderWithAuth(<IncidentDetailScreen />);
    await act(async () => fs.__emit('reports/r1', { id: 'r1', data: { ...pending, status: 'Rejected', rejectionReason: 'Duplicate' } }));
    expect(screen.queryByText('Approve')).toBeNull();
    expect(screen.getByText('Rejected')).toBeTruthy();
  });
});
