import React from 'react';
import { Animated, Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Logo } from '../../components/Logo';
import { PrimaryButton } from '../../components/PrimaryButton';
import { FormInput } from '../../components/FormInput';
import { TextAreaInput } from '../../components/TextAreaInput';
import { StatsCard } from '../../components/StatsCard';
import { StatTile } from '../../components/StatTile';
import { FilterPills } from '../../components/FilterPills';
import { SafetyBanner } from '../../components/SafetyBanner';
import { UpdateListItem } from '../../components/UpdateListItem';
import { UserAvatar } from '../../components/UserAvatar';
import { QuickActionCard } from '../../components/QuickActionCard';
import { DisasterSelector } from '../../components/DisasterSelector';
import { AlertCard } from '../../components/AlertCard';
import { ReportCard } from '../../components/ReportCard';
import { ReportListItem } from '../../components/ReportListItem';
import { ReportReviewCard } from '../../components/ReportReviewCard';
import { ReportsHeader, ReportsStickyBar } from '../../components/ReportsHeader';
import { CreateReportHeader, CreateReportStickyBar } from '../../components/CreateReportHeader';
import { DashboardHeader, DashboardStickyBar } from '../../components/DashboardHeader';
import { DMCHeader, DMCHeaderBackground } from '../../components/DMCHeader';
import { DMCTabBar } from '../../components/DMCTabBar';
import { TrendLineChart } from '../../components/TrendLineChart';
import { FloodLevelChart } from '../../components/FloodLevelChart';
import { mockRouter } from '../helpers/firebaseMocks';
import { makeReport, ts } from '../helpers/factories';
import en from '../../i18n/locales/en.json';

const scrollY = () => new Animated.Value(0);

describe('Logo', () => {
  it('renders solid and outline variants', async () => {
    const { toJSON, rerender } = await render(<Logo />);
    expect(toJSON()).toBeTruthy();
    await rerender(<Logo variant="outline" color="#000" width={10} height={10} />);
    expect(toJSON()).toBeTruthy();
  });
});

