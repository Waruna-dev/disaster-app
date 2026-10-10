import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Building2, Droplets, Package, Triangle, Users } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Badge, Btn, Card, Empty, PageHeader, Spinner, StatCard, Table } from '../components/ui';
import { MapView } from '../components/MapView';
import { fmtDateTime, num } from '../lib/format';
import { RISK_COLOR } from '../lib/constants';

const today = () => new Date().toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });

export default function Dashboard() {
  const d = useData();
  const { profile } = useAuth();
  const nav = useNavigate();
  const first = profile?.fullName?.split(' ')[0] || 'District Officer';
  const active = useMemo(() => d.warnings.filter((w) => w.status === 'Active' && (w.expiresAt?.toMillis() ?? Infinity) > Date.now()), [d.warnings]);

  const tasks = useMemo(() => {
    const t: { id: string; task: string; priority: 'High' | 'Medium'; to: string }[] = [];
    d.shelterRequests.filter((r) => r.status === 'Pending').slice(0, 3).forEach((r) => t.push({ id: 's' + r.id, task: `Assign shelter — ${r.userName || 'Resident'} (${r.peopleCount} people)`, priority: 'High', to: '/shelter-requests' }));
    d.rescueRequests.filter((r) => r.status === 'Pending').slice(0, 3).forEach((r) => t.push({ id: 'r' + r.id, task: `Assign rescue team — ${r.requestedType}`, priority: 'High', to: '/rescue-requests' }));
    d.shelters.filter((s) => s.status === 'Full' || s.status === 'Limited').slice(0, 2).forEach((s) => t.push({ id: 'h' + s.id, task: `Review shelter occupancy — ${s.name}`, priority: 'Medium', to: '/shelters' }));
    d.resources.filter((r) => r.totalQuantity > 0 && r.availableQuantity / r.totalQuantity <= 0.2).slice(0, 2).forEach((r) => t.push({ id: 'x' + r.id, task: `Restock / confirm dispatch — ${r.name}`, priority: 'Medium', to: '/resources' }));
    return t.slice(0, 6);
  }, [d.shelterRequests, d.rescueRequests, d.shelters, d.resources]);

  if (d.loading) return <Spinner />;
  return (
    <>
      <PageHeader title={`Welcome, ${first}`} subtitle="Coordinate resources and support disaster response." />
      <div className="stats">
        <StatCard icon={Building2} label="Total Shelters" value={d.shelters.length} onClick={() => nav('/shelters')} />
        <StatCard icon={Users} label="Rescue Teams" value={d.teams.length} tone="info" onClick={() => nav('/rescue-teams')} />
        <StatCard icon={Package} label="Relief Resources" value={num(d.resources.reduce((s, r) => s + r.availableQuantity, 0))} tone="purple" hint="units available" onClick={() => nav('/resources')} />
        <StatCard icon={AlertTriangle} label="Active Alerts" value={active.length} tone="danger" onClick={() => nav('/hazard-alerts')} />
      </div>

      <div className="grid g-2">
        <Card title="Affected Areas" subtitle="Active hazard warnings on the map">
          <MapView height={300}
            markers={active.map((w) => ({ id: w.id, lat: w.latitude, lng: w.longitude, label: w.title, sub: w.affectedArea, color: RISK_COLOR[w.riskLevel] }))}
            circles={active.map((w) => ({ lat: w.latitude, lng: w.longitude, radius: w.radius, color: RISK_COLOR[w.riskLevel] }))}
            polygons={active.filter((w) => w.polygon?.length).map((w) => ({ points: w.polygon!.map((p) => [p.latitude, p.longitude] as [number, number]), color: RISK_COLOR[w.riskLevel] }))} />
          <div className="legend"><span><i style={{ background: RISK_COLOR.HIGH }} />High / Critical</span><span><i style={{ background: RISK_COLOR.MEDIUM }} />Medium</span><span><i style={{ background: RISK_COLOR.LOW }} />Low</span></div>
        </Card>
        <Card title="Recent Alerts" action={<Btn variant="ghost" small onClick={() => nav('/hazard-alerts')}>View All</Btn>}>
          {d.warnings.length === 0 ? <Empty icon={AlertTriangle} text="No hazard alerts yet." /> : d.warnings.slice(0, 4).map((w) => (
            <div key={w.id} className="alert-row" onClick={() => nav('/hazard-alerts')}>
              <div className="ic" style={{ background: RISK_COLOR[w.riskLevel] + '22', color: RISK_COLOR[w.riskLevel] }}>{w.hazardType === 'flood' ? <Droplets size={20} /> : <Triangle size={20} />}</div>
              <div><b>{w.title}</b><span className="muted">{w.affectedArea}</span></div>
              <div className="r"><Badge text={w.riskLevel} /><span className="muted">{fmtDateTime(w.createdAt)}</span></div>
            </div>
          ))}
        </Card>
      </div>

      <div className="grid g-2">
        <Card title="Ongoing Response Activities" action={<Btn variant="ghost" small onClick={() => nav('/summary')}>View All</Btn>}>
          <Table rows={d.activities.slice(0, 5)} empty="No activities recorded yet." cols={[
            { key: 'title', title: 'Activity', strong: true }, { key: 'location', title: 'Location', render: (r) => r.location || '—' },
            { key: 'status', title: 'Status', render: (r) => <Badge text={r.status} /> }]} />
        </Card>
        <Card title="My Tasks" subtitle="Generated from live requests and stock levels">
          <Table rows={tasks} empty="Nothing needs your attention right now." onRow={(r) => nav(r.to)} cols={[
            { key: 'task', title: 'Task' }, { key: 'priority', title: 'Priority', render: (r) => <Badge text={r.priority} /> }, { key: 'due', title: 'Due', render: () => today() }]} />
        </Card>
      </div>
    </>
  );
}
