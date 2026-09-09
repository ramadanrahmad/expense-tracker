import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Bot, Plus, WalletCards, ArrowUpRight, ArrowDownRight, Trash2, BarChart2, PieChart as PieChartIcon, PenTool, Filter, Target, Edit2, LogOut, User as UserIcon } from 'lucide-react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// Axios Interceptor for injecting JWT
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      
      const res = await axios.post(`${API_URL}/login`, formData);
      localStorage.setItem('token', res.data.access_token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal login. Periksa email dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div className="glass card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <WalletCards size={48} className="text-accent" style={{ margin: '0 auto 1rem', color: 'var(--accent-primary)' }} />
          <h1 className="text-gradient" style={{ fontSize: '2rem' }}>Expense AI</h1>
          <p className="text-muted">Masuk ke Akun Anda</p>
        </div>
        
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label>Email</label>
            <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label>Password</label>
            <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading}>
            {loading ? 'Memproses...' : 'Login'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Belum punya akun? <span onClick={() => navigate('/register')} style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold' }}>Daftar di sini</span>
        </p>
      </div>
    </div>
  );
}

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Password tidak cocok!');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API_URL}/register`, { email, password });
      alert('Pendaftaran berhasil! Silakan login.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal mendaftar. Email mungkin sudah digunakan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container animate-slide-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <div className="glass card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <UserIcon size={48} className="text-accent" style={{ margin: '0 auto 1rem', color: 'var(--accent-primary)' }} />
          <h1 className="text-gradient" style={{ fontSize: '1.75rem' }}>Buat Akun Baru</h1>
          <p className="text-muted">Bergabung dengan Expense AI</p>
        </div>
        
        {error && <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group" style={{ margin: 0 }}>
            <label>Email</label>
            <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label>Password</label>
            <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="input-group" style={{ margin: 0 }}>
            <label>Konfirmasi Password</label>
            <input type="password" className="input-field" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }} disabled={loading}>
            {loading ? 'Memproses...' : 'Daftar Sekarang'}
          </button>
        </form>
        
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Sudah punya akun? <span onClick={() => navigate('/login')} style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold' }}>Login</span>
        </p>
      </div>
    </div>
  );
}

