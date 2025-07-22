-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quarters enum for tracking periods
CREATE TYPE quarter_period AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- Create currencies enum
CREATE TYPE currency_type AS ENUM ('USD', 'GHS');

-- Create income records table
CREATE TABLE public.income_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quarter quarter_period NOT NULL,
  year INTEGER NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency currency_type NOT NULL DEFAULT 'USD',
  source TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense categories table
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default expense categories
INSERT INTO public.expense_categories (name, description) VALUES
('Housing', 'Rent, utilities, maintenance'),
('Transportation', 'Car payments, fuel, public transport'),
('Food', 'Groceries, dining out'),
('Healthcare', 'Medical bills, insurance'),
('Entertainment', 'Movies, games, subscriptions'),
('Personal', 'Clothing, personal care'),
('Technology', 'Tech gadgets, software'),
('Other', 'Miscellaneous expenses');

-- Create expense records table
CREATE TABLE public.expense_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id),
  quarter quarter_period NOT NULL,
  year INTEGER NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency currency_type NOT NULL DEFAULT 'USD',
  description TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create savings goals table
CREATE TABLE public.savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency currency_type NOT NULL DEFAULT 'USD',
  target_date DATE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('vacation', 'car_service', 'tech_stocks', 'emergency', 'other')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create savings transactions table
CREATE TABLE public.savings_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  savings_goal_id UUID NOT NULL REFERENCES public.savings_goals(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
  description TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create currency rates table for conversion
CREATE TABLE public.currency_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency currency_type NOT NULL,
  to_currency currency_type NOT NULL,
  rate DECIMAL(15,6) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(from_currency, to_currency, date)
);

-- Insert default currency rates (approximate)
INSERT INTO public.currency_rates (from_currency, to_currency, rate) VALUES
('USD', 'GHS', 12.0),
('GHS', 'USD', 0.083);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for income records
CREATE POLICY "Users can view their own income records" ON public.income_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own income records" ON public.income_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own income records" ON public.income_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own income records" ON public.income_records
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for expense categories
CREATE POLICY "Everyone can view expense categories" ON public.expense_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage expense categories" ON public.expense_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for expense records
CREATE POLICY "Users can view their own expense records" ON public.expense_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expense records" ON public.expense_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expense records" ON public.expense_records
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expense records" ON public.expense_records
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for savings goals
CREATE POLICY "Users can view their own savings goals" ON public.savings_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own savings goals" ON public.savings_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings goals" ON public.savings_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings goals" ON public.savings_goals
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for savings transactions
CREATE POLICY "Users can view their own savings transactions" ON public.savings_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.savings_goals 
      WHERE id = savings_goal_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own savings transactions" ON public.savings_transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.savings_goals 
      WHERE id = savings_goal_id AND user_id = auth.uid()
    )
  );

-- Create RLS policies for currency rates
CREATE POLICY "Everyone can view currency rates" ON public.currency_rates
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage currency rates" ON public.currency_rates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_income_records_updated_at
  BEFORE UPDATE ON public.income_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expense_records_updated_at
  BEFORE UPDATE ON public.expense_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at
  BEFORE UPDATE ON public.savings_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE 
      WHEN NEW.email = 'admin@fms.com' THEN 'admin'
      ELSE 'user'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update savings goal current amount
CREATE OR REPLACE FUNCTION public.update_savings_goal_amount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.savings_goals 
    SET current_amount = current_amount + 
      CASE WHEN NEW.transaction_type = 'deposit' THEN NEW.amount ELSE -NEW.amount END
    WHERE id = NEW.savings_goal_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.savings_goals 
    SET current_amount = current_amount - 
      CASE WHEN OLD.transaction_type = 'deposit' THEN OLD.amount ELSE -OLD.amount END
    WHERE id = OLD.savings_goal_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for savings transactions
CREATE TRIGGER update_savings_goal_on_transaction
  AFTER INSERT OR DELETE ON public.savings_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_savings_goal_amount();