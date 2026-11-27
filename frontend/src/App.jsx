import { useState, useEffect, useRef } from 'react';
import { 
  Bot, ArrowUpRight, ArrowDownRight, Trash2, BarChart2, 
  PieChart as PieChartIcon, PenTool, Filter, Target, Edit2,
  Sun, Moon, CreditCard, Plus, History, ChevronDown, ChevronUp,
  Eye, EyeOff, Database, Download, Upload,
  FileSpreadsheet, Check, X
} from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import SakugaFX from './utils/sakugaCore';
import soundFx from './utils/soundFx';
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
  const [transactions, setTransactions] = useState(() => {
    const saved = JSON.parse(localStorage.getItem('transactions')) || [];
    return saved.map(tx => {
      if (tx.category?.name === 'Bayar Pinjol') {
        return { ...tx, category: { ...tx.category, name: 'Bayar Cicilan' } };
      }
      if (tx.category?.name === 'Tambah Pinjol') {
        return { ...tx, category: { ...tx.category, name: 'Tambah Cicilan' } };
      }
      return tx;
    });
  });
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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(() => localStorage.getItem('isPrivate') === 'true');
  const [editingTxId, setEditingTxId] = useState(null);
  const [editTxForm, setEditTxForm] = useState(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const togglePrivacy = () => {
    const next = !isPrivate;
    setIsPrivate(next);
    localStorage.setItem('isPrivate', String(next));
  };
  
  // Filter States
  const [filterType, setFilterType] = useState('all');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  // Cicilan / Tanggungan State (1 Total Gabungan)
  const [initialCicilan, setInitialCicilan] = useState(() => {
    const val = localStorage.getItem('initialCicilan') ?? localStorage.getItem('initialPinjol');
    return Number(val) || 0;
  });
  const [cicilanPaidBaseline, setCicilanPaidBaseline] = useState(() => {
    return Number(localStorage.getItem('cicilanPaidBaseline')) || 0;
  });
  const [isEditingCicilan, setIsEditingCicilan] = useState(false);
  const [cicilanInput, setCicilanInput] = useState('');
  const cicilanCardRef = useRef(null);
  const cicilanProgressRef = useRef(null);

  const totalDebtAdd = transactions
    .filter(t => t.transaction_type === 'debt_add')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalDebtPaid = transactions
    .filter(t => t.transaction_type === 'debt_payment')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalCicilan = Math.max(0, initialCicilan + totalDebtAdd - totalDebtPaid);
  const netBalance = balance.total - totalCicilan;
  const cycleDebtPaid = Math.max(0, totalDebtPaid - cicilanPaidBaseline);
  const totalTagihanCicilan = totalCicilan + cycleDebtPaid;
  const cicilanPaidPct = totalTagihanCicilan > 0 ? Math.min(100, (cycleDebtPaid / totalTagihanCicilan) * 100) : 0;
  const isCicilanLunas = totalCicilan === 0 && cycleDebtPaid > 0;
  const prevCicilanRef = useRef(totalCicilan);

  useEffect(() => {
    if (prevCicilanRef.current > 0 && totalCicilan === 0 && cycleDebtPaid > 0) {
      const timer = setTimeout(() => {
        triggerProgressFx(cicilanCardRef.current, true, 'lunas');
      }, 180);
      prevCicilanRef.current = totalCicilan;
      return () => clearTimeout(timer);
    }
    prevCicilanRef.current = totalCicilan;
  }, [totalCicilan, cycleDebtPaid]);

  const celebrateCicilanUpdate = () => {
    if (cicilanCardRef.current && SakugaFX) {
      const c = SakugaFX.at(cicilanCardRef.current);
      SakugaFX.kira(c.x + c.w * 0.25, c.y - 14, { r: 13, life: 0.7 });
      SakugaFX.ticks(c.x, c.y - c.h / 2 - 4, { dir: -Math.PI / 2, n: 3, r: 4, len: 14, life: 0.45 });
    }
  };

  const resetCicilanCycleProgress = (baselinePaid = totalDebtPaid) => {
    setCicilanPaidBaseline(baselinePaid);
    localStorage.setItem('cicilanPaidBaseline', String(baselinePaid));
  };

  const saveCicilan = () => {
    const rawValue = String(cicilanInput).replace(/\D/g, '');
    const desiredTotal = Number(rawValue) || 0;
    const netDebtDelta = totalDebtAdd - totalDebtPaid;
    const nextInitial = desiredTotal - netDebtDelta;
    if (totalCicilan === 0 && desiredTotal > 0) {
      resetCicilanCycleProgress(totalDebtPaid);
    }
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

      if (!Array.isArray(parsedDataList) || parsedDataList.length === 0) {
        alert("AI tidak menemukan detail nominal transaksi. Coba ketik misalnya: 'Beli kopi 20rb'.");
        return;
      }

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
          amount: Number(parsed.amount) || 0,
          transaction_type: catType,
          date: parsed.date || new Date().toISOString(),
          description: parsed.description || catName,
          input_method: 'nlp',
          category: category
        });
      });

      if (totalCicilan === 0 && newTransactions.some(t => t.transaction_type === 'debt_add')) {
        resetCicilanCycleProgress(totalDebtPaid);
      }

      setCategories(currentCategories);
      setTransactions([...transactions, ...newTransactions]);
      setNlpInput('');
      soundFx.playSuccess();
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

    if (totalCicilan === 0 && newTx.transaction_type === 'debt_add' && newTx.amount > 0) {
      resetCicilanCycleProgress(totalDebtPaid);
    }

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

  const toLocalDateTimeInput = (isoStr) => {
    const d = new Date(isoStr || Date.now());
    if (Number.isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const startEditTx = (tx) => {
    soundFx.playClick();
    setEditingTxId(tx.id);
    setEditTxForm({
      amount: Number(tx.amount || 0).toLocaleString('id-ID'),
      transaction_type: tx.transaction_type || 'expense',
      category_name: tx.category?.name || 'Lainnya',
      description: tx.description || '',
      date: toLocalDateTimeInput(tx.date)
    });
  };

  const cancelEditTx = () => {
    setEditingTxId(null);
    setEditTxForm(null);
  };

  const saveEditTx = (e) => {
    e.preventDefault();
    if (!editTxForm) return;
    const numericAmount = parseFloat(String(editTxForm.amount).replace(/\D/g, '')) || 0;
    if (numericAmount <= 0) {
      alert("Nominal transaksi harus lebih dari 0.");
      return;
    }

    const catType = editTxForm.transaction_type || 'expense';
    const fallbackCat = catType === 'debt_payment' ? 'Bayar Cicilan' : catType === 'debt_add' ? 'Tambah Cicilan' : 'Lainnya';
    const catName = (editTxForm.category_name || '').trim() || fallbackCat;

    let currentCategories = [...categories];
    let category = currentCategories.find(c => c.name.toLowerCase() === catName.toLowerCase() && c.type === catType);
    if (!category) {
      category = { id: Date.now() + Math.random(), name: catName, type: catType };
      currentCategories.push(category);
      setCategories(currentCategories);
    }

    const oldTx = transactions.find(tx => tx.id === editingTxId);
    const prevPaidFromOldTx = oldTx?.transaction_type === 'debt_payment' ? (Number(oldTx.amount) || 0) : 0;
    if (totalCicilan === 0 && catType === 'debt_add' && oldTx?.transaction_type !== 'debt_add') {
      resetCicilanCycleProgress(Math.max(0, totalDebtPaid - prevPaidFromOldTx));
    }

    const nextDateIso = editTxForm.date ? new Date(editTxForm.date).toISOString() : new Date().toISOString();

    setTransactions(prev => prev.map(tx =>
      tx.id === editingTxId
        ? {
            ...tx,
            amount: numericAmount,
            transaction_type: catType,
            category: category,
            description: editTxForm.description.trim() || catName,
            date: nextDateIso
          }
        : tx
    ));

    setEditingTxId(null);
    setEditTxForm(null);
    celebrateBalanceUpdate();
    if (catType === 'debt_payment' || catType === 'debt_add') {
      celebrateCicilanUpdate();
    }
  };

  const handleDelete = (id, e) => {
    const btnEl = e?.currentTarget;
    if (!window.confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
    triggerDeleteFx(btnEl);
    if (editingTxId === id) {
      setEditingTxId(null);
      setEditTxForm(null);
    }
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const handleExportJson = () => {
    const payload = {
      app: 'Moneta',
      version: 1,
      exportedAt: new Date().toISOString(),
      transactions,
      categories,
      initialCicilan,
      cicilanPaidBaseline,
      targetIncome
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moneta-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    soundFx.playSuccess();
  };

  const handleExportCsv = () => {
    const csvEscape = (val) => {
      const str = String(val ?? '');
      return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const typeLabel = {
      income: 'Pemasukan',
      expense: 'Pengeluaran',
      debt_payment: 'Bayar Cicilan',
      debt_add: 'Tambah Cicilan'
    };
    const rows = [
      ['Tanggal', 'Waktu', 'Jenis', 'Kategori', 'Deskripsi', 'Nominal', 'Metode'],
      ...transactions.map(tx => {
        const d = new Date(tx.date);
        return [
          d.toLocaleDateString('id-ID'),
          d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          typeLabel[tx.transaction_type] || tx.transaction_type,
          tx.category?.name || 'Lainnya',
          tx.description || '',
          tx.amount || 0,
          tx.input_method === 'nlp' ? 'AI' : 'Manual'
        ].map(csvEscape).join(',');
      })
    ];
    const blob = new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moneta-laporan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    soundFx.playSuccess();
  };

  const handleImportJson = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.transactions)) {
        alert("Format file backup tidak valid. Pastikan memilih file .json hasil export Moneta.");
        return;
      }
      if (!window.confirm(`Pulihkan ${parsed.transactions.length} transaksi dari backup? Data saat ini akan digantikan.`)) {
        return;
      }

      const restoredTx = parsed.transactions.map(tx => ({
        ...tx,
        amount: Number(tx.amount) || 0,
        category: tx.category?.name === 'Bayar Pinjol'
          ? { ...tx.category, name: 'Bayar Cicilan' }
          : tx.category?.name === 'Tambah Pinjol'
          ? { ...tx.category, name: 'Tambah Cicilan' }
          : tx.category
      }));
      setTransactions(restoredTx);

      if (Array.isArray(parsed.categories) && parsed.categories.length > 0) {
        setCategories(parsed.categories);
      }
      if (Number.isFinite(Number(parsed.initialCicilan))) {
        const val = Number(parsed.initialCicilan);
        setInitialCicilan(val);
        localStorage.setItem('initialCicilan', String(val));
      }
      const nextBaseline = Number.isFinite(Number(parsed.cicilanPaidBaseline)) ? Number(parsed.cicilanPaidBaseline) : 0;
      resetCicilanCycleProgress(nextBaseline);
      if (Number.isFinite(Number(parsed.targetIncome))) {
        const val = Number(parsed.targetIncome);
        setTargetIncome(val);
        localStorage.setItem('targetIncome', String(val));
      }

      setEditingTxId(null);
      setEditTxForm(null);
      setIsBackupModalOpen(false);
      soundFx.playSuccess();
      setTimeout(() => celebrateBalanceUpdate(), 120);
    } catch (err) {
      alert("Gagal membaca file backup JSON. Pastikan file tidak rusak.");
      console.error(err);
    } finally {
      e.target.value = '';
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number || 0);
  };

  const displayMoney = (number, prefix = '') => {
    if (isPrivate) return `${prefix}Rp ••••••`;
    return `${prefix}${formatRupiah(number)}`;
  };

  return (
    <div className="container">
      {/* Header - Manga Style Aesthetic with Sound, Backup & Theme Toggle */}
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
            sfxWord="kachi"
            type="button"
            className="theme-toggle-btn"
            onClick={() => setIsBackupModalOpen(true)}
            title="Backup & Restore Data"
            aria-label="Backup and restore"
          >
            <Database size={16} />
          </SakugaButton>
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
            {filterType === 'all' ? 'Semua Waktu' : filterType === '7days' ? 'Minggu Ini' : filterType === 'month' ? 'Bulan Ini' : filterType === 'year' ? 'Tahun Ini' : 'Periode Kustom'}
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

      {/* Balance Card - Manga Hero Panel with Privacy Toggle */}
      <section ref={balanceCardRef} className="balance-card">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span className="balance-label">
              {filterType === 'all' ? 'Total Saldo' : `Total Saldo (${filterType === '7days' ? 'Minggu' : filterType === 'month' ? 'Bulan' : filterType === 'year' ? 'Tahun' : 'Periode'})`}
            </span>
            <SakugaButton
              variant="icon"
              sfxWord="kachi"
              type="button"
              className={`privacy-toggle-btn ${isPrivate ? 'active' : ''}`}
              onClick={togglePrivacy}
              title={isPrivate ? 'Tampilkan Nominal' : 'Sembunyikan Nominal (Mode Privasi)'}
              aria-label="Toggle privacy mask"
            >
              {isPrivate ? <EyeOff size={15} /> : <Eye size={15} />}
            </SakugaButton>
          </div>
          <div className="balance-amount">{displayMoney(balance.total)}</div>
        </div>

        <div className="balance-breakdown-row">
          <div className="breakdown-item">
            <div className="breakdown-icon income">
              <ArrowUpRight size={18} strokeWidth={2.2} />
            </div>
            <div>
              <p className="breakdown-label">Pemasukan</p>
              <p className="breakdown-val" style={{ color: 'var(--success)' }}>{displayMoney(balance.income, '+')}</p>
            </div>
          </div>
          <div style={{ width: '2px', height: '28px', background: 'var(--ink-border)' }}></div>
          <div className="breakdown-item" style={{ justifyContent: 'flex-end', textAlign: 'right' }}>
            <div style={{ textAlign: 'right' }}>
              <p className="breakdown-label">Pengeluaran</p>
              <p className="breakdown-val" style={{ color: 'var(--danger)' }}>{displayMoney(balance.expense, '-')}</p>
            </div>
            <div className="breakdown-icon expense">
              <ArrowDownRight size={18} strokeWidth={2.2} />
            </div>
          </div>
        </div>
      </section>

      {/* Total Cicilan Card (1 Total Gabungan + Progress Bar Pelunasan) */}
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
          {displayMoney(totalCicilan)}
        </div>

        <div ref={cicilanProgressRef} className="progress-track" style={{ margin: '6px 0 8px' }}>
          <div
            className={`progress-fill ${isCicilanLunas ? 'success' : ''}`}
            style={{ width: `${cicilanPaidPct}%` }}
          ></div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
          <span>Progres Pelunasan: <strong style={{ color: 'var(--text-main)' }}>{cicilanPaidPct.toFixed(1)}%</strong></span>
          {isCicilanLunas && (
            <span className="lunas-badge">LUNAS!</span>
          )}
        </div>

        <div className="balance-breakdown-row" style={{ paddingTop: '10px' }}>
          <div>
            <p className="breakdown-label">Total Terbayar</p>
            <p className="breakdown-val" style={{ color: 'var(--success)' }}>{displayMoney(cycleDebtPaid)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="breakdown-label">Saldo Bersih</p>
            <p className="breakdown-val" style={{ color: netBalance >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {displayMoney(netBalance)}
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
          <span>Tercapai: <strong style={{ color: 'var(--text-main)' }}>{displayMoney(balance.income)}</strong></span>
          <span>Target: <strong style={{ color: 'var(--text-main)' }}>{displayMoney(targetIncome)}</strong></span>
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
                    displayMoney(value), 
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
                        formatter={(value) => displayMoney(value)} 
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
                        formatter={(value) => displayMoney(value)} 
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

      {/* Riwayat Transaksi - Baru muncul ketika diklik */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <SakugaButton
          variant="pill"
          sfxWord="kachi"
          type="button"
          className="history-toggle-btn"
          onClick={() => setIsHistoryOpen(prev => !prev)}
          aria-expanded={isHistoryOpen}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={16} style={{ color: 'var(--accent-manga)' }} />
            <span style={{ fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Riwayat Transaksi
            </span>
            <span className="history-count-pill">
              {filteredTransactions.length}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            <span>{isHistoryOpen ? 'Tutup' : 'Lihat'}</span>
            {isHistoryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </SakugaButton>
        
        {isHistoryOpen && (
          filteredTransactions.length === 0 ? (
            <div className="minimal-card" style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
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
                      {editingTxId === tx.id && editTxForm ? (
                        <form onSubmit={saveEditTx} className="tx-edit-form">
                          <div className="tx-edit-row">
                            <SakugaSelect
                              className="minimal-input"
                              value={editTxForm.transaction_type}
                              onChange={(e) => setEditTxForm({ ...editTxForm, transaction_type: e.target.value })}
                              style={{ padding: '7px 8px', fontSize: '12px', flex: 1 }}
                            >
                              <option value="expense">Pengeluaran (-Saldo)</option>
                              <option value="income">Pemasukan (+Saldo)</option>
                              <option value="debt_payment">Bayar Cicilan (-Saldo, -Cicilan)</option>
                              <option value="debt_add">Tambah Cicilan (+Cicilan)</option>
                            </SakugaSelect>
                            <SakugaInput
                              type="text"
                              className="minimal-input"
                              placeholder="Kategori"
                              value={editTxForm.category_name}
                              onChange={(e) => setEditTxForm({ ...editTxForm, category_name: e.target.value })}
                              style={{ padding: '7px 8px', fontSize: '12px', flex: 1 }}
                              required
                            />
                          </div>
                          <div className="tx-edit-row">
                            <SakugaInput
                              type="text"
                              inputMode="numeric"
                              className="minimal-input"
                              placeholder="Nominal"
                              value={editTxForm.amount}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, '');
                                const formatted = raw ? parseInt(raw, 10).toLocaleString('id-ID') : '';
                                setEditTxForm({ ...editTxForm, amount: formatted });
                              }}
                              style={{ padding: '7px 8px', fontSize: '12px', flex: 1, fontWeight: 800 }}
                              required
                            />
                            <SakugaInput
                              type="datetime-local"
                              className="minimal-input"
                              value={editTxForm.date}
                              onChange={(e) => setEditTxForm({ ...editTxForm, date: e.target.value })}
                              style={{ padding: '7px 8px', fontSize: '12px', flex: 1 }}
                            />
                          </div>
                          <SakugaInput
                            type="text"
                            className="minimal-input"
                            placeholder="Deskripsi"
                            value={editTxForm.description}
                            onChange={(e) => setEditTxForm({ ...editTxForm, description: e.target.value })}
                            style={{ padding: '7px 8px', fontSize: '12px' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '2px' }}>
                            <SakugaButton
                              variant="pill"
                              sfxWord="kachi"
                              type="button"
                              onClick={cancelEditTx}
                              className="filter-btn"
                              style={{ padding: '6px 12px' }}
                            >
                              <X size={13} /> Batal
                            </SakugaButton>
                            <SakugaButton
                              variant="primary"
                              type="submit"
                              className="btn-primary"
                              style={{ padding: '6px 14px', width: 'auto', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                            >
                              <Check size={14} /> Simpan
                            </SakugaButton>
                          </div>
                        </form>
                      ) : (
                        <>
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
                              {displayMoney(tx.amount, tx.transaction_type === 'income' || tx.transaction_type === 'debt_add' ? '+' : '-')}
                            </p>
                            <div className="tx-action-btns">
                              <button
                                type="button"
                                onClick={() => startEditTx(tx)}
                                className="btn-edit-tx"
                                title="Edit Transaksi"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button 
                                type="button"
                                onClick={(e) => handleDelete(tx.id, e)}
                                className="btn-delete"
                                title="Hapus"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )
        )}
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleImportJson}
      />

      {isBackupModalOpen && (
        <div className="manga-modal-overlay" onClick={() => setIsBackupModalOpen(false)}>
          <div className="manga-modal" onClick={(e) => e.stopPropagation()}>
            <div className="manga-modal-header">
              <h3 className="manga-modal-title">
                <Database size={16} style={{ color: 'var(--accent-manga)' }} /> Backup & Restore Data
              </h3>
              <button
                type="button"
                className="btn-delete"
                onClick={() => { soundFx.playClick(); setIsBackupModalOpen(false); }}
                title="Tutup"
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Data tersimpan lokal di browser ini</span>
              <strong style={{ color: 'var(--text-main)' }}>{transactions.length} transaksi</strong>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button type="button" className="backup-action-btn" onClick={handleExportJson}>
                <div>
                  <div>Export Backup Lengkap (.JSON)</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '2px' }}>
                    Simpan semua transaksi, kategori, cicilan & target
                  </div>
                </div>
                <Download size={18} />
              </button>

              <button type="button" className="backup-action-btn" onClick={handleExportCsv}>
                <div>
                  <div>Export Laporan Excel (.CSV)</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginTop: '2px' }}>
                    Format tabel rapi siap buka di Excel / Google Sheets
                  </div>
                </div>
                <FileSpreadsheet size={18} />
              </button>

              <button
                type="button"
                className="backup-action-btn primary"
                onClick={() => {
                  soundFx.playClick();
                  fileInputRef.current?.click();
                }}
              >
                <div>
                  <div>Restore Data dari Backup (.JSON)</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.88)', marginTop: '2px' }}>
                    Muat ulang data dari file backup Moneta sebelumnya
                  </div>
                </div>
                <Upload size={18} />
              </button>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              Tips: Lakukan export JSON berkala agar data Anda tetap aman jika mengganti HP atau membersihkan data browser.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
