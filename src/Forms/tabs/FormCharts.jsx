import React from 'react';
import { Row, Col, Table, Badge, Alert } from 'react-bootstrap';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import '../FormStats.css';

// chart.js is only pulled into the bundle when this module is lazily imported
// (i.e. when the Statistics tab renders a selected form).
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

// Montimage charter palette — mirrors design-mockup/mockup.css (Golden Amber).
const MI = {
  amber: '#E9AB34',
  amberHover: '#D49A2E',
  amberLight: '#F0BC52',
  info: '#3B82F6',
  success: '#22C55E',
  neutral: '#8B7D6B',
  warning: '#F59E0B',
  danger: '#EF4444',
};

// Ordered categorical sequence for pie/doughnut slices (matches the mockup donut:
// amber → info → success → neutral, then extends for larger option sets).
const CATEGORICAL = [MI.amber, MI.info, MI.success, MI.neutral, MI.warning, MI.danger, MI.amberLight, MI.amberHover];

// Theme-aware axis / grid / legend colours drawn from the warm token palette.
const getChartTheme = (isDarkMode) => ({
  text: isDarkMode ? '#9A8E7C' : '#8B7D6B',
  grid: isDarkMode ? '#3A332B' : '#E7DECF',
  sliceBorder: isDarkMode ? '#221E18' : '#FFFFFF',
});

const buildFieldChart = (stats, ct) => {
  const labels = Object.keys(stats.choice_distribution);
  const data = Object.values(stats.choice_distribution).map((item) => item.count);

  if (stats.type === 'radio' || stats.type === 'select') {
    return {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: labels.map((_, i) => CATEGORICAL[i % CATEGORICAL.length]),
          borderWidth: 2,
          borderColor: ct.sliceBorder,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { padding: 15, usePointStyle: true, font: { size: 11 }, color: ct.text } },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.raw;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
      },
    };
  }
  if (stats.type === 'checkbox') {
    return {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Responses', data, backgroundColor: MI.amber, borderColor: MI.amberHover, borderWidth: 1, borderRadius: 4 }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, color: ct.text }, grid: { color: ct.grid } },
          x: { ticks: { color: ct.text }, grid: { color: ct.grid } },
        },
      },
    };
  }
  return null;
};

const buildTrendsChart = (trends, ct) => {
  if (!trends || !Array.isArray(trends) || trends.length === 0) return null;
  const labels = trends.map((item) => new Date(item.date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }));
  const data = trends.map((item) => item.count);
  return {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Responses',
        data,
        borderColor: MI.amber,
        backgroundColor: 'rgba(233, 171, 52, 0.12)',
        pointBackgroundColor: MI.amber,
        pointBorderColor: MI.amber,
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, color: ct.text }, grid: { color: ct.grid } },
        x: { ticks: { color: ct.text }, grid: { color: ct.grid } },
      },
    },
  };
};

const renderChart = (cfg) => {
  if (!cfg) return null;
  switch (cfg.type) {
    case 'doughnut': return <Doughnut data={cfg.data} options={cfg.options} />;
    case 'bar': return <Bar data={cfg.data} options={cfg.options} />;
    case 'line': return <Line data={cfg.data} options={cfg.options} />;
    default: return null;
  }
};

/**
 * Renders the trends line and per-field distribution charts + tables inline.
 * Lazily imported so chart.js is not part of the main bundle.
 */
function FormCharts({ stats, isDarkMode }) {
  const chartTheme = getChartTheme(isDarkMode);
  const fieldEntries = Object.entries(stats.field_stats || {});
  const trendsChart = buildTrendsChart(stats.completion_trends, chartTheme);

  return (
    <>
      <div className="mi-card mb-3">
        <div className="mi-card__head"><div className="mi-card__title">Response trend — last 30 days</div></div>
        <div className="mi-card__body">
          <div className="chart-container">
            {trendsChart ? renderChart(trendsChart) : (
              <div className="d-flex align-items-center justify-content-center h-100">
                <Alert variant="info" className="mb-0">No responses yet — trends will appear after the first submissions.</Alert>
              </div>
            )}
          </div>
        </div>
      </div>

      {fieldEntries.length > 0 ? (
        <div className="chart-grid">
          {fieldEntries.map(([fieldName, s]) => {
            const cfg = buildFieldChart(s, chartTheme);
            return (
              <div key={fieldName} className="mi-card">
                <div className="mi-card__head">
                  <div className="mi-card__title" style={{ fontSize: '.95rem' }}>
                    {s.label || fieldName} <span className="text-muted" style={{ fontSize: '.8rem', fontWeight: 400 }}>({s.type})</span>
                  </div>
                </div>
                <div className="mi-card__body">
                  <Row>
                    <Col lg={7}><div className="chart-container">{cfg && renderChart(cfg)}</div></Col>
                    <Col lg={5}>
                      <Table size="sm" className="response-distribution-table">
                        <thead><tr><th>Option</th><th>Count</th><th>%</th></tr></thead>
                        <tbody>
                          {Object.entries(s.choice_distribution).map(([choice, d]) => (
                            <tr key={choice}>
                              <td>{choice}</td>
                              <td><Badge bg="primary" className="me-1">{d.count}</Badge></td>
                              <td>{d.percentage}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Alert variant="info">
          This form has no choice-based questions (radio, checkbox, select) to analyze, or no responses have been submitted yet.
        </Alert>
      )}
    </>
  );
}

export default FormCharts;
