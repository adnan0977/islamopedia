"use client";

import { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Calculator, 
  Coins, 
  TrendingUp, 
  HelpCircle, 
  CheckCircle2, 
  AlertCircle,
  Info,
  ShieldCheck,
  Briefcase,
  Wallet,
  Scale
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function ZakatCalculatorPage() {
  const router = useRouter();

  // State: Assets
  const [assets, setAssets] = useState({
    cash: 0,
    bank: 0,
    gold: 0,
    silver: 0,
    stocks: 0,
    pension: 0,
    moneyOwed: 0,
    businessAssets: 0,
  });

  // State: Liabilities
  const [liabilities, setLiabilities] = useState({
    debts: 0,
    bills: 0,
    other: 0,
  });

  // State: Market Prices (User adjustable for precision)
  const [goldPrice, setGoldPrice] = useState(65.50); // per gram
  const [silverPrice, setSilverPrice] = useState(0.85); // per gram

  // Calculations
  const totalAssets = useMemo(() => {
    return Object.values(assets).reduce((acc, val) => acc + val, 0);
  }, [assets]);

  const totalLiabilities = useMemo(() => {
    return Object.values(liabilities).reduce((acc, val) => acc + val, 0);
  }, [liabilities]);

  const netWealth = Math.max(0, totalAssets - totalLiabilities);

  // Nisab Calculation (Defaulting to Silver as it's the more common threshold for charity)
  const NISAB_SILVER_GRAMS = 612.36;
  const currentNisab = NISAB_SILVER_GRAMS * silverPrice;
  const isAboveNisab = netWealth >= currentNisab;
  const zakatPayable = isAboveNisab ? netWealth * 0.025 : 0;

  const handleAssetChange = (key: keyof typeof assets, value: string) => {
    setAssets(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  const handleLiabilityChange = (key: keyof typeof liabilities, value: string) => {
    setLiabilities(prev => ({ ...prev, [key]: parseFloat(value) || 0 }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-10 pb-32 animate-in fade-in duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/more')} className="rounded-2xl h-12 w-12 border-zinc-200">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">Zakat Calculator</h1>
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Wealth Purification Engine</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-zinc-50 px-4 py-2 rounded-2xl border border-zinc-100">
          <ShieldCheck className="w-4 h-4 text-zinc-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Encrypted Local Computation</span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Column */}
        <div className="lg:col-span-7 space-y-8">
          {/* Assets Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-zinc-900 rounded-xl">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900">Zakatable Assets</h2>
            </div>

            <Card className="border-none bg-white shadow-xl rounded-[2rem] overflow-hidden">
              <CardContent className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    Cash at Home & Bank <AssetTooltip content="Include all liquid cash, savings, and digital wallet balances." />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 font-bold">$</span>
                    <Input 
                      type="number" 
                      className="pl-8 h-12 rounded-xl bg-zinc-50 border-zinc-100 font-bold" 
                      onChange={(e) => handleAssetChange('bank', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    Gold Value <AssetTooltip content="The current market value of your total gold holdings." />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 font-bold">$</span>
                    <Input 
                      type="number" 
                      className="pl-8 h-12 rounded-xl bg-zinc-50 border-zinc-100 font-bold" 
                      onChange={(e) => handleAssetChange('gold', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    Stocks & Investments <AssetTooltip content="Include the market value of shares, crypto, and mutual funds." />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 font-bold">$</span>
                    <Input 
                      type="number" 
                      className="pl-8 h-12 rounded-xl bg-zinc-50 border-zinc-100 font-bold" 
                      onChange={(e) => handleAssetChange('stocks', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    Business Assets <AssetTooltip content="Include business cash, stock for trade, and invoices owed to you." />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 font-bold">$</span>
                    <Input 
                      type="number" 
                      className="pl-8 h-12 rounded-xl bg-zinc-50 border-zinc-100 font-bold" 
                      onChange={(e) => handleAssetChange('businessAssets', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Liabilities Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-zinc-100 rounded-xl border">
                <Scale className="w-4 h-4 text-zinc-400" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900">Deductible Liabilities</h2>
            </div>

            <Card className="border-none bg-zinc-50/50 shadow-sm border border-zinc-100 rounded-[2rem] overflow-hidden">
              <CardContent className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    Personal Debts <AssetTooltip content="Money you currently owe to others that is due now." />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 font-bold">$</span>
                    <Input 
                      type="number" 
                      className="pl-8 h-12 rounded-xl bg-white border-zinc-100 font-bold" 
                      onChange={(e) => handleLiabilityChange('debts', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                    Bills Due <AssetTooltip content="Include immediate utility bills, rent, or taxes due." />
                  </Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-300 font-bold">$</span>
                    <Input 
                      type="number" 
                      className="pl-8 h-12 rounded-xl bg-white border-zinc-100 font-bold" 
                      onChange={(e) => handleLiabilityChange('bills', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-5 space-y-8">
          <section className="sticky top-24 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-zinc-900 rounded-xl">
                <Calculator className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900">Audit Summary</h2>
            </div>

            <Card className="border-none bg-zinc-900 text-white shadow-2xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="p-10 pb-6 border-b border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Zakat Payable</span>
                  {isAboveNisab ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-none px-3 py-1 rounded-full text-[8px] font-black uppercase">Threshold Met</Badge>
                  ) : (
                    <Badge className="bg-zinc-800 text-zinc-500 border-none px-3 py-1 rounded-full text-[8px] font-black uppercase">Below Nisab</Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black tracking-tighter">
                    ${zakatPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="p-10 space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total Assets</span>
                    <span className="font-black text-lg">${totalAssets.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Total Liabilities</span>
                    <span className="font-black text-lg text-red-400">-${totalLiabilities.toLocaleString()}</span>
                  </div>
                  <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Net Wealth</span>
                    <span className="font-black text-2xl text-emerald-400">${netWealth.toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Info className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Nisab Reference (Silver)</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-300">Minimum Threshold</span>
                    <span className="font-black text-zinc-300">${currentNisab.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <p className="text-[9px] text-zinc-500 leading-relaxed italic">
                    Nisab is the minimum wealth amount required for Zakat. If your net wealth stays above this for a lunar year, 2.5% is due.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="p-10 pt-0">
                <Button className="w-full h-14 rounded-2xl bg-white text-zinc-900 font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                  Commit Reflection
                </Button>
              </CardFooter>
            </Card>

            <Card className="border-none bg-zinc-50 rounded-[2rem] p-8 shadow-inner">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shrink-0 border border-zinc-100 shadow-sm">
                  <ShieldCheck className="w-5 h-5 text-zinc-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Security Note</p>
                  <p className="text-xs font-medium text-zinc-400 leading-relaxed">
                    This calculator operates purely on the client-side. Your financial data is not transmitted to any server or stored in any database.
                  </p>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

function AssetTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" className="text-zinc-300 hover:text-zinc-900 transition-colors">
            <HelpCircle className="w-3 h-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-zinc-900 text-white border-none rounded-xl p-3 max-w-[200px]">
          <p className="text-[10px] font-medium leading-relaxed">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
