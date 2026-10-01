import { Area, AreaChart, CartesianGrid, Line, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export type ForecastModel = {
  period: string
  prediction: number
  mae: number | null
  rmse: number | null
  training_points: number
  validation_training_points?: number
  history: { date: string; actual: number; predicted: number }[]
  future?: { date: string; prediction: number }[]
}

type Props = { forecast: ForecastModel | null; period: string; category: string; loading: boolean }

const money = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
const shortMoney = (value: number) => value >= 1000 ? `R$ ${(value / 1000).toFixed(1).replace('.', ',')}k` : money(value)
const monthLabel = (value: string) => new Date(`${value}-02`).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })

export default function ForecastPanel({ forecast, period, category, loading }: Props) {
  const history = forecast?.history ?? []
  const current = history[history.length - 1]
  const future = forecast?.future?.length
    ? forecast.future
    : forecast ? [{ date: forecast.period, prediction: forecast.prediction }] : []
  const next = future[0]
  const last = future[future.length - 1]
  const monthlyChange = current && next?.prediction !== undefined && current.actual !== 0
    ? (next.prediction / current.actual - 1) * 100
    : null
  const trendChange = current && last && current.actual !== 0
    ? (last.prediction / current.actual - 1) * 100
    : null
  const direction = trendChange === null || Math.abs(trendChange) < 0.5 ? 'estável' : trendChange > 0 ? 'crescimento' : 'queda'
  const averageRevenue = history.length ? history.reduce((sum, point) => sum + point.actual, 0) / history.length : 0
  const errorRatio = forecast?.rmse !== null && forecast?.rmse !== undefined && averageRevenue > 0
    ? forecast.rmse / averageRevenue
    : null
  const confidence = errorRatio === null ? 'indisponível' : errorRatio <= 0.1 ? 'alta' : errorRatio <= 0.25 ? 'moderada' : 'baixa'
  const chartData = [
    ...history.map((point, index) => ({ ...point, forecast: index === history.length - 1 ? point.actual : null })),
    ...future.map(point => ({ date: point.date, actual: null, predicted: null, forecast: point.prediction })),
  ]

  return <article className="panel forecast-enhanced">
    <div className="forecast-enhanced-head">
      <div className="forecast-copy">
        <span className="forecast-label">MODELO DIDÁTICO · REGRESSÃO LINEAR</span>
        <h2>Previsão de receita</h2>
        <p>{loading ? 'Atualizando para os filtros selecionados...' : `Próximo mês (${next?.date ?? forecast?.period ?? '—'}): ${money(next?.prediction ?? forecast?.prediction ?? null)}`}</p>
      </div>
      <div className={`forecast-confidence confidence-${confidence}`}>
        <span>Confiabilidade</span>
        <b>{confidence[0].toLocaleUpperCase('pt-BR') + confidence.slice(1)}</b>
        <small>{errorRatio === null ? 'Histórico insuficiente para avaliar' : `RMSE equivale a ${(errorRatio * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% da receita média`}</small>
      </div>
    </div>

    <div className="forecast-signal-row">
      <div className={`forecast-signal trend-${direction}`}><span>Tendência em 3 meses</span><b>{trendChange === null ? '—' : `${direction === 'crescimento' ? '+' : ''}${trendChange.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% · ${direction}`}</b></div>
      <div className="forecast-signal"><span>Variação prevista no próximo mês</span><b>{monthlyChange === null ? '—' : `${monthlyChange >= 0 ? '+' : ''}${monthlyChange.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`}</b></div>
      <div className="forecast-signal"><span>Histórico filtrado</span><b>{period} · {category}</b></div>
    </div>

    <div className="forecast-chart-legend"><span><i className="legend-dot actual-dot" /> Histórico real</span><span><i className="legend-dot current-dot" /> Ponto atual</span><span><i className="legend-dot prediction-dot" /> Previsão linear</span></div>
    <div className="forecast-chart">
      {chartData.length > 0 ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData} margin={{ top: 15, right: 18, left: 4, bottom: 4 }}>
        <defs><linearGradient id="forecastHistoryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#49b5e8" stopOpacity={0.2} /><stop offset="100%" stopColor="#49b5e8" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke="#222936" vertical={false} />
        <XAxis dataKey="date" tickFormatter={monthLabel} axisLine={false} tickLine={false} tick={{ fill: '#788292', fontSize: 11 }} minTickGap={20} />
        <YAxis tickFormatter={shortMoney} axisLine={false} tickLine={false} tick={{ fill: '#788292', fontSize: 11 }} width={58} />
        <Tooltip contentStyle={{ background: '#151c26', border: '1px solid #2a3442', borderRadius: 10, color: '#fff' }} labelFormatter={monthLabel} formatter={(value: number | string | (number | string)[] | undefined, name: string) => [money(typeof value === 'number' ? value : null), name === 'actual' ? 'Receita observada' : 'Projeção linear']} />
        <Area type="monotone" dataKey="actual" name="actual" stroke="#49b5e8" strokeWidth={2.5} fill="url(#forecastHistoryFill)" connectNulls={false} />
        <Line type="monotone" dataKey="forecast" name="forecast" stroke="#f2b05e" strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 3, fill: '#f2b05e', stroke: '#151c26', strokeWidth: 2 }} connectNulls={false} />
        {current && <ReferenceDot x={current.date} y={current.actual} r={5} fill="#49b5e8" stroke="#151c26" strokeWidth={2} label={{ value: 'Atual', position: 'top', fill: '#d7e6ee', fontSize: 10 }} />}
      </AreaChart></ResponsiveContainer> : <div className="forecast-chart-empty">Aguardando dados históricos da API.</div>}
    </div>

    <div className="forecast-metrics"><div><span>MAE · erro médio</span><b>{money(forecast?.mae ?? null)}</b></div><div><span>RMSE · penaliza erros maiores</span><b>{money(forecast?.rmse ?? null)}</b></div><div><span>Meses usados no ajuste</span><b>{forecast?.training_points ?? '—'}</b></div></div>
    <p className="forecast-note">A confiabilidade é uma indicação heurística baseada no RMSE relativo à receita média histórica: até 10% alta, até 25% moderada e acima disso baixa. MAE e RMSE são avaliados nos últimos meses fora do ajuste. A regressão linear não representa sazonalidade nem campanhas; os valores usam o CSV sintético do projeto.</p>
  </article>
}