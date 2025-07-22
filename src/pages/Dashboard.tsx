import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, PiggyBank, Target, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
type Currency = 'USD' | 'GHS';

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  savings: number;
  currency: Currency;
}

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  goal_type: string;
  currency: Currency;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter>('Q1');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USD');
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalIncome: 0,
    totalExpenses: 0,
    savings: 0,
    currency: 'USD'
  });
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, selectedQuarter, selectedYear, selectedCurrency]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch income data
      const { data: incomeData } = await supabase
        .from('income_records')
        .select('amount')
        .eq('user_id', user?.id)
        .eq('quarter', selectedQuarter)
        .eq('year', selectedYear)
        .eq('currency', selectedCurrency);

      // Fetch expense data
      const { data: expenseData } = await supabase
        .from('expense_records')
        .select('amount')
        .eq('user_id', user?.id)
        .eq('quarter', selectedQuarter)
        .eq('year', selectedYear)
        .eq('currency', selectedCurrency);

      // Fetch savings goals
      const { data: goalsData } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .eq('currency', selectedCurrency);

      const totalIncome = incomeData?.reduce((sum, record) => sum + Number(record.amount), 0) || 0;
      const totalExpenses = expenseData?.reduce((sum, record) => sum + Number(record.amount), 0) || 0;
      const savings = totalIncome - totalExpenses;

      setFinancialSummary({
        totalIncome,
        totalExpenses,
        savings,
        currency: selectedCurrency
      });

      setSavingsGoals(goalsData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: Currency) => {
    const symbol = currency === 'USD' ? '$' : '₵';
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getGoalProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <div className="flex space-x-4">
          <Select value={selectedCurrency} onValueChange={(value: Currency) => setSelectedCurrency(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="GHS">GHS (₵)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedQuarter} onValueChange={(value: Quarter) => setSelectedQuarter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Q1">Q1</SelectItem>
              <SelectItem value="Q2">Q2</SelectItem>
              <SelectItem value="Q3">Q3</SelectItem>
              <SelectItem value="Q4">Q4</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2025">2025</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(financialSummary.totalIncome, selectedCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedQuarter} {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(financialSummary.totalExpenses, selectedCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedQuarter} {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Savings</CardTitle>
            <PiggyBank className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${financialSummary.savings >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(financialSummary.savings, selectedCurrency)}
            </div>
            <p className="text-xs text-muted-foreground">
              Income - Expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <Target className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">
              {financialSummary.totalIncome > 0 
                ? `${((financialSummary.savings / financialSummary.totalIncome) * 100).toFixed(1)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Of total income
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Savings Goals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PiggyBank className="mr-2 h-5 w-5" />
            Savings Goals Progress
          </CardTitle>
          <CardDescription>
            Track your progress towards financial goals
          </CardDescription>
        </CardHeader>
        <CardContent>
          {savingsGoals.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No active savings goals. Create your first goal to start tracking!
            </p>
          ) : (
            <div className="space-y-4">
              {savingsGoals.map((goal) => {
                const progress = getGoalProgress(goal.current_amount, goal.target_amount);
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{goal.name}</span>
                        <Badge variant="outline" className="capitalize">
                          {goal.goal_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(goal.current_amount, goal.currency)} / {formatCurrency(goal.target_amount, goal.currency)}
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="text-right text-xs text-muted-foreground">
                      {progress.toFixed(1)}% complete
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;