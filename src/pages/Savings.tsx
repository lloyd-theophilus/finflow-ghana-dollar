import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, PiggyBank, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type Currency = 'USD' | 'GHS';
type GoalType = 'vacation' | 'car_service' | 'tech_stocks' | 'emergency' | 'other';

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  currency: Currency;
  target_date: string;
  goal_type: GoalType;
  description: string;
  is_active: boolean;
}

interface SavingsTransaction {
  id: string;
  savings_goal_id: string;
  amount: number;
  transaction_type: 'deposit' | 'withdrawal';
  description: string;
  transaction_date: string;
}

const Savings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  const [goalFormData, setGoalFormData] = useState({
    name: '',
    target_amount: '',
    currency: 'USD' as Currency,
    target_date: '',
    goal_type: 'other' as GoalType,
    description: '',
  });

  const [transactionFormData, setTransactionFormData] = useState({
    amount: '',
    transaction_type: 'deposit' as 'deposit' | 'withdrawal',
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (user) {
      fetchSavingsGoals();
    }
  }, [user]);

  const fetchSavingsGoals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavingsGoals((data || []) as SavingsGoal[]);
    } catch (error) {
      console.error('Error fetching savings goals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch savings goals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!goalFormData.name || !goalFormData.target_amount) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const goalData = {
        user_id: user?.id,
        name: goalFormData.name,
        target_amount: parseFloat(goalFormData.target_amount),
        currency: goalFormData.currency,
        target_date: goalFormData.target_date || null,
        goal_type: goalFormData.goal_type,
        description: goalFormData.description,
      };

      if (editingGoal) {
        const { error } = await supabase
          .from('savings_goals')
          .update(goalData)
          .eq('id', editingGoal.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Savings goal updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('savings_goals')
          .insert([goalData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Savings goal created successfully",
        });
      }

      setIsGoalDialogOpen(false);
      setEditingGoal(null);
      setGoalFormData({
        name: '',
        target_amount: '',
        currency: 'USD',
        target_date: '',
        goal_type: 'other',
        description: '',
      });
      fetchSavingsGoals();
    } catch (error) {
      console.error('Error saving savings goal:', error);
      toast({
        title: "Error",
        description: "Failed to save savings goal",
        variant: "destructive",
      });
    }
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transactionFormData.amount || !selectedGoal) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const transactionData = {
        savings_goal_id: selectedGoal.id,
        amount: parseFloat(transactionFormData.amount),
        transaction_type: transactionFormData.transaction_type,
        description: transactionFormData.description,
        transaction_date: transactionFormData.transaction_date,
      };

      const { error } = await supabase
        .from('savings_transactions')
        .insert([transactionData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${transactionFormData.transaction_type === 'deposit' ? 'Deposit' : 'Withdrawal'} added successfully`,
      });

      setIsTransactionDialogOpen(false);
      setSelectedGoal(null);
      setTransactionFormData({
        amount: '',
        transaction_type: 'deposit',
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
      });
      fetchSavingsGoals();
    } catch (error) {
      console.error('Error saving transaction:', error);
      toast({
        title: "Error",
        description: "Failed to save transaction",
        variant: "destructive",
      });
    }
  };

  const handleEditGoal = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setGoalFormData({
      name: goal.name,
      target_amount: goal.target_amount.toString(),
      currency: goal.currency,
      target_date: goal.target_date || '',
      goal_type: goal.goal_type,
      description: goal.description,
    });
    setIsGoalDialogOpen(true);
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Savings goal deleted successfully",
      });
      fetchSavingsGoals();
    } catch (error) {
      console.error('Error deleting savings goal:', error);
      toast({
        title: "Error",
        description: "Failed to delete savings goal",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number, currency: Currency) => {
    const symbol = currency === 'USD' ? '$' : '₵';
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getGoalProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getGoalTypeColor = (type: GoalType) => {
    const colors = {
      vacation: 'bg-blue-100 text-blue-800',
      car_service: 'bg-green-100 text-green-800',
      tech_stocks: 'bg-purple-100 text-purple-800',
      emergency: 'bg-red-100 text-red-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[type];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <PiggyBank className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Savings Goals</h1>
        </div>
        <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingGoal(null);
              setGoalFormData({
                name: '',
                target_amount: '',
                currency: 'USD',
                target_date: '',
                goal_type: 'other',
                description: '',
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingGoal ? 'Edit Savings Goal' : 'Create New Savings Goal'}
              </DialogTitle>
              <DialogDescription>
                Set up your financial goals and track your progress
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleGoalSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal-name">Goal Name *</Label>
                <Input
                  id="goal-name"
                  placeholder="e.g., Vacation to Europe"
                  value={goalFormData.name}
                  onChange={(e) => setGoalFormData({...goalFormData, name: e.target.value})}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target-amount">Target Amount *</Label>
                  <Input
                    id="target-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={goalFormData.target_amount}
                    onChange={(e) => setGoalFormData({...goalFormData, target_amount: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-currency">Currency</Label>
                  <Select value={goalFormData.currency} onValueChange={(value: Currency) => setGoalFormData({...goalFormData, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="GHS">GHS (₵)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-type">Goal Type</Label>
                  <Select value={goalFormData.goal_type} onValueChange={(value: GoalType) => setGoalFormData({...goalFormData, goal_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vacation">Vacation</SelectItem>
                      <SelectItem value="car_service">Car Service</SelectItem>
                      <SelectItem value="tech_stocks">Tech Stocks</SelectItem>
                      <SelectItem value="emergency">Emergency Fund</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-date">Target Date</Label>
                  <Input
                    id="target-date"
                    type="date"
                    value={goalFormData.target_date}
                    onChange={(e) => setGoalFormData({...goalFormData, target_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goal-description">Description</Label>
                <Textarea
                  id="goal-description"
                  placeholder="Describe your goal..."
                  value={goalFormData.description}
                  onChange={(e) => setGoalFormData({...goalFormData, description: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsGoalDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingGoal ? 'Update' : 'Create'} Goal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transaction Dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Add a deposit or withdrawal for {selectedGoal?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTransactionSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transaction-amount">Amount *</Label>
                <Input
                  id="transaction-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={transactionFormData.amount}
                  onChange={(e) => setTransactionFormData({...transactionFormData, amount: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transaction-type">Type</Label>
                <Select value={transactionFormData.transaction_type} onValueChange={(value: 'deposit' | 'withdrawal') => setTransactionFormData({...transactionFormData, transaction_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-date">Date</Label>
              <Input
                id="transaction-date"
                type="date"
                value={transactionFormData.transaction_date}
                onChange={(e) => setTransactionFormData({...transactionFormData, transaction_date: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transaction-description">Description</Label>
              <Textarea
                id="transaction-description"
                placeholder="Optional description..."
                value={transactionFormData.description}
                onChange={(e) => setTransactionFormData({...transactionFormData, description: e.target.value})}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Add {transactionFormData.transaction_type === 'deposit' ? 'Deposit' : 'Withdrawal'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Goals Grid */}
      {loading ? (
        <p className="text-center py-4">Loading...</p>
      ) : savingsGoals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No savings goals found. Create your first goal to start saving!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savingsGoals.map((goal) => {
            const progress = getGoalProgress(goal.current_amount, goal.target_amount);
            return (
              <Card key={goal.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{goal.name}</CardTitle>
                    <Badge className={getGoalTypeColor(goal.goal_type)}>
                      {goal.goal_type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardDescription>{goal.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatCurrency(goal.current_amount, goal.currency)}</span>
                      <span>{formatCurrency(goal.target_amount, goal.currency)}</span>
                    </div>
                  </div>

                  {goal.target_date && (
                    <p className="text-sm text-muted-foreground">
                      Target: {new Date(goal.target_date).toLocaleDateString()}
                    </p>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedGoal(goal);
                        setTransactionFormData({
                          amount: '',
                          transaction_type: 'deposit',
                          description: '',
                          transaction_date: new Date().toISOString().split('T')[0],
                        });
                        setIsTransactionDialogOpen(true);
                      }}
                    >
                      <ArrowUpCircle className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditGoal(goal)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Savings;