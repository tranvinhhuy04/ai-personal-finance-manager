import React from 'react';
import { motion } from 'motion/react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { formatVND } from '@/lib/utils';

const analyticsData: { name: string; value: number; color: string }[] = [];
const trendData: { month: string; asset: number }[] = [];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-xl">
        <p className="font-medium text-gray-900 mb-1">{label || payload[0].name}</p>
        <p className="text-emerald-600 font-semibold">
          {formatVND(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

export const Analytics = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Phân tích</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ phân bổ chi tiêu */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm min-w-0">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Phân bổ chi tiêu</h2>
          <div className="h-[300px] w-full min-w-0" style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
              <PieChart>
                <Pie
                  data={analyticsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {analyticsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value, entry: any) => <span className="text-sm text-gray-700 font-medium ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ xu hướng tài sản */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm min-w-0">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Xu hướng tài sản (6 tháng)</h2>
          <div className="h-[300px] w-full min-w-0" style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
              <LineChart data={trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `${value / 1000000}M`}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="asset" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, fill: '#10b981', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
