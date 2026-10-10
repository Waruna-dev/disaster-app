import { useMemo, useState } from 'react';
import { AlertCircle, Box, Layers, Package, Pencil, Plus, Save, Send, Trash2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { createResource, deleteResource, logActivity, recordDistribution, updateResource } from '../lib/db';
import { DISTRICTS, DISTRICT_COORDS, RESOURCE_CATEGORIES } from '../lib/constants';
import { num, todayISO } from '../lib/format';
import type { Resource } from '../lib/types';
import { Badge, Btn, Card, Field, Input, KV, Modal, PageHeader, Select, Spinner, StatCard, Table, Tabs, TextArea } from '../components/ui';
import { MapView } from '../components/MapView';

export default function Resources() {
  const { resources, distributions, loading } = useData();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  const [tab, setTab] = useState('manage'); const [busy, setBusy] = useState(false); const [filter, setFilter] = useState('All Categories');
  const [form, setForm] = useState<{ edit: Resource | null } | null>(null);
  const [r, setR] = useState({ name: '', category: '', unit: '', total: '', avail: '' });
  const [d, setD] = useState({ resource: '', qty: '', district: '', date: todayISO(), notes: '' });
  const setRf = (k: keyof typeof r) => (v: string) => setR((s) => ({ ...s, [k]: v }));
  const setDf = (k: keyof typeof d) => (v: string) => setD((s) => ({ ...s, [k]: v }));
  const selected = resources.find((x) => x.name === d.resource);
  const shown = useMemo(() => resources.filter((x) => filter === 'All Categories' || x.category === filter), [resources, filter]);
  const low = resources.filter((x) => x.totalQuantity > 0 && x.availableQuantity / x.totalQuantity <= 0.2).length;

  const openForm = (e: Resource | null) => { setForm({ edit: e }); setR({ name: e?.name ?? '', category: e?.category ?? '', unit: e?.unit ?? '', total: e ? String(e.totalQuantity) : '', avail: e ? String(e.availableQuantity) : '' }); };
  const saveResource = async () => {
    const total = parseInt(r.total, 10); const avail = r.avail.trim() === '' ? total : parseInt(r.avail, 10);
    if (!r.name.trim() || !r.category || !r.unit.trim() || isNaN(total) || isNaN(avail)) { toast('Fill name, category, unit and total quantity.', 'error'); return; }
    if (avail > total) { toast('Available quantity cannot exceed total.', 'error'); return; }
    try {
      setBusy(true);
      const p = { name: r.name.trim(), category: r.category, unit: r.unit.trim(), totalQuantity: total, availableQuantity: avail };
      if (form?.edit) await updateResource(form.edit.id, p); else await createResource(p);
      await logActivity({ type: 'resource', title: form?.edit ? 'Resource updated' : 'Resource added', detail: `${p.name} — ${avail}/${total} ${p.unit}`, status: 'Success', createdBy: user?.uid });
      toast('Resource saved.'); setForm(null);
    } catch (e) { toast((e as Error).message || 'Save failed', 'error'); } finally { setBusy(false); }
  };
  const remove = async (x: Resource) => { if (await confirm({ title: 'Remove resource', message: `Remove "${x.name}"?`, confirmLabel: 'Remove', danger: true })) { await deleteResource(x.id); toast('Resource removed.'); } };

  const record = async () => {
    const qty = parseInt(d.qty, 10);
    if (!selected || !d.district || !qty || qty < 1) { toast('Select a resource, quantity and district.', 'error'); return; }
    if (qty > selected.availableQuantity) { toast(`Only ${num(selected.availableQuantity)} ${selected.unit} available.`, 'error'); return; }
    try {
      setBusy(true);
      await recordDistribution({ resourceId: selected.id, quantity: qty, district: d.district, distributionDate: d.date, notes: d.notes.trim() || undefined, recordedBy: user?.uid });
      await logActivity({ type: 'resource', title: 'Resource distribution recorded', detail: `${num(qty)} ${selected.unit} ${selected.name} → ${d.district}`, location: d.district, status: 'Success', createdBy: user?.uid });
      toast('Distribution recorded. Stock updated.'); setD((s) => ({ ...s, qty: '', notes: '' }));
    } catch (e) { toast((e as Error).message || 'Could not record distribution', 'error'); } finally { setBusy(false); }
  };
  const exportCsv = () => {
    const rows = [['Date', 'Resource', 'Quantity', 'Unit', 'District', 'Notes'], ...distributions.map((x) => [x.distributionDate, x.resourceName, x.quantity, x.unit, x.district, x.notes ?? ''])];
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'distribution-history.csv'; a.click();
  };

  if (loading) return <Spinner />;
  const coords = d.district ? DISTRICT_COORDS[d.district] : undefined;
  return (
    <>
      <PageHeader title={tab === 'record' ? 'Record Resource Distribution' : tab === 'history' ? 'Distribution History' : 'Manage Resources'} subtitle={tab === 'record' ? 'Enter distribution details for relief resources.' : 'Track relief stock and distribution across districts.'}
        actions={tab === 'manage' ? <Btn icon={Plus} onClick={() => openForm(null)}>Add Resource</Btn> : tab === 'history' ? <Btn variant="secondary" onClick={exportCsv}>Export CSV</Btn> : undefined} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: 'manage', label: 'Manage Resources' }, { key: 'record', label: 'Record Distribution' }, { key: 'history', label: 'Distribution History' }]} />

      {tab === 'manage' && <>
        <div className="stats">
          <StatCard icon={Box} label="Resource Types" value={resources.length} tone="info" /><StatCard icon={Layers} label="Units Available" value={num(resources.reduce((s, x) => s + x.availableQuantity, 0))} />
          <StatCard icon={AlertCircle} label="Low Stock (≤20%)" value={low} tone="danger" /><StatCard icon={Send} label="Distributions" value={distributions.length} tone="purple" />
        </div>
        <Card title="Relief Resources" action={<div style={{ width: 200 }}><Select value={filter} onChange={setFilter} options={['All Categories', ...RESOURCE_CATEGORIES]} /></div>}>
          <Table rows={shown} empty="No resources yet. Add your first resource." cols={[
            { key: 'name', title: 'Resource', strong: true }, { key: 'category', title: 'Category' },
            { key: 'stock', title: 'Available / Total', width: 260, render: (x) => { const p = x.totalQuantity ? Math.round((x.availableQuantity / x.totalQuantity) * 100) : 0; return <div style={{ minWidth: 200 }}>{num(x.availableQuantity)} / {num(x.totalQuantity)} {x.unit} ({p}%)<div className="bar"><i style={{ width: `${p}%`, background: p > 50 ? '#2E7D32' : p > 20 ? '#F9A825' : '#C62828' }} /></div></div>; } },
            { key: 'st', title: 'Stock', render: (x) => { const lo = x.totalQuantity > 0 && x.availableQuantity / x.totalQuantity <= 0.2; return <Badge text={lo ? 'Low' : 'Good'} tone={lo ? 'danger' : 'success'} />; } },
            { key: 'a', title: 'Actions', render: (x) => <div className="row-actions"><Btn small variant="secondary" icon={Send} onClick={() => { setDf('resource')(x.name); setTab('record'); }}>Distribute</Btn><Btn small variant="secondary" iconOnly icon={Pencil} title="Edit" onClick={() => openForm(x)} /><Btn small variant="danger" iconOnly icon={Trash2} title="Remove" onClick={() => remove(x)} /></div> }]} />
        </Card>
      </>}

      {tab === 'record' && (
        <div className="grid g-form">
          <Card title="Distribution Details">
            <div className="cols">
              <Field label="Select Resource" required><Select value={d.resource} onChange={setDf('resource')} options={resources.map((x) => x.name)} placeholder="Select resource" /></Field>
              <Field label="Quantity" required><Input type="number" min={1} value={d.qty} onChange={(e) => setDf('qty')(e.target.value)} placeholder="e.g., 100" /></Field>
              <Field label="Unit"><Input value={selected?.unit ?? ''} disabled placeholder="—" /></Field>
            </div>
            <div className="cols">
              <Field label="Distribute To" required><Select value={d.district} onChange={setDf('district')} options={DISTRICTS} placeholder="Select district or affected area" /></Field>
              <Field label="Distribution Date" required><Input type="date" value={d.date} onChange={(e) => setDf('date')(e.target.value)} /></Field>
            </div>
            <Field label="Additional Notes (Optional)"><TextArea value={d.notes} onChange={(e) => setDf('notes')(e.target.value)} placeholder="Enter any additional notes (e.g., special instructions, recipient details, etc.)" /></Field>
            {selected && <div className="avail">
              <div style={{ flex: 1.4 }}><small>Current Resource Availability</small><b>{selected.name}</b><div className="muted">Category: {selected.category}</div></div>
              <div><small>Total Quantity</small><b>{num(selected.totalQuantity)}</b></div><div><small>Available Quantity</small><b style={{ color: 'var(--primary)' }}>{num(selected.availableQuantity)}</b></div><div><small>Unit</small><b>{selected.unit}</b></div>
            </div>}
            <div className="actions" style={{ justifyContent: 'flex-end' }}><Btn variant="secondary" onClick={() => setD((s) => ({ ...s, qty: '', notes: '', district: '' }))}>Cancel</Btn><Btn icon={Package} loading={busy} onClick={record}>Record Distribution</Btn></div>
          </Card>
          <div>
            <Card title="Selected Location / Area">
              <KV label="Name">{d.district ? `${d.district} - Affected Area` : '—'}</KV><KV label="Type">District</KV><KV label="District">{d.district || '—'}</KV>
              <div style={{ marginTop: 12 }}><MapView height={200} zoom={10} center={coords} markers={coords ? [{ id: 'd', lat: coords[0], lng: coords[1], label: d.district, color: '#C62828' }] : []} /></div>
            </Card>
            <Card title="Recent Distributions" action={<Btn variant="ghost" small onClick={() => setTab('history')}>View All</Btn>}>
              <Table rows={distributions.slice(0, 4)} empty="No distributions yet." cols={[{ key: 'distributionDate', title: 'Date' }, { key: 'resourceName', title: 'Resource' }, { key: 'quantity', title: 'Qty', render: (x) => num(x.quantity) }, { key: 'district', title: 'To' }]} />
            </Card>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <Card title="All Distributions"><Table rows={distributions} empty="No distributions recorded yet." cols={[
          { key: 'distributionDate', title: 'Date' }, { key: 'resourceName', title: 'Resource', strong: true }, { key: 'quantity', title: 'Quantity', render: (x) => `${num(x.quantity)} ${x.unit}` },
          { key: 'district', title: 'Distributed To' }, { key: 'notes', title: 'Notes', render: (x) => x.notes || '—' }]} /></Card>
      )}

      {form && (
        <Modal title={form.edit ? 'Edit Resource' : 'Add Resource'} onClose={() => setForm(null)}>
          <Field label="Name" required><Input value={r.name} onChange={(e) => setRf('name')(e.target.value)} placeholder="e.g., Drinking Water" /></Field>
          <Field label="Category" required><Select value={r.category} onChange={setRf('category')} options={RESOURCE_CATEGORIES} placeholder="Select category" /></Field>
          <Field label="Unit" required><Input value={r.unit} onChange={(e) => setRf('unit')(e.target.value)} placeholder="e.g., Bottles, Packs, Tents" /></Field>
          <div className="cols">
            <Field label="Total Quantity" required><Input type="number" min={0} value={r.total} onChange={(e) => setRf('total')(e.target.value)} /></Field>
            <Field label="Available Quantity" hint="Defaults to total"><Input type="number" min={0} value={r.avail} onChange={(e) => setRf('avail')(e.target.value)} /></Field>
          </div>
          <div className="modal-foot"><Btn variant="secondary" onClick={() => setForm(null)}>Cancel</Btn><Btn icon={Save} loading={busy} onClick={saveResource}>Save Resource</Btn></div>
        </Modal>
      )}
    </>
  );
}
