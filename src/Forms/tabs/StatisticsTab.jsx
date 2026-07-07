import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Form, Spinner } from 'react-bootstrap';
import { getToken } from '../../auth';
import { useTheme } from '../../ThemeContext';
import { useToast } from '../../components/Toast';
import EmptyState from '../../components/EmptyState/EmptyState';

// chart.js lives here — code-split out of the main bundle.
const FormCharts = lazy(() => import('./FormCharts'));

const SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Loader = () => (
  <div className="mi-card">
    <div className="mi-card__body text-center">
      <Spinner animation="border" className="text-primary" role="status">
        <span className="visually-hidden">Loading…</span>
      </Spinner>
    </div>
  </div>
);

/**
 * Statistics tab: pick a form, see its KPIs and charts inline (no modal).
 * `forms` is provided by the parent so we don't refetch the list.
 */
function StatisticsTab({ forms = [] }) {
  const { theme } = useTheme();
  const { showError } = useToast();
  const isDarkMode = theme === 'dark';

  const [selectedId, setSelectedId] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Auto-select the first form once the list arrives.
  useEffect(() => {
    if (forms.length && selectedId == null) setSelectedId(forms[0].id);
  }, [forms, selectedId]);

  // Fetch per-form stats whenever the selection changes.
  useEffect(() => {
    if (selectedId == null) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setStats(null);
      try {
        const token = getToken();
        const res = await fetch(`${SERVER_URL}/forms/${selectedId}/stats/`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setStats(data.stats);
        } else if (!cancelled) {
          showError('Failed to fetch form statistics');
        }
      } catch (e) {
        if (!cancelled) showError('Error fetching form statistics: ' + e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (!forms.length) {
    return (
      <div className="mi-card">
        <EmptyState
          icon="bi-bar-chart"
          title="No statistics yet"
          description="Create a form and collect responses to see analytics here."
        />
      </div>
    );
  }

  return (
    <div>
      <div className="mi-toolbar">
        <div className="mi-field">
          <label>Form</label>
          <Form.Select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            style={{ minWidth: 280 }}
          >
            {forms.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
          </Form.Select>
        </div>
      </div>

      {loading || !stats ? (
        <Loader />
      ) : (
        <>
          <section className="mi-stats" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="mi-stat">
              <div className="mi-stat__label">Total responses</div>
              <div className="mi-stat__value"><span className="mi-accent">{stats.total_responses}</span></div>
            </div>
            <div className="mi-stat">
              <div className="mi-stat__label">Response rate</div>
              <div className="mi-stat__value">{stats.response_rate}%</div>
            </div>
            <div className="mi-stat">
              <div className="mi-stat__label">Choice questions</div>
              <div className="mi-stat__value">{Object.keys(stats.field_stats || {}).length}</div>
            </div>
          </section>

          <Suspense fallback={<Loader />}>
            <FormCharts stats={stats} isDarkMode={isDarkMode} />
          </Suspense>
        </>
      )}
    </div>
  );
}

export default StatisticsTab;
