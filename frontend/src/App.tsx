import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowDownRight, ArrowUpRight, BarChart3, Bell, ChevronDown, CircleHelp, Download, LayoutDashboard, RefreshCw, Search, Settings2, Sparkles, Users, Wallet, ShoppingBag, X, Zap } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const API = '/api'

type View = 'Overview' | 'Analytics' | 'Forecast' | 'Customers' | 'Products' | 'Settings'
type Dashboard = {
  kpis: { revenue: number; clients: number; average_order: number; conversion: number; growth: number; clients_growth: number; average_order_growth: number; conversion_growth: number; orders: number }
  sales_over_time: { date: string; revenue: number; orders: number }[]
  sales_by_category: { category: string; revenue: number }[]
  customer_distribution: { segment: string; customers: number }[]
  top_products: { product: string; category?: string; units: number; revenue: number }[]
  insights: string[]
}
type Forecast = { period: string; prediction: number; mae: number; rmse: number; training_points: number; history: { date: string; actual: number; predicted: number }[] }
type Toast = { kind: 'success' | 'error'; text: string }

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
const shortMoney = (value: number) => value >= 1000 ? `R$ ${(value / 1000).toFixed(1).replace('.', ',')}k` : money(value)
const colorSet = ['#927dff', '#49b5e8', '#45d3a2']
const viewTitles: Record<View, string> = {
  Overview: 'Visão geral', Analytics: 'Análise de performance', Forecast: 'Previsão de vendas',
  Customers: 'Clientes', Products: 'Produtos', Settings: 'Configurações',
}

