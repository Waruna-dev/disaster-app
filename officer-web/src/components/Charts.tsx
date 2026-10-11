import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export interface Datum { label: string; value: number; color?: string }
const PALETTE = ['#08775F', '#1D6FC4', '#F9A825', '#C62828', '#7B3FA0', '#5D8A82', '#E67E22'];
export const STATUS_COLORS: Record<string, string> = {
  Available: '#2E7D32', Limited: '#F9A825', Full: '#C62828', Closed: '#8A9C99', Pending: '#F9A825', Assigned: '#1D6FC4', Rejected: '#C62828', Completed: '#2E7D32',
  'On Mission': '#1D6FC4', Unavailable: '#8A9C99', 'On the way': '#1D6FC4', Pickup: '#7B3FA0',
};
const col = (d: Datum, i: number) => d.color ?? STATUS_COLORS[d.label] ?? PALETTE[i % PALETTE.length];
const NoData = () => <div className="empty" style={{ padding: 40 }}>No data yet</div>;

export function PieCard({ data, height = 230 }: { data: Datum[]; height?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" innerRadius={52} outerRadius={82} paddingAngle={2}>
          {data.map((d, i) => <Cell key={d.label} fill={col(d, i)} />)}
        </Pie>
        <Tooltip /><Legend verticalAlign="bottom" iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
}
export function ColumnCard({ data, height = 240 }: { data: Datum[]; height?: number }) {
  if (!data.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3ECE9" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>{data.map((d, i) => <Cell key={d.label} fill={col(d, i)} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
export function BarCard({ data, height }: { data: Datum[]; height?: number }) {
  if (!data.length) return <NoData />;
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(180, data.length * 42)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E3ECE9" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} /><Tooltip />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>{data.map((d, i) => <Cell key={d.label} fill={col(d, i)} />)}</Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
