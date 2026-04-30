import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';
import api from '@/services/api';
import { formatCurrency, formatDate } from '@/utils/formatters';
import type { Campaign } from '@/types/charity.types';

async function getDashboardData() {
  const [campaigns, charities] = await Promise.all([
    api.get('/campaigns/', { params: { page_size: 50 } }),
    api.get('/charities/'),
  ]);
  return {
    campaigns: campaigns.data.results as Campaign[],
    charities: charities.data.results,
    totalCampaigns: campaigns.data.count,
    totalCharities: charities.data.count,
  };
}

const CATEGORY_COLORS = ['#1a7a4a', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function buildCategoryData(campaigns: Campaign[]) {
  const counts: Record<string, number> = {};
  campaigns.forEach((c) => {
    counts[c.category] = (counts[c.category] || 0) + 1;
  });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function buildRaisedData(campaigns: Campaign[]) {
  return campaigns
    .filter((c) => parseFloat(c.raised_amount) > 0)
    .sort((a, b) => parseFloat(b.raised_amount) - parseFloat(a.raised_amount))
    .slice(0, 8)
    .map((c) => ({
      name: c.title.length > 20 ? c.title.substring(0, 20) + '...' : c.title,
      raised: parseFloat(c.raised_amount),
      target: parseFloat(c.target_amount),
    }));
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboardData,
  });

  const statusTemplate = (rowData: Campaign) => {
    const severity: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      active: 'success', paused: 'warning', completed: 'info', cancelled: 'danger',
    };
    return <Tag value={rowData.status} severity={severity[rowData.status] || 'info'} />;
  };

  const progressTemplate = (rowData: Campaign) => (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 bg-brand rounded-full"
          style={{ width: `${Math.min(rowData.progress_percentage, 100)}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 w-10 text-right">
        {rowData.progress_percentage.toFixed(0)}%
      </span>
    </div>
  );

  const raisedTemplate = (rowData: Campaign) => (
    <span className="font-medium text-brand">{formatCurrency(rowData.raised_amount)}</span>
  );

  const targetTemplate = (rowData: Campaign) => (
    <span>{formatCurrency(rowData.target_amount)}</span>
  );

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse h-24" />
          ))}
        </div>
        <div className="card animate-pulse h-64" />
      </div>
    );
  }

  const categoryData = data ? buildCategoryData(data.campaigns) : [];
  const raisedData = data ? buildRaisedData(data.campaigns) : [];

  return (
    <>
      <Helmet><title>Admin Dashboard — Shefa</title></Helmet>

      <div className="py-6">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Campaigns', value: data?.totalCampaigns, icon: '📢' },
            { label: 'Active Campaigns', value: data?.campaigns.filter(c => c.status === 'active').length, icon: '🟢' },
            { label: 'Total Charities', value: data?.totalCharities, icon: '🏢' },
            {
              label: 'Total Raised',
              value: formatCurrency(
                data?.campaigns.reduce((s, c) => s + parseFloat(c.raised_amount), 0) || 0
              ),
              icon: '💰',
            },
          ].map((stat) => (
            <div key={stat.label} className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="card">
            <h2 className="font-semibold mb-4">Top Campaigns by Funds Raised</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={raisedData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="raised" name="Raised" fill="#1a7a4a" radius={[0, 4, 4, 0]} />
                <Bar dataKey="target" name="Target" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-4">Campaigns by Category</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PrimeReact DataTable */}
        <div className="card">
          <h2 className="font-semibold mb-4">All Campaigns</h2>
          <DataTable
            value={data?.campaigns || []}
            paginator
            rows={10}
            rowsPerPageOptions={[5, 10, 20]}
            tableStyle={{ minWidth: '50rem' }}
            emptyMessage="No campaigns found."
            sortMode="multiple"
            removableSort
            filterDisplay="menu"
            className="text-sm"
          >
            <Column field="title" header="Title" sortable filter style={{ minWidth: '200px' }} />
            <Column field="charity.name" header="Charity" sortable style={{ minWidth: '150px' }} />
            <Column field="category" header="Category" sortable filter />
            <Column header="Status" body={statusTemplate} sortField="status" sortable />
            <Column header="Raised" body={raisedTemplate} sortField="raised_amount" sortable />
            <Column header="Target" body={targetTemplate} sortField="target_amount" sortable />
            <Column header="Progress" body={progressTemplate} style={{ minWidth: '150px' }} />
            <Column
              field="end_date"
              header="End Date"
              sortable
              body={(row) => row.end_date ? formatDate(row.end_date) : '—'}
            />
          </DataTable>
        </div>
      </div>
    </>
  );
}