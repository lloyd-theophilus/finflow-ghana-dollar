import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
type Currency = 'USD' | 'GHS';

interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
}

interface ExpenseRecord {
  id: string;
  category_id: string;
  quarter: Quarter;
  year: number;
  amount: number;
  currency: Currency;
  description: string;
  expense_date: string;
  expense_categories: {
    name: string;
  };
}

const Expenses = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null);

  const [formData, setFormData] = useState({
    category_id: '',
    quarter: 'Q1' as Quarter,
    year: new Date().getFullYear(),
    amount: '',
    currency: 'USD' as Currency,
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (user) {
      fetchCategories();
      fetchExpenseRecords();
    }
  }, [user]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchExpenseRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expense_records')
        .select(`
          *,
          expense_categories (
            name
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenseRecords(data || []);
    } catch (error) {
      console.error('Error fetching expense records:', error);
      toast({
        title: "Error",
        description: "Failed to fetch expense records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.category_id) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const recordData = {
        user_id: user?.id,
        category_id: formData.category_id,
        quarter: formData.quarter,
        year: formData.year,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        description: formData.description,
        expense_date: formData.expense_date,
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('expense_records')
          .update(recordData)
          .eq('id', editingRecord.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Expense record updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('expense_records')
          .insert([recordData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Expense record added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingRecord(null);
      setFormData({
        category_id: '',
        quarter: 'Q1',
        year: new Date().getFullYear(),
        amount: '',
        currency: 'USD',
        description: '',
        expense_date: new Date().toISOString().split('T')[0],
      });
      fetchExpenseRecords();
    } catch (error) {
      console.error('Error saving expense record:', error);
      toast({
        title: "Error",
        description: "Failed to save expense record",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (record: ExpenseRecord) => {
    setEditingRecord(record);
    setFormData({
      category_id: record.category_id,
      quarter: record.quarter,
      year: record.year,
      amount: record.amount.toString(),
      currency: record.currency,
      description: record.description,
      expense_date: record.expense_date,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expense_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Expense record deleted successfully",
      });
      fetchExpenseRecords();
    } catch (error) {
      console.error('Error deleting expense record:', error);
      toast({
        title: "Error",
        description: "Failed to delete expense record",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (amount: number, currency: Currency) => {
    const symbol = currency === 'USD' ? '$' : '₵';
    return `${symbol}${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <TrendingDown className="h-8 w-8 text-destructive" />
          <h1 className="text-3xl font-bold text-foreground">Expense Tracking</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingRecord(null);
              setFormData({
                category_id: '',
                quarter: 'Q1',
                year: new Date().getFullYear(),
                amount: '',
                currency: 'USD',
                description: '',
                expense_date: new Date().toISOString().split('T')[0],
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRecord ? 'Edit Expense Record' : 'Add New Expense Record'}
              </DialogTitle>
              <DialogDescription>
                Track your expenses by category, quarter and currency
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category_id} onValueChange={(value) => setFormData({...formData, category_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quarter">Quarter</Label>
                  <Select value={formData.quarter} onValueChange={(value: Quarter) => setFormData({...formData, quarter: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1">Q1</SelectItem>
                      <SelectItem value="Q2">Q2</SelectItem>
                      <SelectItem value="Q3">Q3</SelectItem>
                      <SelectItem value="Q4">Q4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Select value={formData.year.toString()} onValueChange={(value) => setFormData({...formData, year: parseInt(value)})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={formData.currency} onValueChange={(value: Currency) => setFormData({...formData, currency: value})}>
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

              <div className="space-y-2">
                <Label htmlFor="expense_date">Expense Date</Label>
                <Input
                  id="expense_date"
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Additional details about this expense..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRecord ? 'Update' : 'Add'} Expense
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
          <CardDescription>
            View and manage all your expenses by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading...</p>
          ) : expenseRecords.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No expense records found. Add your first expense record to get started!
            </p>
          ) : (
            <div className="space-y-4">
              {expenseRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">{record.expense_categories.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.quarter} {record.year} • {new Date(record.expense_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-destructive">
                          {formatCurrency(record.amount, record.currency)}
                        </p>
                      </div>
                    </div>
                    {record.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {record.description}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(record)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(record.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Expenses;