function csvCell(value: string | number) {
  return `"${String(value).split('"').join('""')}"`
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const content = `\uFEFF${rows.map(row => row.map(csvCell).join(';')).join('\r\n')}`
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function readAutoRefreshPreference() {
  try {
    return localStorage.getItem('pulse-auto-refresh') === 'true'
  } catch {
    return false
  }
}

export default function App() {
  const [period, setPeriod] = useState('12m')
  const [category, setCategory] = useState('Todas')
  const [view, setView] = useState<View>('Overview')
  const [metric, setMetric] = useState('Receita')
  const [data, setData] = useState<Dashboard | null>(null)
  const [forecast, setForecast] = useState<Forecast | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [toast, setToast] = useState<Toast | null>(null)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [popover, setPopover] = useState('')
  const [dialog, setDialog] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Dashboard['top_products'][number] | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(readAutoRefreshPreference)
  const searchRef = useRef<HTMLInputElement>(null)
  const manualRefresh = useRef(false)
  const filteredProducts = (data?.top_products ?? []).filter(product => product.product.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))
  const filteredSegments = (data?.customer_distribution ?? []).filter(segment => segment.segment.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')))
  const kpis = data?.kpis

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    Promise.all([
      fetch(`${API}/dashboard?period=${encodeURIComponent(period)}&category=${encodeURIComponent(category)}`, { signal: controller.signal }),
      fetch(`${API}/forecast`, { signal: controller.signal }),
    ]).then(async ([dashboardResponse, forecastResponse]) => {
      if (!dashboardResponse.ok || !forecastResponse.ok) throw new Error('A API retornou um erro ao carregar os dados.')
      const [dashboardBody, forecastBody] = await Promise.all([dashboardResponse.json(), forecastResponse.json()]) as [Dashboard, Forecast]
      setData(dashboardBody)
      setForecast(forecastBody)
      setUpdatedAt(new Date())
      if (manualRefresh.current) setToast({ kind: 'success', text: 'Dados atualizados com sucesso.' })
    }).catch(reason => {
      if (controller.signal.aborted) return
      const message = reason instanceof Error ? reason.message : 'Não foi possível carregar os dados.'
      setError(message)
      if (manualRefresh.current) setToast({ kind: 'error', text: message })
    }).finally(() => {
      if (!controller.signal.aborted) {
        setLoading(false)
        manualRefresh.current = false
      }
    })
    return () => controller.abort()
  }, [period, category, reloadKey])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = window.setInterval(() => setReloadKey(key => key + 1), 60_000)
    return () => window.clearInterval(interval)
  }, [autoRefresh])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setQuery('')
        setPopover('')
        setDialog('')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function refreshData() {
    manualRefresh.current = true
    setLoading(true)
    setReloadKey(key => key + 1)
  }

  function clearFilters() {
    setPeriod('12m')
    setCategory('Todas')
    setQuery('')
    setToast({ kind: 'success', text: 'Filtros restaurados para o período padrão.' })
  }

  function changeAutoRefresh(enabled: boolean) {
    setAutoRefresh(enabled)
    try {
      localStorage.setItem('pulse-auto-refresh', String(enabled))
      setToast({ kind: 'success', text: enabled ? 'Atualização automática ativada (a cada minuto).' : 'Atualização automática desativada.' })
    } catch {
      setToast({ kind: 'error', text: 'Não foi possível salvar essa preferência neste navegador.' })
    }
  }

  function exportData(scope = view) {
    if (!data) {
      setToast({ kind: 'error', text: 'Não há dados carregados para exportar.' })
      return
    }
    const rows: (string | number)[][] = [['Tipo', 'Data', 'Categoria / segmento', 'Nome', 'Unidades', 'Pedidos', 'Receita', 'Clientes']]
    if (scope === 'Forecast') {
      if (forecast) rows.push(['Previsão', forecast.period, '', 'Estimativa do próximo mês', '', '', forecast.prediction, ''])
      ;(forecast?.history ?? []).forEach(point => rows.push(['Histórico ajustado', point.date, '', 'Receita observada', '', '', point.actual, '']))
      ;(forecast?.history ?? []).forEach(point => rows.push(['Histórico ajustado', point.date, '', 'Estimativa do modelo', '', '', point.predicted, '']))
      downloadCsv('pulse-previsao.csv', rows)
    } else {
      if (scope === 'Overview' || scope === 'Analytics') {
        data.sales_over_time.forEach(point => rows.push(['Vendas mensais', point.date, '', '', '', point.orders, point.revenue, '']))
        data.sales_by_category.forEach(item => rows.push(['Categoria', '', item.category, '', '', '', item.revenue, '']))
        data.insights.forEach((insight, index) => rows.push(['Insight', '', '', `${index + 1}. ${insight}`, '', '', '', '']))
      }
      if (scope === 'Overview' || scope === 'Products') {
        data.top_products.filter(product => query ? product.product.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')) : true)
          .forEach(product => rows.push(['Produto', '', product.category ?? '', product.product, product.units, '', product.revenue, '']))
      }
      if (scope === 'Overview' || scope === 'Customers') {
        data.customer_distribution.filter(segment => query ? segment.segment.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')) : true)
          .forEach(segment => rows.push(['Clientes', '', segment.segment, '', '', '', '', segment.customers]))
      }
      downloadCsv(`pulse-${scope.toLocaleLowerCase('pt-BR')}-${period}.csv`, rows)
    }
    setPopover('')
    setToast({ kind: 'success', text: 'Arquivo CSV gerado com os dados exibidos.' })
  }

  const fmt = (value: number) => money(value)
  const showOverview = view === 'Overview'
  const showAnalytics = view === 'Analytics'
  const showForecast = view === 'Forecast'
  const showCustomers = showOverview || showAnalytics || view === 'Customers'
  const showProducts = showOverview || showAnalytics || view === 'Products'
  const showCharts = showOverview || showAnalytics

  return <div className="shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setView('Overview')} aria-label="Ir para visão geral"><span className="brandmark"><Activity size={19} /></span><span>pulse<span className="brand-light">.analytics</span></span></button>
      <button className="workspace workspace-button" onClick={() => setPopover(popover === 'workspace' ? '' : 'workspace')} aria-expanded={popover === 'workspace'}><span className="workspace-icon">N</span><span><b>Northstar Studio</b><small>Workspace principal</small></span><ChevronDown size={15} /></button>
      {popover === 'workspace' && <div className="sidebar-popover"><b>Northstar Studio</b><span>Workspace local ativo</span><small>Este projeto contém um único conjunto de dados de demonstração.</small></div>}
      <div className="nav-label">WORKSPACE</div>
      <nav>{[[LayoutDashboard, 'Overview'], [BarChart3, 'Analytics'], [Zap, 'Forecast']].map(([Icon, label]: any) => <button className={`nav-item ${view === label ? 'active' : ''}`} key={label} onClick={() => setView(label)}><Icon size={17} />{label}{label === 'Forecast' && <span className="new-pill">NEW</span>}</button>)}</nav>
      <div className="nav-label second">GERENCIAMENTO</div>
      <nav>
        <button className={`nav-item ${view === 'Customers' ? 'active' : ''}`} onClick={() => setView('Customers')}><Users size={17} />Customers</button>
        <button className={`nav-item ${view === 'Products' ? 'active' : ''}`} onClick={() => setView('Products')}><ShoppingBag size={17} />Products</button>
        <button className={`nav-item ${view === 'Settings' ? 'active' : ''}`} onClick={() => setView('Settings')}><Settings2 size={17} />Settings</button>
      </nav>
      <div className="sidebar-bottom">
        <div className="upgrade"><div className="upgrade-icon"><Sparkles size={16} /></div><b>Insights que movem</b><p>Descubra novas oportunidades com análises inteligentes.</p><button onClick={() => view === 'Analytics' ? document.getElementById('insights')?.scrollIntoView({ behavior: 'smooth' }) : setView('Analytics')}>Explorar insights <span>↗</span></button></div>
        <button className="profile profile-button" onClick={() => setPopover(popover === 'profile' ? '' : 'profile')} aria-expanded={popover === 'profile'}><span className="avatar">GM</span><span><b>Gabriel Martins</b><small>Plano Pro</small></span><ChevronDown size={15} /></button>
        {popover === 'profile' && <div className="sidebar-popover profile-popover"><b>Gabriel Martins</b><span>Plano Pro · Perfil local</span><button onClick={() => { setDialog('profile'); setPopover('') }}>Ver detalhes do perfil</button></div>}
      </div>
    </aside>

    <main className="main">
      <header className="topbar">
        <div className="crumb"><span>Workspace</span><b>/</b><strong>{viewTitles[view]}</strong></div>
        <div className="top-actions">
          {searchOpen ? <div className="search search-active"><Search size={15} /><input ref={searchRef} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') setView(data?.top_products.some(product => product.product.toLowerCase().includes(query.toLowerCase())) ? 'Products' : 'Customers') }} placeholder="Buscar produtos ou segmentos..." aria-label="Buscar produtos ou segmentos" /><button className="search-close" onClick={() => { setSearchOpen(false); setQuery('') }} aria-label="Fechar busca"><X size={14} /></button></div> : <button className="search" onClick={() => setSearchOpen(true)}><Search size={15} /><span>Buscar qualquer coisa...</span><kbd>Ctrl K</kbd></button>}
          <button className="icon-button" aria-label="Notificações" aria-expanded={popover === 'notifications'} onClick={() => setPopover(popover === 'notifications' ? '' : 'notifications')}><Bell size={17} /><i /></button>
          {popover === 'notifications' && <div className="top-popover notification-popover"><b>Atualizações</b><p>{error ? 'A API está indisponível.' : loading ? 'Carregando dados da API...' : 'Dashboard sincronizado com a API local.'}</p>{updatedAt && <small>Última consulta: {updatedAt.toLocaleTimeString('pt-BR')}</small>}{data?.insights[0] && <p className="notification-insight">{data.insights[0]}</p>}<button onClick={() => { setPopover(''); refreshData() }}>Atualizar agora</button></div>}
          <span className="top-divider" />
          <button className="help" onClick={() => setDialog('help')}><CircleHelp size={16} /><span>Ajuda</span></button>
        </div>
      </header>

      <div className="content">
        <div className="heading-row"><div><div className="eyebrow"><span className="live-dot" /> SEU NEGÓCIO EM TEMPO REAL</div><h1>{viewTitles[view]}</h1><p className="subtitle">Acompanhe seus resultados e transforme dados em decisões.</p></div><button className="export" onClick={() => exportData(view === 'Settings' ? 'Overview' : view)} disabled={!data}><Download size={15} /> Exportar CSV</button></div>
        {error && <div className="error" role="alert">Não foi possível conectar à API. Inicie o backend em <code>localhost:8000</code>. <span>{error}</span><button onClick={refreshData}>Tentar novamente</button></div>}

        {view !== 'Settings' && <div className="filter-row"><div className="filter-left"><span className="filter-caption">Visualizando</span><select value={period} onChange={event => setPeriod(event.target.value)} aria-label="Período"><option value="3m">Últimos 3 meses</option><option value="6m">Últimos 6 meses</option><option value="12m">Últimos 12 meses</option><option value="Tudo">Todo o período</option></select><span className="filter-caption category-caption">Categoria</span><select value={category} onChange={event => setCategory(event.target.value)} aria-label="Categoria"><option value="Todas">Todas</option>{data?.sales_by_category.map(item => <option key={item.category} value={item.category}>{item.category}</option>)}</select>{(period !== '12m' || category !== 'Todas' || query) && <button className="clear-filters" onClick={clearFilters}>Limpar filtros</button>}</div><div className="updated"><span className={`live-dot ${loading ? 'loading-dot' : ''}`} />{loading ? 'Atualizando dados...' : updatedAt ? `Atualizado às ${updatedAt.toLocaleTimeString('pt-BR')}` : 'Aguardando dados'}<button className="refresh-button" onClick={refreshData} disabled={loading} aria-label="Atualizar dados" title="Atualizar dados"><RefreshCw size={14} className={loading ? 'spin' : ''} /></button></div></div>}

        {showForecast && <article className="panel forecast-detail"><div className="forecast-copy"><span className="forecast-label">MODELO DIDÁTICO · REGRESSÃO LINEAR</span><h2>Receita estimada para {forecast?.period || '—'}: {forecast ? money(forecast.prediction) : '—'}</h2><p>O modelo aprende uma tendência linear a partir da receita mensal e extrapola um mês à frente. Treinado com {forecast?.training_points || 0} meses históricos; avaliação nos três meses seguintes ao treino.</p></div><div className="forecast-metrics"><div><span>MAE</span><b>{forecast ? money(forecast.mae) : '—'}</b></div><div><span>RMSE</span><b>{forecast ? money(forecast.rmse) : '—'}</b></div><div><span>Método</span><b>Regressão Linear</b></div></div><p className="forecast-note">Os erros são calculados em meses de validação que não participaram do ajuste do modelo. A regressão linear é simples de explicar, mas não captura sazonalidade nem campanhas. A previsão usa todo o histórico do CSV, independentemente do filtro de período.</p><div className="forecast-history"><h3>Histórico e ajuste do modelo</h3><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={forecast?.history || []}><CartesianGrid stroke="#222936" vertical={false} /><XAxis dataKey="date" tickFormatter={value => new Date(`${value}-02`).toLocaleDateString('pt-BR', { month: 'short' })} axisLine={false} tickLine={false} tick={{ fill: '#788292', fontSize: 11 }} /><YAxis tickFormatter={shortMoney} axisLine={false} tickLine={false} tick={{ fill: '#788292', fontSize: 11 }} width={53} /><Tooltip contentStyle={{ background: '#151c26', border: '1px solid #2a3442', borderRadius: 10, color: '#fff' }} formatter={(value: number, name: string) => [money(value), name === 'actual' ? 'Receita observada' : 'Ajuste linear']} /><Area type="monotone" dataKey="actual" name="actual" stroke="#49b5e8" fill="#49b5e8" fillOpacity={0.08} /><Area type="monotone" dataKey="predicted" name="predicted" stroke="#a294ff" fill="none" strokeDasharray="5 4" /></AreaChart></ResponsiveContainer></div></div></article>}

        {view === 'Settings' && <article className="panel settings-panel"><div className="panel-head"><div><h2>Preferências do dashboard</h2><p>Configurações salvas neste navegador.</p></div><Settings2 size={18} /></div><label className="setting-row"><span><b>Atualização automática</b><small>Consultar a API a cada 60 segundos enquanto o dashboard estiver aberto.</small></span><input type="checkbox" checked={autoRefresh} onChange={event => changeAutoRefresh(event.target.checked)} /></label><div className="setting-row"><span><b>Fonte de dados</b><small>API FastAPI local · dados/vendas.csv</small></span><span className={`api-state ${error ? 'offline' : ''}`}>{error ? 'Indisponível' : loading ? 'Conectando' : 'Conectada'}</span></div><div className="setting-row"><span><b>Filtros padrão</b><small>Restaura para os últimos 12 meses e todas as categorias.</small></span><button className="text-button" onClick={clearFilters}>Restaurar</button></div><p className="settings-note">Os registros de vendas e a conversão exibida são sintéticos/didáticos; não representam clientes ou operações reais.</p></article>}

        {view !== 'Settings' && <section className="kpi-grid">{[
          { title: 'Receita total', value: kpis ? fmt(kpis.revenue) : '—', change: kpis?.growth, icon: Wallet, tint: 'violet', note: 'vs. mês anterior' },
          { title: 'Clientes ativos', value: kpis ? kpis.clients.toLocaleString('pt-BR') : '—', change: kpis?.clients_growth, icon: Users, tint: 'blue', note: 'vs. mês anterior' },
          { title: 'Ticket médio', value: kpis ? fmt(kpis.average_order) : '—', change: kpis?.average_order_growth, icon: ShoppingBag, tint: 'amber', note: 'vs. mês anterior' },
          { title: 'Taxa de conversão*', value: kpis ? `${kpis.conversion}%` : '—', change: kpis?.conversion_growth, icon: Activity, tint: 'green', note: 'proxy ilustrativo mensal' },
        ].map(item => <article className="kpi-card" key={item.title}><div className="kpi-top"><span>{item.title}</span><div className={`kpi-icon ${item.tint}`}><item.icon size={17} /></div></div><div className="kpi-value">{item.value}</div><div className="kpi-foot"><span className={(item.change ?? 0) >= 0 ? 'positive' : 'negative'}>{(item.change ?? 0) >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {Math.abs(item.change ?? 0)}{item.title === 'Taxa de conversão*' ? ' pp' : '%'}</span><span>{item.note}</span></div></article>)}</section>}

        {showCharts && <section className="chart-grid"><article className="panel revenue-panel"><div className="panel-head"><div><h2>Desempenho de vendas</h2><p>Acompanhe a evolução mensal por receita ou volume de pedidos.</p></div><select value={metric} onChange={event => setMetric(event.target.value)} aria-label="Métrica do gráfico"><option>Receita</option><option>Pedidos</option></select></div><div className="chart-legend"><span className="legend-dot purple" /> {metric} <span className="legend-meta">mensal</span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data?.sales_over_time || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}><defs><linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8b79ff" stopOpacity={.26} /><stop offset="100%" stopColor="#8b79ff" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#222936" vertical={false} /><XAxis dataKey="date" tickFormatter={value => new Date(`${value}-02`).toLocaleDateString('pt-BR', { month: 'short' })} axisLine={false} tickLine={false} tick={{ fill: '#788292', fontSize: 11 }} dy={9} /><YAxis tickFormatter={metric === 'Receita' ? shortMoney : (value: number) => String(value)} axisLine={false} tickLine={false} tick={{ fill: '#788292', fontSize: 11 }} width={53} /><Tooltip contentStyle={{ background: '#151c26', border: '1px solid #2a3442', borderRadius: 10, color: '#fff' }} formatter={(value: number) => [metric === 'Receita' ? fmt(value) : value, metric]} /><Area type="monotone" dataKey={metric === 'Receita' ? 'revenue' : 'orders'} stroke="#9888ff" strokeWidth={2.5} fill="url(#fillRevenue)" activeDot={{ r: 5, fill: '#a89aff', stroke: '#151c26', strokeWidth: 3 }} /></AreaChart></ResponsiveContainer></div></article>
          <article className="panel category-panel"><div className="panel-head"><div><h2>Vendas por categoria</h2><p>Distribuição da receita por segmento.</p></div><button className="more" aria-label="Ações da categoria" aria-expanded={popover === 'categories'} onClick={() => setPopover(popover === 'categories' ? '' : 'categories')}>•••</button>{popover === 'categories' && <div className="panel-popover"><button onClick={() => exportData('Analytics')}><Download size={14} /> Exportar dados</button><button onClick={clearFilters}>Limpar filtros</button></div>}</div><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data?.sales_by_category || []} dataKey="revenue" nameKey="category" innerRadius={69} outerRadius={94} paddingAngle={4} stroke="none">{(data?.sales_by_category || []).map((item, index) => <Cell key={item.category} fill={colorSet[index % colorSet.length]} />)}</Pie><Tooltip formatter={(value: number) => fmt(value)} contentStyle={{ background: '#151c26', border: '1px solid #2a3442', borderRadius: 10 }} /></PieChart></ResponsiveContainer><div className="donut-center"><span>Receita</span><b>{shortMoney(kpis?.revenue || 0)}</b></div></div><div className="category-legend">{(data?.sales_by_category || []).map((item, index) => <div key={item.category}><span className="legend-dot" style={{ background: colorSet[index % colorSet.length] }} />{item.category}<b>{kpis?.revenue ? Math.round(item.revenue / kpis.revenue * 100) : 0}%</b></div>)}</div></article></section>}

        {showProducts && <section className="lower-grid"><article className="panel products-panel"><div className="panel-head"><div><h2>Produtos em destaque</h2><p>{view === 'Products' ? 'Produtos mais vendidos no período selecionado.' : 'Os produtos mais vendidos no período.'}</p></div><button className="text-button" onClick={() => view === 'Products' ? exportData('Products') : setView('Products')}>{view === 'Products' ? <><Download size={14} /> Exportar produtos</> : <>Ver todos <span>↗</span></>}</button></div>{searchOpen && query && <div className="search-summary">{filteredProducts.length} produto(s) correspondem a “{query}”.</div>}<div className="table-wrap"><table><thead><tr><th>PRODUTO</th><th>CATEGORIA</th><th>UNIDADES</th><th>RECEITA</th></tr></thead><tbody>{filteredProducts.map((product, index) => <tr key={product.product}><td><button className="product-link" onClick={() => { setSelectedProduct(product); setDialog('product') }}><span className={`product-thumb thumb-${index % 5}`}>{['◈', '▧', '◉', '◫', '◇'][index % 5]}</span><b>{product.product}</b></button></td><td><span className="category-tag">{product.category || 'Não informado'}</span></td><td>{product.units}</td><td className="table-revenue">{money(product.revenue)}</td></tr>)}</tbody></table>{filteredProducts.length === 0 && <p className="empty-state">Nenhum produto corresponde à busca.</p>}</div></article>
          {showCustomers && <article className="panel segment-panel"><div className="panel-head"><div><h2>Seus clientes</h2><p>Distribuição por segmento.</p></div><button className="more" aria-label="Ações dos clientes" aria-expanded={popover === 'segments'} onClick={() => setPopover(popover === 'segments' ? '' : 'segments')}>•••</button>{popover === 'segments' && <div className="panel-popover"><button onClick={() => exportData('Customers')}><Download size={14} /> Exportar segmentos</button><button onClick={() => setView('Customers')}>Ver clientes</button></div>}</div>{searchOpen && query && <div className="search-summary">{filteredSegments.length} segmento(s) correspondem à busca.</div>}<div className="segment-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={filteredSegments} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}><CartesianGrid stroke="#222936" horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="segment" width={85} axisLine={false} tickLine={false} tick={{ fill: '#a4adba', fontSize: 11 }} /><Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#151c26', border: '1px solid #2a3442', borderRadius: 10 }} /><Bar dataKey="customers" name="Clientes" radius={[0, 5, 5, 0]} barSize={13}>{filteredSegments.map((segment, index) => <Cell key={segment.segment} fill={colorSet[index % colorSet.length]} />)}</Bar></BarChart></ResponsiveContainer></div><div className="segment-foot"><Users size={15} /><span><b>{kpis?.clients.toLocaleString('pt-BR') || '—'}</b> clientes no total</span></div></article>}</section>}

        {view === 'Customers' && <><section className="panel segment-panel customer-detail-panel"><div className="panel-head"><div><h2>Clientes por segmento</h2><p>Clientes únicos no período selecionado.</p></div><button className="text-button" onClick={() => exportData('Customers')}><Download size={14} /> Exportar</button></div>{searchOpen && query && <div className="search-summary">{filteredSegments.length} segmento(s) correspondem à busca.</div>}<div className="segment-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={filteredSegments} layout="vertical" margin={{ left: 0, right: 12, top: 0, bottom: 0 }}><CartesianGrid stroke="#222936" horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="segment" width={85} axisLine={false} tickLine={false} tick={{ fill: '#a4adba', fontSize: 11 }} /><Tooltip cursor={{ fill: '#ffffff08' }} contentStyle={{ background: '#151c26', border: '1px solid #2a3442', borderRadius: 10 }} /><Bar dataKey="customers" name="Clientes" radius={[0, 5, 5, 0]} barSize={13}>{filteredSegments.map((segment, index) => <Cell key={segment.segment} fill={colorSet[index % colorSet.length]} />)}</Bar></BarChart></ResponsiveContainer></div><div className="segment-foot"><Users size={15} /><span><b>{kpis?.clients.toLocaleString('pt-BR') || '—'}</b> clientes no total</span></div></section><p className="data-note">Os totais por segmento são calculados pela API a partir do CSV sintético do projeto.</p></>}
        {showAnalytics && <section id="insights" className="insight-grid"><article className="panel insight-panel"><div className="insight-title"><div className="spark-icon"><Sparkles size={16} /></div><div><h2>Insights do período</h2><p>O que os dados estão dizendo</p></div></div><div className="insight-items">{(data?.insights || []).map((insight, index) => <div className="insight-item" key={insight}><span className={`insight-number n${index}`}>0{index + 1}</span><span>{insight}</span></div>)}</div></article><article className="panel forecast-teaser"><div className="forecast-icon"><Zap size={17} /></div><div className="forecast-copy"><span className="forecast-label">PREVISÃO COM MACHINE LEARNING</span><h2>Próximo mês: {forecast ? money(forecast.prediction) : '—'}</h2><p>Estimativa por regressão linear com base em {forecast?.training_points || 0} meses de histórico.</p></div><button onClick={() => setView('Forecast')}>Ver previsão <span>↗</span></button></article></section>}
        {showOverview && <section className="insight-grid"><article className="panel insight-panel"><div className="insight-title"><div className="spark-icon"><Sparkles size={16} /></div><div><h2>Insights do período</h2><p>O que os dados estão dizendo</p></div></div><div className="insight-items">{(data?.insights || []).map((insight, index) => <div className="insight-item" key={insight}><span className={`insight-number n${index}`}>0{index + 1}</span><span>{insight}</span></div>)}</div></article><article className="panel forecast-teaser"><div className="forecast-icon"><Zap size={17} /></div><div className="forecast-copy"><span className="forecast-label">PREVISÃO COM MACHINE LEARNING</span><h2>Próximo mês: {forecast ? money(forecast.prediction) : '—'}</h2><p>Estimativa por regressão linear com base em {forecast?.training_points || 0} meses de histórico. Os dados de treino são sintéticos.</p></div><button onClick={() => setView('Forecast')}>Ver previsão <span>↗</span></button></article></section>}

        {showForecast && <article className="panel forecast-teaser forecast-return"><div className="forecast-icon"><Zap size={17} /></div><div className="forecast-copy"><span className="forecast-label">PREVISÃO COM MACHINE LEARNING</span><h2>Estimativa: {forecast ? money(forecast.prediction) : '—'}</h2><p>Baseada no histórico sintético completo disponível no projeto.</p></div><button onClick={() => setView('Overview')}>Voltar à visão geral <span>↗</span></button></article>}
        <footer><span>© 2025 Pulse Analytics</span><span>Feito para decisões melhores <span className="footer-pulse">●</span></span><span>Dados fictícios para demonstração</span></footer>
      </div>
    </main>

    {dialog && <div className="dialog-backdrop" role="presentation" onClick={() => setDialog('')}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={event => event.stopPropagation()}><button className="dialog-close" onClick={() => setDialog('')} aria-label="Fechar"><X size={17} /></button>{dialog === 'help' ? <><div className="spark-icon"><CircleHelp size={17} /></div><h2 id="dialog-title">Ajuda do Pulse Analytics</h2><p>Os filtros consultam a API local e atualizam os indicadores e gráficos. Use “Exportar CSV” para baixar os dados da seção aberta.</p><p>Os dados são fictícios e ficam em <code>dados/vendas.csv</code>. A previsão é uma regressão linear explicável, não uma recomendação operacional.</p><a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">Abrir documentação da API ↗</a></> : dialog === 'product' && selectedProduct ? <><div className="spark-icon"><ShoppingBag size={17} /></div><h2 id="dialog-title">{selectedProduct.product}</h2><p>Categoria: <b>{selectedProduct.category || 'Não informada pela API'}</b></p><div className="product-detail-metrics"><span>Unidades vendidas<b>{selectedProduct.units.toLocaleString('pt-BR')}</b></span><span>Receita no período<b>{money(selectedProduct.revenue)}</b></span></div><p>Valores agregados pela API para o período e a categoria selecionados.</p></> : <><div className="spark-icon"><Users size={17} /></div><h2 id="dialog-title">Gabriel Martins</h2><p>Perfil local da demonstração · Plano Pro.</p><p>Este dashboard não utiliza autenticação nem envia dados de perfil para serviços externos.</p></>}</section></div>}
    {toast && <div className={`toast ${toast.kind}`} role="status"><span>{toast.text}</span><button onClick={() => setToast(null)} aria-label="Fechar mensagem"><X size={14} /></button></div>}
  </div>
}
