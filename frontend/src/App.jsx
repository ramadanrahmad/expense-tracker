import { useState, useEffect, useRef } from 'react';
import { 
  Bot, ArrowUpRight, ArrowDownRight, Trash2, BarChart2, 
  PieChart as PieChartIcon, PenTool, Filter, Target, Edit2,
  Sun, Moon, CreditCard, Plus
} from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import SakugaFX from './utils/sakugaCore';
import { runInkThemeTransition } from './utils/inkTransition';
import {
  SakugaButton,
  SakugaInput,
  SakugaSelect,
  triggerDeleteFx,
  triggerProgressFx
} from './components/SakugaControls';

const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? `http://${window.location.hostname}:8000` : 'http://localhost:8000');
const COLORS = ['#EF4444', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

function App() {
  // Theme State
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    SakugaFX?.setPalette?.(theme);
  }, [theme]);

  const toggleTheme = async (e) => {
    const btnEl = e.currentTarget;
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    await runInkThemeTransition(btnEl, nextTheme, () => {
      SakugaFX?.setPalette?.(nextTheme);
      localStorage.setItem('theme', nextTheme);
      setTheme(nextTheme);
    });
  };

  // LocalStorage Initializers
  const [transactions, setTransactions] = useState(() => JSON.parse(localStorage.getItem('transactions')) || []);
  const [categories, setCategories] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('categories'));
    if (saved) {
      return saved.map(c =>
        c.name === 'Bayar Pinjol'
          ? { ...c, name: 'Bayar Cicilan' }
          : c.name === 'Tambah Pinjol'
          ? { ...c, name: 'Tambah Cicilan' }
          : c
      );
    }
    return [
      { id: 1, name: 'Makanan & Minuman', type: 'expense' },
      { id: 2, name: 'Transportasi', type: 'expense' },
      { id: 3, name: 'Gaji', type: 'income' },
      { id: 4, name: 'Lainnya', type: 'expense' },
      { id: 5, name: 'Bayar Cicilan', type: 'debt_payment' },
      { id: 6, name: 'Tambah Cicilan', type: 'debt_add' }
    ];
  });
  
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [balance, setBalance] = useState({ total: 0, income: 0, expense: 0 });
  
  // Chart Data States
  const [chartData, setChartData] = useState([]);
  const [expenseCatData, setExpenseCatData] = useState([]);
  const [incomeCatData, setIncomeCatData] = useState([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState('ai'); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter States
  const [filterType, setFilterType] = useState('all');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  // Cicilan / Tanggungan State (1 Total Gabungan)
  const [initialCicilan, setInitialCicilan] = useState(() => {
    const val = localStorage.getItem('initialCicilan') ?? localStorage.getItem('initialPinjol');
    return Number(val) || 0;
  });
  const [isEditingCicilan, setIsEditingCicilan] = useState(false);
  const [cicilanInput, setCicilanInput] = useState('');
  const cicilanCardRef = useRef(null);

  const totalDebtAdd = transactions
    .filter(t => t.transaction_type === 'debt_add')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalDebtPaid = transactions
    .filter(t => t.transaction_type === 'debt_payment')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalCicilan = Math.max(0, initialCicilan + totalDebtAdd - totalDebtPaid);
  const netBalance = balance.total - totalCicilan;

  const celebrateCicilanUpdate = () => {
    if (cicilanCardRef.current && SakugaFX) {
      const c = SakugaFX.at(cicilanCardRef.current);
      SakugaFX.kira(c.x + c.w * 0.25, c.y - 14, { r: 13, life: 0.7 });
      SakugaFX.ticks(c.x, c.y - c.h / 2 - 4, { dir: -Math.PI / 2, n: 3, r: 4, len: 14, life: 0.45 });
    }
  };

  const saveCicilan = () => {
    const rawValue = String(cicilanInput).replace(/\D/g, '');
    const desiredTotal = Number(rawValue) || 0;
    const netDebtDelta = totalDebtAdd - totalDebtPaid;
    const nextInitial = desiredTotal - netDebtDelta;
    setInitialCicilan(nextInitial);
    localStorage.setItem('initialCicilan', String(nextInitial));
    setIsEditingCicilan(false);
    setTimeout(() => celebrateCicilanUpdate(), 80);
  };

  // Target State
  const [targetIncome, setTargetIncome] = useState(() => Number(localStorage.getItem('targetIncome')) || 0);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const progressRef = useRef(null);
  const balanceCardRef = useRef(null);
  const prevTargetReachedRef = useRef(false);

  const saveTarget = () => {
    const rawValue = String(targetInput).replace(/\D/g, '');
    const val = Number(rawValue) || 0;
    setTargetIncome(val);
    localStorage.setItem('targetIncome', val);
    setIsEditingTarget(false);
    const pct = val > 0 ? (balance.income / val) * 100 : 0;
    setTimeout(() => {
      triggerProgressFx(progressRef.current, val > 0 && pct >= 100);
    }, 80);
  };
  
  const targetPercentage = targetIncome > 0 ? (balance.income / targetIncome) * 100 : 0;

  useEffect(() => {
    const reached = targetIncome > 0 && targetPercentage >= 100;
    if (reached && !prevTargetReachedRef.current) {
      triggerProgressFx(progressRef.current, true);
    }
    prevTargetReachedRef.current = reached;
  }, [targetPercentage, targetIncome]);

  // Input States
  const [nlpInput, setNlpInput] = useState('');
  const [manualForm, setManualForm] = useState({
    amount: '',
    transaction_type: 'expense',
    date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    category_name: 'Makanan & Minuman',
    description: '',
    isNewCategory: false
  });

  // Save to LocalStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  // Process data for UI based on filters (Exact Original Logic)
  useEffect(() => {
    let filtered = [...transactions];
    const today = new Date();
    
    if (filterType === '7days') {
      const past = new Date(today);
      past.setDate(today.getDate() - 6);
      past.setHours(0, 0, 0, 0);
      filtered = filtered.filter(t => new Date(t.date) >= past);
    } else if (filterType === 'month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
      filtered = filtered.filter(t => new Date(t.date) >= start && new Date(t.date) <= end);
    } else if (filterType === 'year') {
      const start = new Date(today.getFullYear(), 0, 1);
      const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
      filtered = filtered.filter(t => new Date(t.date) >= start && new Date(t.date) <= end);
    } else if (filterType === 'custom') {
      if (customRange.start) {
        filtered = filtered.filter(t => new Date(t.date) >= new Date(customRange.start));
      }
      if (customRange.end) {
        const endDay = new Date(customRange.end);
        endDay.setHours(23, 59, 59);
        filtered = filtered.filter(t => new Date(t.date) <= endDay);
      }
    }

    // Sort descending by date
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    setFilteredTransactions(filtered);

    // Calculations
    let inc = 0;
    let exp = 0;
    const groupedBy = {};
    const expByCategory = {};
    const incByCategory = {};
    
    const isYearly = filterType === 'year';

    filtered.forEach(t => {
      const amt = Number(t.amount) || 0;
      if (t.transaction_type === 'debt_add') {
        // Penambahan nilai cicilan tidak menambah atau mengurangi Total Uang
        return;
      }

      if (t.transaction_type === 'income') inc += amt;
      else exp += amt; // 'expense' dan 'debt_payment' sama-sama memotong Total Uang

      const dateObj = new Date(t.date);
      let key = '';
      if (isYearly) {
        key = dateObj.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
      } else {
        key = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      }

      if (!groupedBy[key]) groupedBy[key] = { name: key, income: 0, expense: 0, rawDate: dateObj.getTime() };
      if (t.transaction_type === 'income') groupedBy[key].income += amt;
      else groupedBy[key].expense += amt;
      
      const catName = t.category?.name || (t.transaction_type === 'debt_payment' ? 'Bayar Cicilan' : 'Lainnya');
      if (t.transaction_type === 'income') {
        incByCategory[catName] = (incByCategory[catName] || 0) + amt;
      } else {
        expByCategory[catName] = (expByCategory[catName] || 0) + amt;
      }
    });

    setBalance({ total: inc - exp, income: inc, expense: exp });
    
    const cData = Object.values(groupedBy).sort((a, b) => a.rawDate - b.rawDate);
    setChartData(cData);
    
    setExpenseCatData(Object.keys(expByCategory).map(k => ({ name: k, value: expByCategory[k] })).sort((a, b) => b.value - a.value));
    setIncomeCatData(Object.keys(incByCategory).map(k => ({ name: k, value: incByCategory[k] })).sort((a, b) => b.value - a.value));

  }, [transactions, filterType, customRange]);

  const celebrateBalanceUpdate = () => {
    if (balanceCardRef.current && SakugaFX) {
      const c = SakugaFX.at(balanceCardRef.current);
      SakugaFX.kira(c.x + c.w * 0.25, c.y - 16, { r: 14, life: 0.75 });
      SakugaFX.kira(c.x - c.w * 0.2, c.y - 24, { r: 10, life: 0.65 });
    }
  };

  const handleNlpSubmit = async (e) => {
    e.preventDefault();
    if (!nlpInput.trim()) return;
    
    setIsSubmitting(true);
    try {
      const res = await axios.post(`${API_URL}/parse-nlp`, { text: nlpInput });
      const parsedDataList = res.data;

      const newTransactions = [];
      let currentCategories = [...categories];

      let hasCicilanUpdate = false;
      parsedDataList.forEach(parsed => {
        let catType = parsed.type || "expense";
        const rawCat = parsed.category || "";
        const lowerCat = rawCat.toLowerCase();
        if (catType === "expense" && (lowerCat.includes("bayar pinjol") || lowerCat.includes("bayar cicilan"))) {
          catType = "debt_payment";
        } else if (lowerCat.includes("tambah pinjol") || lowerCat.includes("tambah cicilan")) {
          catType = "debt_add";
        }
        if (catType === "debt_payment" || catType === "debt_add") {
          hasCicilanUpdate = true;
        }
        const defaultCat = catType === "debt_payment" ? "Bayar Cicilan" : catType === "debt_add" ? "Tambah Cicilan" : "Lainnya";
        const catName =
          catType === "debt_payment" && lowerCat.includes("pinjol")
            ? "Bayar Cicilan"
            : catType === "debt_add" && lowerCat.includes("pinjol")
            ? "Tambah Cicilan"
            : rawCat || defaultCat;
        
        let category = currentCategories.find(c => c.name.toLowerCase() === catName.toLowerCase() && c.type === catType);
        if (!category) {
          category = { id: Date.now() + Math.random(), name: catName, type: catType };
          currentCategories.push(category);
        }

        newTransactions.push({
          id: Date.now() + Math.random(),
          amount: parsed.amount,
          transaction_type: catType,
          date: parsed.date || new Date().toISOString(),
          description: parsed.description,
          input_method: 'nlp',
          category: category
        });
      });

      setCategories(currentCategories);
      setTransactions([...transactions, ...newTransactions]);
      setNlpInput('');
      celebrateBalanceUpdate();
      if (hasCicilanUpdate) celebrateCicilanUpdate();
      
    } catch (error) {
      alert("Gagal memproses input teks. Pastikan format teks jelas dan koneksi backend aktif.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.amount) return;
    
    let currentCategories = [...categories];
    let category = currentCategories.find(c => c.name === manualForm.category_name && c.type === manualForm.transaction_type);
    
    if (!category) {
      category = { id: Date.now() + Math.random(), name: manualForm.category_name || "Lainnya", type: manualForm.transaction_type };
      currentCategories.push(category);
      setCategories(currentCategories);
    }

    const defaultDesc =
      manualForm.transaction_type === 'debt_payment'
        ? 'Bayar Cicilan'
        : manualForm.transaction_type === 'debt_add'
        ? 'Tambah Cicilan'
        : '-';

    const newTx = {
      id: Date.now() + Math.random(),
      amount: parseFloat(manualForm.amount.toString().replace(/\./g, '')),
      transaction_type: manualForm.transaction_type,
      date: new Date(manualForm.date).toISOString(),
      description: manualForm.description || defaultDesc,
      input_method: 'manual',
      category: category
    };

    setTransactions([...transactions, newTx]);
    setManualForm({ ...manualForm, amount: '', description: '', isNewCategory: false });
    if (manualForm.transaction_type === 'debt_payment' || manualForm.transaction_type === 'debt_add') {
      celebrateCicilanUpdate();
    }
    if (manualForm.transaction_type !== 'debt_add') {
      celebrateBalanceUpdate();
    }
  };

  const availableManualCategories = (() => {
    const matched = categories.filter(c => c.type === manualForm.transaction_type);
    if (matched.length > 0) return matched;
    if (manualForm.transaction_type === 'debt_payment') {
      return [{ id: 'default-debt-pay', name: 'Bayar Cicilan', type: 'debt_payment' }];
    }
    if (manualForm.transaction_type === 'debt_add') {
      return [{ id: 'default-debt-add', name: 'Tambah Cicilan', type: 'debt_add' }];
    }
    return [];
  })();

  const handleDelete = (id, e) => {
    const btnEl = e?.currentTarget;
    if (!window.confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
    triggerDeleteFx(btnEl);
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number || 0);
  };

  return (
    <div className="container">
      {/* Header - Manga Style Aesthetic with Theme Toggle */}
      <header className="app-header">
        <div className="brand-badge">
          <div className="brand-icon-box">M</div>
          <div>
            <h1 className="brand-title">MONETA</h1>
            <p className="brand-sub">Finance App</p>
          </div>
        </div>
        <div className="header-right-actions">
          <SakugaButton
            variant="icon"
            suppressCanvasFx
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Beralih ke Mode Gelap' : 'Beralih ke Mode Terang'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </SakugaButton>
          <div className="header-date-badge">
            {new Date().toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </header>

      {/* Filter Waktu Section */}
      <section className="minimal-card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} style={{ color: 'var(--text-main)' }} />
            <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-main)' }}>Filter Waktu</h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--accent-manga)', fontWeight: 800, textTransform: 'uppercase' }}>
            {filterType === 'all' ? 'Semua Waktu' : filterType === '7days' ? '7 Hari Terakhir' : filterType === 'month' ? 'Bulan Ini' : filterType === 'year' ? 'Tahun Ini' : 'Periode Kustom'}
          </span>
        </div>
        
        <div className="filter-bar">
          <SakugaButton 
            variant="pill"
            sfxWord="kachi"
            onClick={() => setFilterType(filterType === '7days' ? 'all' : '7days')} 
            className={`filter-btn ${filterType === '7days' ? 'active' : ''}`}
          >
            Minggu
          </SakugaButton>
          <SakugaButton 
            variant="pill"
            sfxWord="kachi"
            onClick={() => setFilterType(filterType === 'month' ? 'all' : 'month')} 
            className={`filter-btn ${filterType === 'month' ? 'active' : ''}`}
          >
            Bulan
          </SakugaButton>
          <SakugaButton 
            variant="pill"
            sfxWord="kachi"
            onClick={() => setFilterType(filterType === 'year' ? 'all' : 'year')} 
            className={`filter-btn ${filterType === 'year' ? 'active' : ''}`}
          >
            Tahun
          </SakugaButton>
          <SakugaButton 
            variant="pill"
            sfxWord="kachi"
            onClick={() => setFilterType(filterType === 'custom' ? 'all' : 'custom')} 
            className={`filter-btn ${filterType === 'custom' ? 'active' : ''}`}
          >
            Periode
          </SakugaButton>
        </div>

        {filterType === 'custom' && (
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            <div style={{ flex: 1 }}>
              <label className="input-label">Dari Tanggal</label>
              <SakugaInput 
                type="date" 
                className="minimal-input" 
                value={customRange.start} 
                onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="input-label">Sampai Tanggal</label>
              <SakugaInput 
                type="date" 
                className="minimal-input" 
                value={customRange.end} 
                onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })} 
              />
            </div>
          </div>
        )}
      </section>

      {/* Balance Card - Manga Hero Panel */}
      <section ref={balanceCardRef} className="balance-card">
        <div>
          <span className="balance-label">
            {filterType === 'all' ? 'Total Saldo' : `Total Saldo (${filterType === '7days' ? 'Minggu' : filterType === 'month' ? 'Bulan' : filterType === 'year' ? 'Tahun' : 'Periode'})`}
          </span>
          <div className="balance-amount">{formatRupiah(balance.total)}</div>
        </div>

        <div className="balance-breakdown-row">
          <div className="breakdown-item">
            <div className="breakdown-icon income">
              <ArrowUpRight size={18} strokeWidth={2.2} />
            </div>
            <div>
              <p className="breakdown-label">Pemasukan</p>
              <p className="breakdown-val" style={{ color: 'var(--success)' }}>+{formatRupiah(balance.income)}</p>
            </div>
          </div>
          <div style={{ width: '2px', height: '28px', background: 'var(--ink-border)' }}></div>
          <div className="breakdown-item" style={{ justifyContent: 'flex-end', textAlign: 'right' }}>
            <div style={{ textAlign: 'right' }}>
              <p className="breakdown-label">Pengeluaran</p>
              <p className="breakdown-val" style={{ color: 'var(--danger)' }}>-{formatRupiah(balance.expense)}</p>
            </div>
            <div className="breakdown-icon expense">
              <ArrowDownRight size={18} strokeWidth={2.2} />
            </div>
          </div>
        </div>
      </section>

      {/* Total Cicilan Card (1 Total Gabungan) */}
      <section ref={cicilanCardRef} className="minimal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
            <CreditCard size={15} style={{ color: 'var(--accent-manga)' }} /> Total Cicilan
          </h3>
          {isEditingCicilan ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <SakugaInput
                type="text"
                className="minimal-input"
                placeholder="Nominal"
                value={cicilanInput}
                onChange={e => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  const formattedValue = rawValue ? parseInt(rawValue, 10).toLocaleString('id-ID') : '';
                  setCicilanInput(formattedValue);
                }}
                style={{ padding: '4px 8px', width: '115px', fontSize: '12px' }}
              />
              <SakugaButton
                variant="primary"
                className="btn-primary"
                onClick={saveCicilan}
                style={{ padding: '4px 10px', width: 'auto', fontSize: '11px', borderRadius: '3px' }}
              >
                Simpan
              </SakugaButton>
            </div>
          ) : (
            <SakugaButton
              variant="icon"
              sfxWord="kachi"
              onClick={() => { setIsEditingCicilan(true); setCicilanInput(totalCicilan ? totalCicilan.toLocaleString('id-ID') : ''); }}
              style={{ background: 'var(--bg-subtle)', border: '1.5px solid var(--ink-border)', borderRadius: '3px', color: 'var(--text-main)', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
              title="Atur Total Cicilan"
            >
              <Edit2 size={14} />
            </SakugaButton>
          )}
        </div>

        <div className="pinjol-amount" style={{ color: totalCicilan > 0 ? 'var(--danger)' : 'var(--success)' }}>
          {formatRupiah(totalCicilan)}
        </div>

        <div className="balance-breakdown-row" style={{ paddingTop: '10px' }}>
          <div>
            <p className="breakdown-label">Total Terbayar</p>
            <p className="breakdown-val" style={{ color: 'var(--success)' }}>{formatRupiah(totalDebtPaid)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="breakdown-label">Saldo Bersih</p>
            <p className="breakdown-val" style={{ color: netBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {formatRupiah(netBalance)}
            </p>
          </div>
        </div>
      </section>

      {/* Target Pemasukan Card */}
      <section className="minimal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
            <Target size={16} style={{ color: 'var(--accent-manga)' }} /> Target Pemasukan
          </h3>
          {isEditingTarget ? (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <SakugaInput 
                type="text" 
                className="minimal-input" 
                placeholder="Nominal" 
                value={targetInput} 
                onChange={e => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  const formattedValue = rawValue ? parseInt(rawValue, 10).toLocaleString('id-ID') : '';
                  setTargetInput(formattedValue);
                }} 
                style={{ padding: '4px 8px', width: '110px', fontSize: '12px' }} 
              />
              <SakugaButton 
                variant="primary"
                className="btn-primary" 
                onClick={saveTarget} 
                style={{ padding: '4px 10px', width: 'auto', fontSize: '11px', borderRadius: '3px' }}
              >
                Simpan
              </SakugaButton>
            </div>
          ) : (
            <SakugaButton 
              variant="icon"
              sfxWord="kachi"
              onClick={() => { setIsEditingTarget(true); setTargetInput(targetIncome ? targetIncome.toLocaleString('id-ID') : ''); }}
              style={{ background: 'var(--bg-subtle)', border: '1.5px solid var(--ink-border)', borderRadius: '3px', color: 'var(--text-main)', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}
              title="Edit Target"
            >
              <Edit2 size={14} />
            </SakugaButton>
          )}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
          <span>Tercapai: <strong style={{ color: 'var(--text-main)' }}>{formatRupiah(balance.income)}</strong></span>
          <span>Target: <strong style={{ color: 'var(--text-main)' }}>{formatRupiah(targetIncome)}</strong></span>
        </div>
        
        {/* Progress Bar (Manga Style) */}
        <div ref={progressRef} className="progress-track">
          <div 
            className={`progress-fill ${targetPercentage >= 100 ? 'success' : ''}`}
            style={{ width: `${Math.min(targetPercentage, 100)}%` }}
          ></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span>Progres: {targetPercentage.toFixed(1)}%</span>
          {targetPercentage >= 100 && targetIncome > 0 && (
            <span style={{ color: 'var(--success)', fontWeight: 700 }}>🎉 Target Tercapai!</span>
          )}
        </div>
      </section>

      {/* Bar Chart Section - Manga Comic Styled */}
      {chartData.length > 0 && (
        <section className="minimal-card">
          <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
            <BarChart2 size={16} style={{ color: 'var(--text-main)' }} /> Arus Kas
          </h3>
          <div style={{ height: '190px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" stroke="var(--chart-axis)" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'var(--chart-cursor)' }} 
                  contentStyle={{ 
                    backgroundColor: 'var(--tooltip-bg)', 
                    border: '2px solid var(--tooltip-border)', 
                    borderRadius: '4px', 
                    color: 'var(--tooltip-text)', 
                    fontSize: '11px',
                    fontWeight: 700,
                    boxShadow: '3px 3px 0px var(--ink-shadow)'
                  }} 
                  itemStyle={{ color: 'var(--tooltip-text)', fontSize: '11px', fontWeight: 700 }}
                  formatter={(value, name) => [
                    formatRupiah(value), 
                    <span style={{ color: name === 'Pemasukan' ? 'var(--success)' : 'var(--danger)', fontWeight: 800 }}>{name}</span>
                  ]} 
                />
                <Bar dataKey="income" fill="#10B981" stroke="var(--ink-border)" strokeWidth={2} radius={[2, 2, 0, 0]} name="Pemasukan" />
                <Bar dataKey="expense" fill="#EF4444" stroke="var(--ink-border)" strokeWidth={2} radius={[2, 2, 0, 0]} name="Pengeluaran" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Pie Chart Section - Manga Comic Styled */}
      {(expenseCatData.length > 0 || incomeCatData.length > 0) && (
        <section className="minimal-card">
          <h3 style={{ fontSize: '13px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
            <PieChartIcon size={16} style={{ color: 'var(--text-main)' }} /> Rincian Kategori
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {expenseCatData.length > 0 && (
              <div>
                <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '6px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Komposisi Pengeluaran
                </h4>
                <div style={{ height: '180px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseCatData} innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="var(--ink-border)" strokeWidth={2}>
                        {expenseCatData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatRupiah(value)} 
                        contentStyle={{ 
                          backgroundColor: 'var(--tooltip-bg)', 
                          border: '2px solid var(--tooltip-border)', 
                          borderRadius: '4px', 
                          color: 'var(--tooltip-text)', 
                          fontSize: '11px',
                          fontWeight: 700,
                          boxShadow: '3px 3px 0px var(--ink-shadow)'
                        }} 
                        itemStyle={{ color: 'var(--tooltip-text)', fontWeight: 700 }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            
            {incomeCatData.length > 0 && (
              <div>
                <h4 style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '6px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Sumber Pemasukan
                </h4>
                <div style={{ height: '180px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={incomeCatData} innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value" stroke="var(--ink-border)" strokeWidth={2}>
                        {incomeCatData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => formatRupiah(value)} 
                        contentStyle={{ 
                          backgroundColor: 'var(--tooltip-bg)', 
                          border: '2px solid var(--tooltip-border)', 
                          borderRadius: '4px', 
                          color: 'var(--tooltip-text)', 
                          fontSize: '11px',
                          fontWeight: 700,
                          boxShadow: '3px 3px 0px var(--ink-shadow)'
                        }} 
                        itemStyle={{ color: 'var(--tooltip-text)', fontWeight: 700 }}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Input Section - AI vs Manual with Sakuga Animations */}
      <section className="minimal-card">
        <div className="tab-switch">
          <SakugaButton 
            variant="pill"
            sfxWord="shu"
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          >
            <Bot size={16} /> AI Input
          </SakugaButton>
          <SakugaButton 
            variant="pill"
            sfxWord="shu"
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
          >
            <PenTool size={16} /> Manual Input
          </SakugaButton>
        </div>

        <div>
          {activeTab === 'ai' ? (
            <form onSubmit={handleNlpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <SakugaInput 
                  type="text" 
                  className="minimal-input" 
                  placeholder='Cth: "Dapat 100rb, belanja 50rb, bayar cicilan 50rb"'
                  value={nlpInput}
                  onChange={(e) => setNlpInput(e.target.value)}
                  disabled={isSubmitting}
                />
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Ketikkan cerita transaksi Anda (termasuk bayar atau tambah cicilan), AI akan memecahnya otomatis.
                </p>
              </div>
              <SakugaButton 
                variant="primary" 
                fullWidth 
                type="submit" 
                className="btn-primary" 
                disabled={isSubmitting || !nlpInput.trim()}
              >
                {isSubmitting ? 'Memproses AI (Butuh Internet)...' : 'Catat Transaksi'}
              </SakugaButton>
            </form>
          ) : (
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Jenis</label>
                  <SakugaSelect 
                    className="minimal-input" 
                    value={manualForm.transaction_type} 
                    onChange={(e) => {
                      const newType = e.target.value;
                      const filteredCats = categories.filter(c => c.type === newType);
                      const fallbackCat =
                        newType === 'debt_payment'
                          ? 'Bayar Cicilan'
                          : newType === 'debt_add'
                          ? 'Tambah Cicilan'
                          : '';
                      setManualForm({
                        ...manualForm, 
                        transaction_type: newType,
                        category_name: filteredCats.length > 0 ? filteredCats[0].name : fallbackCat,
                        isNewCategory: false
                      });
                    }}
                  >
                    <option value="expense">Pengeluaran (-Saldo)</option>
                    <option value="income">Pemasukan (+Saldo)</option>
                    <option value="debt_payment">Bayar Cicilan (-Saldo, -Cicilan)</option>
                    <option value="debt_add">Tambah Cicilan (+Cicilan)</option>
                  </SakugaSelect>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="input-label">Tanggal & Jam</label>
                  <SakugaInput 
                    type="datetime-local" 
                    className="minimal-input" 
                    value={manualForm.date} 
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })} 
                  />
                </div>
              </div>
              
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Kategori</label>
                  <SakugaButton 
                    variant="pill"
                    sfxWord="pon"
                    type="button"
                    onClick={() => {
                      if (manualForm.isNewCategory) {
                        const filtered = availableManualCategories;
                        setManualForm({ ...manualForm, isNewCategory: false, category_name: filtered.length > 0 ? filtered[0].name : '' });
                      } else {
                        setManualForm({ ...manualForm, isNewCategory: true, category_name: '' });
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-manga)', fontSize: '11px', cursor: 'pointer', fontWeight: 800, textTransform: 'uppercase' }}
                  >
                    {manualForm.isNewCategory ? 'Batal Tambah' : '+ Kategori Baru'}
                  </SakugaButton>
                </div>
                
                {!manualForm.isNewCategory ? (
                  <SakugaSelect 
                    className="minimal-input" 
                    value={manualForm.category_name} 
                    onChange={(e) => setManualForm({ ...manualForm, category_name: e.target.value })}
                  >
                    {availableManualCategories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </SakugaSelect>
                ) : (
                  <SakugaInput 
                    type="text" 
                    className="minimal-input" 
                    placeholder="Ketik nama kategori baru..." 
                    value={manualForm.category_name} 
                    onChange={(e) => setManualForm({ ...manualForm, category_name: e.target.value })} 
                    required 
                  />
                )}
              </div>

              <div>
                <label className="input-label">Nominal (Rp)</label>
                <SakugaInput 
                  type="text" 
                  inputMode="numeric"
                  className="minimal-input" 
                  placeholder="0" 
                  value={manualForm.amount} 
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, '');
                    if (!rawValue) {
                      setManualForm({ ...manualForm, amount: '' });
                      return;
                    }
                    const formattedValue = new Intl.NumberFormat('id-ID').format(rawValue);
                    setManualForm({ ...manualForm, amount: formattedValue });
                  }} 
                  required 
                />
              </div>

              <div>
                <label className="input-label">Deskripsi (Opsional)</label>
                <SakugaInput 
                  type="text" 
                  className="minimal-input" 
                  placeholder="Catatan transaksi (opsional)..." 
                  value={manualForm.description} 
                  onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })} 
                />
              </div>
              
              <SakugaButton 
                variant="primary" 
                fullWidth 
                type="submit" 
                className="btn-primary" 
                disabled={isSubmitting}
              >
                Simpan Manual
              </SakugaButton>
            </form>
          )}
        </div>
      </section>

      {/* Riwayat Transaksi - Exact Grouping & Format */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-main)' }}>Riwayat Transaksi</h3>
        
        {filteredTransactions.length === 0 ? (
          <div className="minimal-card" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
            Belum ada transaksi di rentang waktu ini.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(
              filteredTransactions.reduce((acc, tx) => {
                const dateStr = new Date(tx.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                if (!acc[dateStr]) acc[dateStr] = [];
                acc[dateStr].push(tx);
                return acc;
              }, {})
            ).map(([dateLabel, dailyTxs]) => (
              <div key={dateLabel}>
                <div className="tx-group-header">{dateLabel}</div>
                {dailyTxs.map((tx) => (
                  <div key={tx.id} className="tx-card">
                    <div className="tx-left">
                      <div className={`tx-icon-squircle ${tx.transaction_type}`}>
                        {tx.transaction_type === 'income' ? (
                          <ArrowUpRight size={18} strokeWidth={2.2} />
                        ) : tx.transaction_type === 'debt_add' ? (
                          <Plus size={18} strokeWidth={2.4} />
                        ) : (
                          <ArrowDownRight size={18} strokeWidth={2.2} />
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p className="tx-desc">{tx.description}</p>
                        <div className="tx-meta">
                          <span>{tx.category?.name || 'Lainnya'}</span>
                          <span>•</span>
                          <span>{new Date(tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                          {tx.input_method === 'nlp' ? (
                            <span className="badge-method ai" title="Dicatat via AI">AI</span>
                          ) : (
                            <span className="badge-method" title="Dicatat Manual">Manual</span>
                          )}
                          {tx.transaction_type === 'debt_payment' && (
                            <span className="badge-method pinjol-pay">Cicilan -</span>
                          )}
                          {tx.transaction_type === 'debt_add' && (
                            <span className="badge-method pinjol-add">Cicilan +</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="tx-right">
                      <p className={`tx-amount ${tx.transaction_type}`}>
                        {tx.transaction_type === 'income' || tx.transaction_type === 'debt_add' ? '+' : '-'}
                        {formatRupiah(tx.amount)}
                      </p>
                      <button 
                        onClick={(e) => handleDelete(tx.id, e)}
                        className="btn-delete"
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
