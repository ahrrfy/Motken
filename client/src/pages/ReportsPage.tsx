import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const data = [
  { name: 'يناير', students: 40, memorized: 24 },
  { name: 'فبراير', students: 50, memorized: 28 },
  { name: 'مارس', students: 65, memorized: 35 },
  { name: 'أبريل', students: 78, memorized: 45 },
  { name: 'مايو', students: 90, memorized: 55 },
  { name: 'يونيو', students: 100, memorized: 70 },
];

const pieData = [
  { name: 'ممتاز', value: 400 },
  { name: 'جيد جداً', value: 300 },
  { name: 'جيد', value: 300 },
  { name: 'بحاجة لتحسين', value: 200 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold font-serif text-primary">التقارير والإحصائيات</h1>
      <p className="text-muted-foreground">تحليل شامل لأداء الحلقات والطلاب</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>نمو الطلاب والحفاظ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Legend />
                  <Bar dataKey="students" name="الطلاب الجدد" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="memorized" name="أتموا الحفظ" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>توزيع مستويات الأداء</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