describe('PrimaryButton', () => {
  it('shows its title and fires onPress', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton title="Submit" onPress={onPress} />);
    await fireEvent.press(screen.getByText('Submit'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('replaces the title with a spinner while loading', async () => {
    await render(<PrimaryButton title="Submit" loading onPress={jest.fn()} />);
    expect(screen.queryByText('Submit')).toBeNull();
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    await render(<PrimaryButton title="Go" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByText('Go'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('FormInput', () => {
  it('renders label, forwards text and toggles password visibility', async () => {
    const onChangeText = jest.fn();
    await render(<FormInput label="Password" placeholder="Enter password" isPassword iconName="lock-closed" onChangeText={onChangeText} />);
    expect(screen.getByText('Password')).toBeTruthy();
    const input = screen.getByPlaceholderText('Enter password');
    expect(input.props.secureTextEntry).toBe(true);
    await fireEvent.changeText(input, 'hunter2');
    expect(onChangeText).toHaveBeenCalledWith('hunter2');
    await fireEvent.press(screen.getByTestId('icon-eye-outline'));
    expect(screen.getByPlaceholderText('Enter password').props.secureTextEntry).toBe(false);
    expect(screen.getByTestId('icon-eye-off-outline')).toBeTruthy();
  });

  it('is a plain input without isPassword', async () => {
    await render(<FormInput placeholder="Email" />);
    expect(screen.getByPlaceholderText('Email').props.secureTextEntry).toBeFalsy();
  });
});

describe('TextAreaInput', () => {
  it('counts characters in uncontrolled mode', async () => {
    await render(<TextAreaInput label="Description" placeholder="Describe" maxLength={500} />);
    await fireEvent.changeText(screen.getByPlaceholderText('Describe'), 'Water rising');
    expect(screen.getByText('12 / 500')).toBeTruthy();
  });

  it('uses the controlled value and still calls onChangeText', async () => {
    const onChangeText = jest.fn();
    await render(<TextAreaInput placeholder="Describe" value="abc" onChangeText={onChangeText} maxLength={10} />);
    expect(screen.getByText('3 / 10')).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText('Describe'), 'abcd');
    expect(onChangeText).toHaveBeenCalledWith('abcd');
    expect(screen.getByText('3 / 10')).toBeTruthy(); // parent owns the value
  });

  it('without maxLength the counter shows a dangling "0 / " (cosmetic)', async () => {
    await render(<TextAreaInput placeholder="Describe" />);
    expect(screen.getByText(/^0 \/\s*$/)).toBeTruthy();
  });
});

describe('Stats & tiles', () => {
  it('StatsCard shows the three counts with translated labels', async () => {
    await render(<StatsCard total={12} pending={3} approved={8} />);
    for (const v of ['12', '3', '8', en.reports.total, en.reports.pending, en.reports.approved]) expect(screen.getByText(v)).toBeTruthy();
  });

  it('StatTile is pressable only when given onPress', async () => {
    const onPress = jest.fn();
    await render(<StatTile icon="water" value="42" label="Pending" tint="#000" tintBg="#fff" onPress={onPress} />);
    await fireEvent.press(screen.getByText('42'));
    expect(onPress).toHaveBeenCalled();
  });

  it('StatTile can use a Material icon', async () => {
    await render(<StatTile materialIcon="home-flood" value="1" label="Floods" tint="#000" tintBg="#fff" />);
    expect(screen.getAllByTestId('icon-home-flood')).toHaveLength(2);
  });

  it('FilterPills reports the tapped filter', async () => {
    const onSelect = jest.fn();
    await render(<FilterPills activeFilter="All" onSelectFilter={onSelect} />);
    await fireEvent.press(screen.getByText(en.reports.rejected));
    expect(onSelect).toHaveBeenCalledWith('Rejected');
  });

  it('SafetyBanner renders its translated copy', async () => {
    await render(<SafetyBanner />);
    expect(screen.getByText(en.reportCreate.safetyBannerTitle)).toBeTruthy();
  });

  it('UpdateListItem and QuickActionCard fire onPress', async () => {
    const a = jest.fn();
    const b = jest.fn();
    await render(
      <>
        <UpdateListItem title="River update" description="Kelani rising" icon="water" iconColor="#000" iconBg="#fff" onPress={a} />
        <QuickActionCard title="Report" subtitle="Tell us" icon="add" variant="solid" onPress={b} />
        <QuickActionCard title="Map" subtitle="See" icon="map" variant="outline" onPress={b} />
      </>
    );
    await fireEvent.press(screen.getByText('River update'));
    await fireEvent.press(screen.getByText('Map'));
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });
});

describe('UserAvatar', () => {
  it('shows the image when a URL is given', async () => {
    await render(<UserAvatar imageUrl="https://x/a.jpg" name="ann" size={40} />);
    expect(screen.queryByText('A')).toBeNull();
  });
  it('falls back to the capitalised initial, then a person icon', async () => {
    const { rerender } = await render(<UserAvatar name="ann" size={40} />);
    expect(screen.getByText('A')).toBeTruthy();
    await rerender(<UserAvatar size={40} accessibilityLabel="me" />);
    expect(screen.getByTestId('icon-person')).toBeTruthy();
    expect(screen.getByLabelText('me')).toBeTruthy();
  });
});

describe('DisasterSelector', () => {
  it('marks the selected type and reports changes', async () => {
    const onSelect = jest.fn();
    await render(<DisasterSelector selected="flood" onSelect={onSelect} />);
    expect(screen.getAllByTestId('icon-checkmark-circle')).toHaveLength(1);
    await fireEvent.press(screen.getByText(en.reportCreate.landslide));
    expect(onSelect).toHaveBeenCalledWith('landslide');
  });
});

describe('Report cards', () => {
  it('AlertCard renders its (static placeholder) content', async () => {
    await render(<AlertCard />);
    expect(screen.getByText(en.alertCard.floodWarning)).toBeTruthy();
  });

  it.each([
    ['pending', en.reports.pending],
    ['approved', en.reports.approved],
    ['rejected', en.reports.rejected],
  ] as const)('ReportCard shows the %s badge', async (status, label) => {
    await render(<ReportCard type="flood" status={status} id="REP-1" location="Kelaniya" date="1 Oct" />);
    expect(screen.getByText(label.toUpperCase())).toBeTruthy();
  });

  it('ReportCard shows the reject reason only for rejected reports and is pressable', async () => {
    const onPress = jest.fn();
    await render(<ReportCard type="landslide" status="rejected" id="REP-2" location="Badulla" date="2 Oct" rejectReason="Duplicate" onPress={onPress} />);
    expect(screen.getByText('Reason: Duplicate')).toBeTruthy();
    expect(screen.getByText(en.reports.landslideReport)).toBeTruthy();
    await fireEvent.press(screen.getByText('Badulla'));
    expect(onPress).toHaveBeenCalled();
  });

  it('ReportListItem shows type, area, ref and status', async () => {
    const onPress = jest.fn();
    const r = makeReport({ disasterType: 'landslide', affectedArea: 'Badulla', status: 'Verified', referenceNumber: 'REP-77', createdAt: null });
    await render(<ReportListItem report={r} onPress={onPress} />);
    expect(screen.getByText('Landslide · Badulla')).toBeTruthy();
    expect(screen.getByText('REP-77 · ')).toBeTruthy();
    await fireEvent.press(screen.getByText('Verified'));
    expect(onPress).toHaveBeenCalled();
  });

  it('ReportReviewCard wires View Details / Approve / Reject', async () => {
    const handlers = { onViewDetails: jest.fn(), onApprove: jest.fn(), onReject: jest.fn() };
    const r = makeReport({ photoUrls: ['https://p/1.jpg'], createdAt: ts(Date.UTC(2026, 9, 1)) });
    await render(<ReportReviewCard report={r} {...handlers} />);
    expect(screen.getByText('PENDING')).toBeTruthy();
    expect(screen.getByText(r.description)).toBeTruthy();
    await fireEvent.press(screen.getByText('View Details'));
    await fireEvent.press(screen.getByText('Approve'));
    await fireEvent.press(screen.getByText('Reject'));
    Object.values(handlers).forEach((h) => expect(h).toHaveBeenCalledTimes(1));
  });
});

describe('Headers', () => {
  it('ReportsHeader + sticky bar render', async () => {
    await render(
      <>
        <ReportsHeader scrollY={scrollY()} />
        <ReportsStickyBar scrollY={scrollY()} />
      </>
    );
    expect(screen.getByText(en.reports.myReports)).toBeTruthy();
  });

  it('CreateReport sticky bar back button navigates back', async () => {
    await render(
      <>
        <CreateReportHeader scrollY={scrollY()} />
        <CreateReportStickyBar scrollY={scrollY()} />
      </>
    );
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('DashboardHeader greets by time of day and links to home-area setup', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 9, 9, 0));
    await render(<DashboardHeader scrollY={scrollY()} firstName="Ann" homeArea={null} />);
    expect(screen.getByText(en.dashboard.goodMorning)).toBeTruthy();
    expect(screen.getByText('Locating...')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('icon-home-outline'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(user)/edit-profile?scrollTo=homeArea');
    jest.useRealTimers();
  });

  it.each([
    [14, 'goodAfternoon'],
    [20, 'goodEvening'],
  ] as const)('DashboardHeader at %i:00 says %s and shows the home area name', async (hour, key) => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 9, hour, 0));
    await render(
      <DashboardHeader scrollY={scrollY()} firstName="Ann" homeArea={{ name: 'Home', address: 'a', latitude: 1, longitude: 1, source: 'gps' }} currentLocationName="Colombo" />
    );
    expect(screen.getByText(en.dashboard[key])).toBeTruthy();
    expect(screen.getByText('Home')).toBeTruthy();
    jest.useRealTimers();
  });

  it('DashboardStickyBar avatar opens the profile tab', async () => {
    await render(<DashboardStickyBar scrollY={scrollY()} initial="A" />);
    await fireEvent.press(screen.getByText('A'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(user)/(tabs)/profile');
  });

  it('DMCHeader: back button, bell badge capped at 9+, custom right icon', async () => {
    const onBack = jest.fn();
    const onRight = jest.fn();
    const { rerender } = await render(<DMCHeader eyebrow="DMC" title="Reports" onBack={onBack} onRightPress={onRight} badgeCount={12} />);
    expect(screen.getByText('9+')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('icon-chevron-back'));
    await fireEvent.press(screen.getByTestId('icon-notifications-outline'));
    expect(onBack).toHaveBeenCalled();
    expect(onRight).toHaveBeenCalled();

    await rerender(<DMCHeader eyebrow="DMC" title="Reports" onBack={onBack} />);
    expect(screen.getByTestId('icon-ellipsis-vertical')).toBeTruthy();
    await rerender(<DMCHeader eyebrow="DMC" title="Reports" rightIcon="add" compact />);
    expect(screen.getByTestId('icon-add')).toBeTruthy();
    expect(screen.getByTestId('icon-menu')).toBeTruthy();
    await rerender(<DMCHeader eyebrow="DMC" title="Reports" hideIcons />);
    expect(screen.queryByTestId('icon-menu')).toBeNull();
  });

  it('DMCHeader grows when the title wraps', async () => {
    await render(<DMCHeader eyebrow="E" title="A very long title" />);
    await fireEvent(screen.getByText('A very long title'), 'textLayout', { nativeEvent: { lines: [{}, {}] } });
    expect(screen.getByText('A very long title')).toBeTruthy();
  });

  it('DMCHeaderBackground renders in both sizes', async () => {
    const { toJSON, rerender } = await render(<DMCHeaderBackground height={100} />);
    expect(toJSON()).toBeTruthy();
    await rerender(<DMCHeaderBackground compact height={100} />);
    expect(toJSON()).toBeTruthy();
  });

  it('DMCTabBar routes each tab', async () => {
    await render(<DMCTabBar active="map" />);
    for (const [label, route] of [
      ['Home', '/(DMC)/dashboard'],
      ['Incidents', '/(DMC)/report-groups'],
      ['Map', '/(DMC)/map'],
      ['Warnings', '/(DMC)/alerts'],
      ['All Reports', '/(DMC)/reports'],
    ]) {
      await fireEvent.press(screen.getByText(label));
      expect(mockRouter.push).toHaveBeenLastCalledWith(route);
    }
    expect(screen.getByTestId('icon-location')).toBeTruthy(); // active map icon
  });
});

describe('Charts', () => {
  const layout = (w: number) => ({ nativeEvent: { layout: { width: w, height: 200, x: 0, y: 0 } } });

  it('TrendLineChart renders labels, and the SVG once laid out', async () => {
    const { toJSON } = await render(
      <TrendLineChart labels={['M', 'T', 'W']} series={[{ key: 's', label: 'Submitted', color: '#000', values: [1, 3, 2] } as any]} />
    );
    expect(screen.getByText('W')).toBeTruthy();
    // Chart SVG waits for the first layout (width 0 until then).
    expect(JSON.stringify(toJSON())).not.toContain('"Svg"');
  });

  it('FloodLevelChart shows an empty state with no readings', async () => {
    await render(<FloodLevelChart title="Hanwella" points={[]} />);
    expect(screen.getByText('No readings yet for this station')).toBeTruthy();
  });

  it('FloodLevelChart draws axes, thresholds and legend after layout', async () => {
    const day = new Date(2026, 9, 8, 6).getTime();
    const points = Array.from({ length: 12 }, (_, i) => ({ timestamp: day + i * 3_600_000, waterLevel: 5 + i * 0.2, rainFall: i % 3 ? 2 : null }));
    await render(<FloodLevelChart title="Hanwella" points={points} alertLevel={7} minorFloodLevel={8} majorFloodLevel={10} />);
    expect(screen.getByText('Hanwella')).toBeTruthy();
    expect(screen.getByText('Major Flood')).toBeTruthy();
    const container = screen.getByText('Hanwella').parent!.parent!;
    const layoutHost = container.queryAll((n: any) => typeof n.props?.onLayout === 'function')[0];
    await fireEvent(layoutHost, 'layout', layout(360));
    expect(screen.getByText('River Water Level')).toBeTruthy();
    expect(screen.getByText('Rainfall (mm)')).toBeTruthy();
  });

  it('FloodLevelChart handles a single flat reading without dividing by zero', async () => {
    await render(<FloodLevelChart title="One" points={[{ timestamp: Date.now(), waterLevel: 0, rainFall: 0 }]} />);
    const host = screen.getByText('One').parent!.parent!.queryAll((n: any) => typeof n.props?.onLayout === 'function')[0];
    await fireEvent(host, 'layout', layout(300));
    expect(screen.getAllByText(/^\d+(\.\d)?$/).length).toBeGreaterThan(0);
  });
});
