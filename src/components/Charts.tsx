"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";
import React from "react";

const COLORS = ['#192C67', '#F77B0F', '#10B981', '#F59E0B', '#3B82F6', '#06B6D4', '#EF4444', '#34D399'];

export function LineTrend({ data, dataKey, xKey = "label", height = 220 }: { data: Record<string, unknown>[]; dataKey: string; xKey?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#192C67" stopOpacity={0.45} />
            <stop offset="95%" stopColor="#192C67" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.1)" vertical={false} />
        <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
        <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
        <Area type="monotone" dataKey={dataKey} stroke="#192C67" strokeWidth={2.5} fill="url(#g1)" dot={false} activeDot={{ r: 5, fill: '#F77B0F', stroke: '#fff', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BarTrend({ data, dataKey, xKey = "label", height = 220, color = '#192C67' }: { data: Record<string, unknown>[]; dataKey: string; xKey?: string; height?: number; color?: string }) {
  const gradId = `bt-${dataKey}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="35%">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
            <stop offset="100%" stopColor={color} stopOpacity={0.4} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" vertical={false} />
        <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
        <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: 'rgba(120,120,120,0.08)' }} />
        <Bar dataKey={dataKey} fill={`url(#${gradId})`} radius={[5, 5, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BarCompare({ data, bars, xKey = "label", height = 240 }: { data: Record<string, unknown>[]; bars: { key: string; label?: string }[]; xKey?: string; height?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {/* Custom legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {bars.map((b, i) => (
          <div key={b.key} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-xs text-gray-500 dark:text-gray-400">{b.label ?? b.key}</span>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.1)" vertical={false} />
          <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} cursor={{ fill: 'rgba(120,120,120,0.06)' }} />
          {bars.map((b, i) => (
            <Bar key={b.key} dataKey={b.key} name={b.label ?? b.key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} maxBarSize={36} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineSeries({ data, lines, xKey = "label", height = 240 }: { data: Record<string, unknown>[]; lines: { key: string; label?: string }[]; xKey?: string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" vertical={false} />
        <XAxis dataKey={xKey} stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
        <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {lines.map((l, i) => (
          <Line key={l.key} type="monotone" dataKey={l.key} name={l.label ?? l.key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

const RADIAN = Math.PI / 180;

function SliceLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number }) {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="700">
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

export function DonutBreakdown({ data, colors, height = 220 }: { data: { name: string; value: number }[]; colors?: string[]; height?: number }) {
  const palette = colors ?? COLORS;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex items-center gap-4">
      <div style={{ width: height, height, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={0}
              outerRadius={Math.round(height * 0.46)}
              paddingAngle={2}
              stroke="none"
              labelLine={false}
              label={(props: any) => <SliceLabel {...props} />}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              formatter={(value: any, name: any) => [`${value} (${total ? Math.round((value / total) * 100) : 0}%)`, name]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-2.5 flex-1 min-w-0">
        {data.map((d, i) => {
          const pct = total ? Math.round((d.value / total) * 100) : 0;
          return (
            <div key={d.name} className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: palette[i % palette.length] }} />
              <span className="text-xs text-gray-600 dark:text-gray-400 flex-1 leading-tight">{d.name}</span>
              <span className="text-xs font-bold text-gray-900 dark:text-white tabular-nums shrink-0">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
