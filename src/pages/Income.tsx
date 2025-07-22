import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit, Trash2, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';
type Currency = 'USD' | 'GHS';

interface IncomeRecord {
  id: string;
  quarter: Quarter;
  year: number;
  amount: number;
  currency: Currency;
  source: string;
  description: string;
  created_at: string;
}

const Income = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IncomeRecord | null>(null);

  const [formData, setFormData] = useState({
    quarter: 'Q1' as Quarter,
    year: new Date().getFullYear(),
    amount: '',
    currency: 'USD' as Currency,
    source: '',
    description: '',
  });

  useEffect(() => {
    if (user) {
      fetchIncomeRecords();
    }
  }, [user]);

  const fetchIncomeRecords = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('income_records')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIncomeRecords(data || []);
    } catch (error) {
      console.error('Error fetching income records:', error);
      toast({
        title: "Error",
        description: "Failed to fetch income records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.source) {
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
        quarter: formData.quarter,
        year: formData.year,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        source: formData.source,
        description: formData.description,
      };

      if (editingRecord) {
        const { error } = await supabase
          .from('income_records')
          .update(recordData)
          .eq('id', editingRecord.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Income record updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('income_records')
          .insert([recordData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Income record added successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingRecord(null);
      setFormData({
        quarter: 'Q1',
        year: new Date().getFullYear(),
        amount: '',
        currency: 'USD',
        source: '',
        description: '',
      });
      fetchIncomeRecords();
    } catch (error) {
      console.error('Error saving income record:', error);
      toast({
        title: "Error",
        description: "Failed to save income record",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (record: IncomeRecord) => {
    setEditingRecord(record);
    setFormData({
      quarter: record.quarter,
      year: record.year,
      amount: record.amount.toString(),
      currency: record.currency,
      source: record.source,
      description: record.description,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('income_records')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Income record deleted successfully",
      });
      fetchIncomeRecords();
    } catch (error) {
      console.error('Error deleting income record:', error);
      toast({
        title: "Error",
        description: "Failed to delete income record",
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
          <TrendingUp className="h-8 w-8 text-success" />
          <h1 className="text-3xl font-bold text-foreground">Income Tracking</h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingRecord(null);
              setFormData({
                quarter: 'Q1',
                year: new Date().getFullYear(),
                amount: '',
                currency: 'USD',
                source: '',
                description: '',
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Income
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingRecord ? 'Edit Income Record' : 'Add New Income Record'}
              </DialogTitle>
              <DialogDescription>
                Track your income sources by quarter and currency
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label htmlFor="source">Income Source *</Label>
                <Input
                  id="source"
                  placeholder="e.g., Salary, Freelancing, Investment"
                  value={formData.source}
                  onChange={(e) => setFormData({...formData, source: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Additional details about this income..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingRecord ? 'Update' : 'Add'} Income
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income Records</CardTitle>
          <CardDescription>
            View and manage all your income sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading...</p>
          ) : incomeRecords.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No income records found. Add your first income record to get started!
            </p>
          ) : (
            <div className="space-y-4">
              {incomeRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium">{record.source}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.quarter} {record.year}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-success">
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

export default Income;