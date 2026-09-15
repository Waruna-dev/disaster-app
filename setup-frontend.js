const fs = require('fs');
const path = require('path');
const dirs = [
  'app/(auth)', 'app/(user)/(tabs)', 'app/(user)/report', 'app/(user)/alert', 'app/(admin)/report',
  'components', 'services', 'context', 'types', 'constants', 'assets/images', 'assets/icons'
];
const files = [
  'app/_layout.tsx', 'app/index.tsx', 'app/(auth)/_layout.tsx', 'app/(auth)/login.tsx',
  'app/(auth)/register.tsx', 'app/(auth)/forgot-password.tsx', 'app/(user)/_layout.tsx',
  'app/(user)/(tabs)/_layout.tsx', 'app/(user)/(tabs)/index.tsx', 'app/(user)/(tabs)/alerts.tsx',
  'app/(user)/(tabs)/map.tsx', 'app/(user)/(tabs)/reports.tsx', 'app/(user)/(tabs)/profile.tsx',
  'app/(user)/report/create.tsx', 'app/(user)/report/success.tsx', 'app/(user)/report/[id].tsx',
  'app/(user)/alert/[id].tsx', 'app/(user)/edit-profile.tsx', 'app/(admin)/_layout.tsx',
  'app/(admin)/dashboard.tsx', 'app/(admin)/reports.tsx', 'app/(admin)/users.tsx',
  'app/(admin)/alerts.tsx', 'app/(admin)/create-alert.tsx', 'app/(admin)/report/[id].tsx',
  'components/PrimaryButton.tsx', 'components/FormInput.tsx', 'components/AlertCard.tsx',
  'components/ReportCard.tsx', 'components/StatusBadge.tsx', 'components/LoadingSpinner.tsx',
  'services/api.ts', 'services/authService.ts', 'services/reportService.ts',
  'services/alertService.ts', 'services/adminService.ts', 'context/AuthContext.tsx',
  'types/user.ts', 'types/report.ts', 'types/alert.ts', 'constants/colors.ts', 'constants/hazardTypes.ts'
];

dirs.forEach(dir => {
  fs.mkdirSync(path.join(__dirname, 'frontend', dir), { recursive: true });
});
files.forEach(file => {
  const filePath = path.join(__dirname, 'frontend', file);
  fs.writeFileSync(filePath, '// Placeholder\n');
});
console.log('Frontend setup complete.');
