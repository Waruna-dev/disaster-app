import { ArrowLeft, Building2, Check, Clock, FileText, Package, Send, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { logActivity } from '../lib/db';
import { fmtDateTime } from '../lib/format';
import { Badge, Btn, Card, Empty, PageHeader, Spinner } from '../components/ui';

export default function Summary() {
  const { activities, loading } = useData();
  const { user } = useAuth();
  const { toast } = useUI();
  const nav = useNavigate();
  if (loading) return <Spinner />;
  const last = (t: string) => activities.find((a) => a.type === t);
  const rows = [{ t: 'shelter', label: 'Shelter', icon: Building2 }, { t: 'rescue', label: 'Rescue Team', icon: Users }, { t: 'resource', label: 'Relief Resources', icon: Package }];
  const notify = async () => { await logActivity({ type: 'notification', title: 'Notifications sent', detail: 'Relevant parties notified of latest updates', status: 'Success', createdBy: user?.uid }); toast('Notification recorded in the activity log.'); };
  return (
    <>
      <PageHeader title="Information Updated" subtitle="Summary of the latest shelter, rescue team and relief resource updates." />
      <div className="check-hero"><Check size={46} /></div>
      <div className="grid g-main">
        <Card title="Summary of Updates">
          {rows.map(({ t, label, icon: Icon }) => { const a = last(t); return (
            <div key={t} className="sum-row"><div className="ic"><Icon size={22} /></div><b className="l">{label}</b>
              <div>{a ? <><div className="td-strong">{a.title}</div><div className="muted">{a.detail}</div></> : <span className="muted">No updates yet</span>}</div></div>); })}
          <div className="sum-row"><div className="ic"><Clock size={22} /></div><b className="l">Updated At</b><div><div className="td-strong">{fmtDateTime(activities[0]?.createdAt)}</div><div className="muted">By: District Officer</div></div></div>
        </Card>
        <Card title="Recent Activities">
          {activities.length === 0 ? <Empty icon={Clock} text="No activity yet." /> : activities.slice(0, 8).map((a) => (
            <div key={a.id} className="timeline-item"><span className="dot" /><div style={{ flex: 1 }}><div className="td-strong">{a.title}</div><div className="muted">{fmtDateTime(a.createdAt)} · {a.detail}</div></div><Badge text={a.status} /></div>))}
        </Card>
      </div>
      <div className="actions" style={{ marginBottom: 30 }}>
        <Btn variant="secondary" icon={FileText} onClick={() => nav('/reports')}>View Updated Information</Btn><Btn icon={Send} onClick={notify}>Send Notifications</Btn><Btn variant="secondary" icon={ArrowLeft} onClick={() => nav('/dashboard')}>Back to Dashboard</Btn>
      </div>
    </>
  );
}