function ExpenseTracker() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState({ total: 0, income: 0, expense: 0 });
  
  // Chart Data States
  const [chartData, setChartData] = useState([]);
  const [expenseCatData, setExpenseCatData] = useState([]);
  const [incomeCatData, setIncomeCatData] = useState([]);
  
  // UI States
  const [activeTab, setActiveTab] = useState('ai'); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter States
  const [filterType, setFilterType] = useState('7days');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  // Target State
  const [targetIncome, setTargetIncome] = useState(() => Number(localStorage.getItem('targetIncome')) || 0);
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');

  const saveTarget = () => {
    const val = Number(targetInput) || 0;
    setTargetIncome(val);
    localStorage.setItem('targetIncome', val);
    setIsEditingTarget(false);
  };
  
  const targetPercentage = targetIncome > 0 ? (balance.income / targetIncome) * 100 : 0;

  // Input States
  const [nlpInput, setNlpInput] = useState('');
  const [manualForm, setManualForm] = useState({
    amount: '',
    transaction_type: 'expense',
    date: new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16),
    category_name: 'Makanan & Minuman',
    description: ''
  });

  const [categories, setCategories] = useState([]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API_URL}/categories/`);
      setCategories(res.data);
      if (res.data.length > 0 && !manualForm.category_name) {
          setManualForm(prev => ({...prev, category_name: res.data[0].name}));
      }
    } catch (e) {
      if (e.response?.status === 401) handleLogout();
      console.error(e);
    }
  };

  useEffect(() => {
    if (filterType === 'custom' && !customRange.start && !customRange.end) {
        // Skip fetching if custom but empty
    } else {
        fetchTransactions();
        fetchCategories();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, customRange]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      let params = {};
      const today = new Date();
      
      if (filterType === '7days') {
        const past = new Date(today);
        past.setDate(today.getDate() - 6);
        params.start_date = past.toISOString().split('T')[0];
        params.end_date = today.toISOString().split('T')[0];
      } else if (filterType === 'month') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const formatDate = (date) => {
            const d = new Date(date);
            const month = '' + (d.getMonth() + 1);
            const day = '' + d.getDate();
            const year = d.getFullYear();
            return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
        };
        params.start_date = formatDate(start);
        params.end_date = formatDate(end);
      } else if (filterType === 'year') {
        params.start_date = `${today.getFullYear()}-01-01`;
        params.end_date = `${today.getFullYear()}-12-31`;
      } else if (filterType === 'custom') {
        if (customRange.start) params.start_date = customRange.start;
        if (customRange.end) params.end_date = customRange.end;
      }

      const response = await axios.get(`${API_URL}/transactions/`, { params });
      const data = response.data;
      setTransactions(data);
      
      // Calculations
      let inc = 0;
      let exp = 0;
      const groupedBy = {};
      const expByCategory = {};
      const incByCategory = {};
      
      const isYearly = filterType === 'year';

      data.forEach(t => {
        // Balance
        if (t.transaction_type === 'income') inc += t.amount;
        else exp += t.amount;

        // Bar Chart (Time)
        const dateObj = new Date(t.date);
        let key = '';
        if (isYearly) {
          key = dateObj.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        } else {
          key = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        }

        if (!groupedBy[key]) groupedBy[key] = { name: key, income: 0, expense: 0, rawDate: dateObj.getTime() };
        if (t.transaction_type === 'income') groupedBy[key].income += t.amount;
        else groupedBy[key].expense += t.amount;
        
        // Pie Chart (Category)
        const catName = t.category?.name || 'Lainnya';
        if (t.transaction_type === 'income') {
          incByCategory[catName] = (incByCategory[catName] || 0) + t.amount;
        } else {
          expByCategory[catName] = (expByCategory[catName] || 0) + t.amount;
        }
      });

      setBalance({ total: inc - exp, income: inc, expense: exp });
      
      const cData = Object.values(groupedBy).sort((a, b) => a.rawDate - b.rawDate);
      setChartData(cData);
      
      setExpenseCatData(Object.keys(expByCategory).map(k => ({ name: k, value: expByCategory[k] })).sort((a,b)=>b.value-a.value));
      setIncomeCatData(Object.keys(incByCategory).map(k => ({ name: k, value: incByCategory[k] })).sort((a,b)=>b.value-a.value));

    } catch (error) {
      if (error.response?.status === 401) handleLogout();
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNlpSubmit = async (e) => {
    e.preventDefault();
    if (!nlpInput.trim()) return;
    
    setIsSubmitting(true);
    try {
      await axios.post(`${API_URL}/transactions/nlp/`, { text: nlpInput });
      setNlpInput('');
      await fetchTransactions();
    } catch (error) {
      if (error.response?.status === 401) handleLogout();
      alert("Gagal memproses input teks. Pastikan format teks jelas atau API Key Gemini sudah di set.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.amount || !manualForm.description) return;
    
    setIsSubmitting(true);
    try {
      const catRes = await axios.post(`${API_URL}/categories/`, {
        name: manualForm.category_name,
        type: manualForm.transaction_type
      });
      
      await axios.post(`${API_URL}/transactions/`, {
        amount: parseFloat(manualForm.amount),
        transaction_type: manualForm.transaction_type,
        date: manualForm.date,
        description: manualForm.description,
        input_method: 'manual',
        category_id: catRes.data.id
      });
      
      setManualForm({...manualForm, amount: '', description: ''});
      await fetchTransactions();
    } catch (error) {
      if (error.response?.status === 401) handleLogout();
      alert("Gagal menyimpan transaksi manual.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
    try {
      await axios.delete(`${API_URL}/transactions/${id}`);
      await fetchTransactions();
    } catch(err) {
      if (err.response?.status === 401) handleLogout();
      alert("Gagal menghapus transaksi.");
    }
  };

  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number || 0);
  };

  return (
    <div className="container animate-slide-up">
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="text-gradient">Expense AI</h1>
          <p className="text-muted">Personal Finance Tracker</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn-icon">
            <WalletCards size={24} />
          </button>
          <button className="btn-icon" onClick={handleLogout} title="Keluar">
            <LogOut size={20} style={{ color: 'var(--danger)' }} />
          </button>
        </div>
      </header>

      {/* Filter Section */}
      <section className="glass card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={18} className="text-muted" />
          <h3 style={{ fontSize: '1rem' }}>Filter Waktu</h3>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setFilterType('7days')} className={`btn ${filterType === '7days' ? 'btn-primary' : 'btn-icon'}`} style={{flex: 1, borderRadius: 'var(--radius-sm)'}}>7 Hari</button>
          <button onClick={() => setFilterType('month')} className={`btn ${filterType === 'month' ? 'btn-primary' : 'btn-icon'}`} style={{flex: 1, borderRadius: 'var(--radius-sm)'}}>Bulan Ini</button>
          <button onClick={() => setFilterType('year')} className={`btn ${filterType === 'year' ? 'btn-primary' : 'btn-icon'}`} style={{flex: 1, borderRadius: 'var(--radius-sm)'}}>Tahun Ini</button>
          <button onClick={() => setFilterType('custom')} className={`btn ${filterType === 'custom' ? 'btn-primary' : 'btn-icon'}`} style={{flex: 1, borderRadius: 'var(--radius-sm)'}}>Kustom</button>
        </div>

        {filterType === 'custom' && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <div className="input-group" style={{ flex: 1, margin: 0 }}>
              <label>Dari Tanggal</label>
              <input type="date" className="input-field" value={customRange.start} onChange={(e) => setCustomRange({...customRange, start: e.target.value})} />
            </div>
            <div className="input-group" style={{ flex: 1, margin: 0 }}>
              <label>Sampai Tanggal</label>
              <input type="date" className="input-field" value={customRange.end} onChange={(e) => setCustomRange({...customRange, end: e.target.value})} />
            </div>
          </div>
        )}
      </section>

      {/* Balance Card */}
      <section className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <p className="text-muted">Total Saldo ({filterType === '7days' ? '7 Hari Terakhir' : filterType === 'month' ? 'Bulan Ini' : filterType === 'year' ? 'Tahun Ini' : 'Kustom'})</p>
          <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0' }}>{formatRupiah(balance.total)}</h2>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem', borderRadius: '50%', color: 'var(--success)' }}>
              <ArrowUpRight size={20} />
            </div>
            <div>
              <p className="text-muted" style={{ fontSize: '0.75rem' }}>Pemasukan</p>
              <p style={{ fontWeight: 600 }}>{formatRupiah(balance.income)}</p>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '50%', color: 'var(--danger)' }}>
              <ArrowDownRight size={20} />
            </div>
            <div>
              <p className="text-muted" style={{ fontSize: '0.75rem' }}>Pengeluaran</p>
              <p style={{ fontWeight: 600 }}>{formatRupiah(balance.expense)}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Target Pemasukan Card */}
      <section className="glass card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={18} className="text-success" style={{ color: 'var(--success)' }} /> Target Pemasukan
            </h3>
            {isEditingTarget ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                   <input type="number" className="input-field" placeholder="Nominal" value={targetInput} onChange={e => setTargetInput(e.target.value)} style={{ padding: '0.25rem 0.5rem', width: '120px', margin: 0 }} />
                   <button className="btn btn-primary" onClick={saveTarget} style={{ padding: '0.25rem 0.5rem' }}>Simpan</button>
                </div>
            ) : (
                <button className="btn-icon" onClick={() => {setIsEditingTarget(true); setTargetInput(targetIncome);}} style={{ padding: '0.25rem' }}>
                   <Edit2 size={16} />
                </button>
            )}
         </div>
         
         <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span className="text-muted">Tercapai: <strong style={{ color: 'var(--text-primary)' }}>{formatRupiah(balance.income)}</strong></span>
            <span className="text-muted">Target: <strong style={{ color: 'var(--text-primary)' }}>{formatRupiah(targetIncome)}</strong></span>
         </div>
         
         {/* Progress Bar */}
         <div style={{ width: '100%', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ 
               width: `${Math.min(targetPercentage, 100)}%`, 
               height: '100%', 
               background: targetPercentage >= 100 ? 'var(--success)' : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
               transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
               boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.2)'
            }}></div>
         </div>
         <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
             <span style={{ color: 'var(--text-secondary)' }}>Progres: {targetPercentage.toFixed(1)}%</span>
             {targetPercentage >= 100 && targetIncome > 0 && <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>🎉 Target Tercapai!</span>}
         </div>
      </section>

      {/* Bar Chart Section (Timeline) */}
      {chartData.length > 0 && (
        <section className="glass card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={18} className="text-muted" /> Arus Kas
          </h3>
          <div style={{ height: '200px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                  formatter={(value) => formatRupiah(value)}
                />
                <Bar dataKey="income" fill="var(--success)" radius={[4, 4, 0, 0]} name="Pemasukan" />
                <Bar dataKey="expense" fill="var(--danger)" radius={[4, 4, 0, 0]} name="Pengeluaran" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Pie Chart Section (Category Breakdown) */}
      {(expenseCatData.length > 0 || incomeCatData.length > 0) && (
        <section className="glass card" style={{ padding: '1rem' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PieChartIcon size={18} className="text-muted" /> Rincian Kategori
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {expenseCatData.length > 0 && (
              <div>
                 <h4 style={{fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '0.5rem'}}>Komposisi Pengeluaran</h4>
                 <div style={{ height: '200px', width: '100%' }}>
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie data={expenseCatData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                         {expenseCatData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                       </Pie>
                       <Tooltip formatter={(value) => formatRupiah(value)} contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                       <Legend wrapperStyle={{ fontSize: '12px' }} />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
              </div>
            )}
            
            {incomeCatData.length > 0 && (
              <div>
                 <h4 style={{fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '0.5rem'}}>Sumber Pemasukan</h4>
                 <div style={{ height: '200px', width: '100%' }}>
                   <ResponsiveContainer width="100%" height="100%">
                     <PieChart>
                       <Pie data={incomeCatData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                         {incomeCatData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                       </Pie>
                       <Tooltip formatter={(value) => formatRupiah(value)} contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                       <Legend wrapperStyle={{ fontSize: '12px' }} />
                     </PieChart>
                   </ResponsiveContainer>
                 </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Input Section */}
      <section className="glass card" style={{ padding: '0' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <button 
            onClick={() => setActiveTab('ai')}
            style={{ flex: 1, padding: '1rem', background: 'none', border: 'none', color: activeTab === 'ai' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'ai' ? 600 : 400, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}
          >
            <Bot size={18} /> AI Input
          </button>
          <button 
            onClick={() => setActiveTab('manual')}
            style={{ flex: 1, padding: '1rem', background: 'none', border: 'none', color: activeTab === 'manual' ? 'var(--accent-primary)' : 'var(--text-secondary)', fontWeight: activeTab === 'manual' ? 600 : 400, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}
          >
            <PenTool size={18} /> Manual Input
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {activeTab === 'ai' ? (
            <form onSubmit={handleNlpSubmit}>
              <div className="input-group" style={{ marginBottom: '1rem' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder='Cth: "Makan siang 50 ribu, dapet transferan 1 juta"'
                  value={nlpInput}
                  onChange={(e) => setNlpInput(e.target.value)}
                  disabled={isSubmitting}
                />
                <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Ketikkan cerita transaksi Anda, AI akan memecahnya secara otomatis.</p>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isSubmitting || !nlpInput}>
                {isSubmitting ? 'Memproses AI...' : 'Catat Transaksi'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="input-group" style={{ flex: 1, margin: 0 }}>
                  <label>Jenis</label>
                  <select 
                    className="input-field" 
                    value={manualForm.transaction_type} 
                    onChange={(e) => {
                      const newType = e.target.value;
                      const filteredCats = categories.filter(c => c.type === newType);
                      setManualForm({
                        ...manualForm, 
                        transaction_type: newType,
                        category_name: filteredCats.length > 0 ? filteredCats[0].name : ''
                      });
                    }}
                  >
                    <option value="expense">Pengeluaran</option>
                    <option value="income">Pemasukan</option>
                  </select>
                </div>
                <div className="input-group" style={{ flex: 1, margin: 0 }}>
                  <label>Tanggal & Jam</label>
                  <input type="datetime-local" className="input-field" value={manualForm.date} onChange={(e) => setManualForm({...manualForm, date: e.target.value})} />
                </div>
              </div>
              
              <div className="input-group" style={{ margin: 0 }}>
                <label>Kategori</label>
                <select className="input-field" value={manualForm.category_name} onChange={(e) => setManualForm({...manualForm, category_name: e.target.value})}>
                  {categories.filter(c => c.type === manualForm.transaction_type).map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label>Nominal (Rp)</label>
                <input type="number" className="input-field" placeholder="0" value={manualForm.amount} onChange={(e) => setManualForm({...manualForm, amount: e.target.value})} required />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label>Deskripsi</label>
                <input type="text" className="input-field" placeholder="Catatan transaksi..." value={manualForm.description} onChange={(e) => setManualForm({...manualForm, description: e.target.value})} required />
              </div>
              
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} disabled={isSubmitting}>
                Simpan Manual
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Recent Transactions */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem' }}>Riwayat Transaksi</h3>
        
        {loading ? (
          <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</p>
        ) : transactions.length === 0 ? (
          <div className="glass card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <p className="text-muted">Belum ada transaksi di rentang waktu ini.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {Object.entries(
              transactions.reduce((acc, tx) => {
                const dateStr = new Date(tx.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                if (!acc[dateStr]) acc[dateStr] = [];
                acc[dateStr].push(tx);
                return acc;
              }, {})
            ).map(([dateLabel, dailyTxs]) => (
              <div key={dateLabel} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>
                  {dateLabel}
                </h4>
                {dailyTxs.map((tx) => (
                  <div key={tx.id} className="glass card" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '50%', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        background: tx.transaction_type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: tx.transaction_type === 'income' ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {tx.transaction_type === 'income' ? <ArrowUpRight size={20}/> : <ArrowDownRight size={20}/>}
                      </div>
                      <div>
                        <p style={{ fontWeight: 500, lineHeight: 1.2 }}>{tx.description}</p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>{tx.category?.name || 'Lainnya'}</span>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>•</span>
                          <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {new Date(tx.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {tx.input_method === 'nlp' ? (
                             <>
                               <span className="text-muted" style={{ fontSize: '0.75rem' }}>•</span>
                               <Bot size={12} className="text-muted" title="Dicatat via AI" />
                             </>
                          ) : (
                             <>
                               <span className="text-muted" style={{ fontSize: '0.75rem' }}>•</span>
                               <PenTool size={12} className="text-muted" title="Dicatat Manual" />
                             </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <p style={{ fontWeight: 600, color: tx.transaction_type === 'income' ? 'var(--success)' : 'var(--text-primary)' }}>
                        {tx.transaction_type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                      </p>
                      <button 
                        onClick={() => handleDelete(tx.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', opacity: 0.7 }}
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

// Protected Route Component
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <ExpenseTracker />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
