import { useMemo, useState } from 'react';
import { CheckCheck, FileText, Lightbulb, MailWarning, Users, Building2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useUI } from '../context/UIContext';
import { ms, num } from '../lib/format';
import { downloadReportPdf } from '../lib/pdf';
import { Badge, Btn, Card, PageHeader, Select, Spinner, StatCard, Table } from '../components/ui';
import { BarCard, ColumnCard, PieCard, type Datum } from '../components/Charts';

const PERIODS: Record<string, number> = { 'All time': 0, 'Last 7 days': 7, 'Last 30 days': 30, 'Last 90 days': 90 };
const tally = <T,>(a: T[], k: (x: T) => string): Datum[] => { const m: Record<string, number> = {}; a.forEach((x) => { const key = k(x); m[key] = (m[key] || 0) + 1; }); return Object.entries(m).map(([label, value]) => ({ label, value })); };
const sumBy = <T,>(a: T[], k: (x: T) => string, v: (x: T) => number): Datum[] => { const m: Record<string, number> = {}; a.forEach((x) => { m[k(x)] = (m[k(x)] || 0) + v(x); }); return Object.entries(m).map(([label, value]) => ({ label, value })); };

export default function Reports() {
  const d = useData();
  const { toast } = useUI();
  const [period, setPeriod] = useState('All time');
  const [busy, setBusy] = useState(false);

  const a = useMemo(() => {
    const days = PERIODS[period]; const since = days ? Date.now() - days * 86400000 : 0;
    const inP = (t: Parameters<typeof ms>[0]) => !since || ms(t) >= since;
    const sReq = d.shelterRequests.filter((r) => inP(r.createdAt)), rReq = d.rescueRequests.filter((r) => inP(r.createdAt)), dist = d.distributions.filter((r) => inP(r.createdAt));
    const cap = d.shelters.reduce((s, x) => s + x.capacity, 0), occ = d.shelters.reduce((s, x) => s + x.currentOccupancy, 0), occPct = cap ? Math.round((occ / cap) * 100) : 0;
    const pendS = sReq.filter((r) => r.status === 'Pending').length, pendR = rReq.filter((r) => r.status === 'Pending').length;
    const avail = d.teams.filter((t) => t.status === 'Available').length;
    const low = d.resources.filter((r) => r.totalQuantity > 0 && r.availableQuantity / r.totalQuantity <= 0.2);
    const tight = d.shelters.filter((s) => s.status === 'Full' || s.status === 'Limited');
    const decisions: string[] = [];
    if (pendR > avail) decisions.push(`${pendR} rescue requests are pending but only ${avail} team(s) are available — mobilise additional teams or request mutual aid.`);
    else if (pendR > 0) decisions.push(`${pendR} rescue request(s) are waiting — assign available teams now.`);
    if (pendS > 0) decisions.push(`${pendS} shelter request(s) are pending — assign shelters with free capacity.`);
    if (tight.length) decisions.push(`${tight.length} shelter(s) are Limited/Full (${tight.slice(0, 3).map((s) => s.name).join(', ')}) — open overflow shelters or redirect new arrivals.`);
    if (occPct >= 80) decisions.push(`Overall shelter occupancy is ${occPct}% — plan additional capacity.`);
    if (low.length) decisions.push(`Low stock (≤20%): ${low.map((r) => r.name).join(', ')} — restock before further distribution.`);
    if (!decisions.length) decisions.push('No critical issues detected. Continue routine monitoring.');
    return { sReq, rReq, dist, cap, occ, occPct, pendS, pendR, avail, decisions, done: rReq.filter((r) => r.status === 'Completed').length,
      shelterStatus: tally(d.shelters, (x) => x.status), teamStatus: tally(d.teams, (x) => x.status), shelterReq: tally(sReq, (x) => x.status), rescueStatus: tally(rReq, (x) => x.status),
      rescueType: tally(rReq, (x) => x.requestedType), occByDistrict: sumBy(d.shelters, (x) => x.district, (x) => x.currentOccupancy), distByItem: sumBy(dist, (x) => x.resourceName, (x) => x.quantity), distDistrict: tally(dist, (x) => x.district) };
  }, [d, period]);

  const exportPdf = () => {
    try {
      setBusy(true);
      downloadReportPdf({
        title: 'Smart Disaster Early-Warning System — Operations Report', generatedAt: `${new Date().toLocaleString()} · ${period}`,
        summary: [{ label: 'Shelters', value: String(d.shelters.length) }, { label: 'Shelter Occupancy', value: `${a.occPct}%` }, { label: 'Rescue Teams', value: String(d.teams.length) }, { label: 'Pending Requests', value: String(a.pendS + a.pendR) }, { label: 'Distributions', value: String(a.dist.length) }],
        sections: [
          { title: 'Decisions & Recommended Actions', bullets: a.decisions },
          { title: 'Shelters', headers: ['Name', 'District', 'Capacity', 'Occupancy', 'Status'], rows: d.shelters.map((s) => [s.name, s.district, s.capacity, s.currentOccupancy, s.status]) },
          { title: 'Shelter Occupancy by District', bars: a.occByDistrict },
          { title: 'Rescue Teams', headers: ['Name', 'Type', 'District', 'Members', 'Status'], rows: d.teams.map((t) => [t.name, t.type, t.district, t.members, t.status]) },
          { title: 'Rescue Requests by Type', bars: a.rescueType },
          { title: 'Resource Stock', headers: ['Resource', 'Category', 'Available', 'Total', 'Unit'], rows: d.resources.map((r) => [r.name, r.category, r.availableQuantity, r.totalQuantity, r.unit]) },
          { title: 'Distribution History', headers: ['Date', 'Resource', 'Quantity', 'District'], rows: a.dist.map((x) => [x.distributionDate, x.resourceName, `${x.quantity} ${x.unit}`, x.district]) },
        ],
      }, `operations-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast('PDF report downloaded.');
    } catch (e) { toast((e as Error).message || 'Could not generate PDF', 'error'); } finally { setBusy(false); }
  };

  if (d.loading) return <Spinner />;
  return (
    <>
      <PageHeader title="Reports & Analytics" subtitle="Operational overview with charts, tables and recommended decisions."
        actions={<><div style={{ width: 170 }}><Select value={period} onChange={setPeriod} options={Object.keys(PERIODS)} /></div><Btn icon={FileText} loading={busy} onClick={exportPdf}>Generate PDF Report</Btn></>} />
      <div className="stats">
        <StatCard icon={Building2} label="Shelter Occupancy" value={`${a.occPct}%`} hint={`${num(a.occ)} of ${num(a.cap)} beds`} /><StatCard icon={Users} label="Teams Available" value={`${a.avail}/${d.teams.length}`} tone="info" />
        <StatCard icon={MailWarning} label="Pending Requests" value={a.pendS + a.pendR} tone="warning" /><StatCard icon={CheckCheck} label="Rescues Completed" value={a.done} tone="success" />
      </div>
      <Card title="Decisions & Recommended Actions" subtitle="Generated from live numbers">{a.decisions.map((x, i) => <div key={i} className="decision"><Lightbulb size={18} /><span>{x}</span></div>)}</Card>
      <div className="grid g-3">
        <Card title="Shelter Status (Pie)"><PieCard data={a.shelterStatus} /></Card><Card title="Rescue Team Status (Pie)"><PieCard data={a.teamStatus} /></Card><Card title="Shelter Requests (Pie)"><PieCard data={a.shelterReq} /></Card>
      </div>
      <div className="grid g-2"><Card title="Shelter Occupancy by District (Column)"><ColumnCard data={a.occByDistrict} /></Card><Card title="Rescue Request Progress (Column)"><ColumnCard data={a.rescueStatus} /></Card></div>
      <div className="grid g-3">
        <Card title="Rescue Requests by Type (Bar)"><BarCard data={a.rescueType} /></Card><Card title="Resources Distributed by Item (Bar)"><BarCard data={a.distByItem} /></Card><Card title="Distributions per District (Bar)"><BarCard data={a.distDistrict} /></Card>
      </div>
      <Card title="Shelters"><Table rows={d.shelters} cols={[{ key: 'name', title: 'Name', strong: true }, { key: 'district', title: 'District' }, { key: 'o', title: 'Occupancy', render: (x) => `${x.currentOccupancy}/${x.capacity}` }, { key: 's', title: 'Status', render: (x) => <Badge text={x.status} /> }]} /></Card>
      <Card title="Rescue Teams"><Table rows={d.teams} cols={[{ key: 'name', title: 'Name', strong: true }, { key: 'type', title: 'Type' }, { key: 'district', title: 'District' }, { key: 'members', title: 'Members' }, { key: 's', title: 'Status', render: (x) => <Badge text={x.status} /> }]} /></Card>
      <Card title="Resource Stock"><Table rows={d.resources} cols={[{ key: 'name', title: 'Resource', strong: true }, { key: 'category', title: 'Category' }, { key: 'availableQuantity', title: 'Available' }, { key: 'totalQuantity', title: 'Total' }, { key: 'unit', title: 'Unit' }]} /></Card>
    </>
  );
}
