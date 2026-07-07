import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Button, Modal, Form } from 'react-bootstrap';
import { getToken } from '../auth';
import { useToast } from '../components/Toast';
import './FormsView.css';
import { useSearchParams } from 'react-router-dom';
import StatisticsTab from './tabs/StatisticsTab';
import OrganizationBadges from '../components/OrganizationBadges/OrganizationBadges';
import EmptyState from '../components/EmptyState/EmptyState';
import TableSkeleton from '../components/Skeleton/TableSkeleton';
import ConfirmModal from '../components/ConfirmModal/ConfirmModal';
import FormBuilderModal from './components/FormBuilderModal';
import ImportFormModal from './components/ImportFormModal';

// Configuration de l'URL du serveur
const SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Debounce a fast-changing value (search inputs) so downstream filtering
// doesn't recompute on every keystroke.
function useDebouncedValue(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const FormsView = () => {
  const { showError, showSuccess } = useToast();
  // Active tab is synced to the URL (?tab=forms|answers|stats) so it survives
  // reloads and can be deep-linked (e.g. the /admin/form-stats redirect).
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'forms';
  const setActiveTab = (tab) => setSearchParams(tab === 'forms' ? {} : { tab });
  const [forms, setForms] = useState([]);
  const [formAnswers, setFormAnswers] = useState([]);
  const [overviewStats, setOverviewStats] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showBuilder, setShowBuilder] = useState(false);      // unified create/edit
  const [builderMode, setBuilderMode] = useState('create');    // 'create' | 'edit'
  const [builderInitial, setBuilderInitial] = useState(null);  // form being edited
  const [showImport, setShowImport] = useState(false);         // single-step import
  const [showFormModal, setShowFormModal] = useState(false);   // read-only view
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [formToDelete, setFormToDelete] = useState(null);

  // Organizations available to assign forms to (passed to builder/import modals)
  const [availableOrganizations, setAvailableOrganizations] = useState([]);

  // Answer viewing states
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [loadingAnswerDetails, setLoadingAnswerDetails] = useState(false);

  // Grouped answers states
  const [expandedForms, setExpandedForms] = useState(new Set());

  // Filters / sort — Forms tab
  const [formSearch, setFormSearch] = useState('');
  const [formStatus, setFormStatus] = useState('all'); // 'all' | 'active' | 'inactive'
  const [formOrg, setFormOrg] = useState('all');        // 'all' | organization name
  const [formSort, setFormSort] = useState({ key: 'created', dir: 'desc' });

  // Filters — Answers tab
  const [answerSearch, setAnswerSearch] = useState('');
  const [answerForm, setAnswerForm] = useState('all');  // 'all' | form id

  // Debounced search terms actually used for filtering.
  const debouncedFormSearch = useDebouncedValue(formSearch);
  const debouncedAnswerSearch = useDebouncedValue(answerSearch);

  // Fetch overview KPIs (total forms / responses / average) for the header cards.
  const fetchOverviewStats = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${SERVER_URL}/forms/stats/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setOverviewStats(data.overview_stats);
      }
    } catch (error) {
      // KPIs are non-critical; fail silently rather than blocking the page.
      console.error('Error fetching overview stats:', error);
    }
  };

  // Fetch forms from API
  const fetchForms = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${SERVER_URL}/forms/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setForms(data.forms || []);
      } else {
        showError('Failed to fetch forms');
      }
    } catch (error) {
      showError('Error fetching forms: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch form answers from API
  const fetchFormAnswers = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${SERVER_URL}/forms/answers/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormAnswers(data.answers || []);
      } else {
        showError('Failed to fetch form answers');
      }
    } catch (error) {
      showError('Error fetching form answers: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch available organizations
  const fetchOrganizations = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${SERVER_URL}/organizations/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data && data.organizations && data.organizations.length > 0) {
          setAvailableOrganizations(data.organizations);
        } else {
          setAvailableOrganizations([]);
          showError('No organizations available in the system.');
        }
      } else {
        throw new Error(`HTTP ${response.status}: Failed to fetch organizations`);
      }
    } catch (error) {
      showError('Failed to load organizations: ' + error.message);
      setAvailableOrganizations([]);
    }
  };

  // Create (POST) or update (PUT) a form, organizations included, in one step.
  const handleSaveForm = async (formData, mode) => {
    if (!formData.organizations || formData.organizations.length === 0) {
      showError('Please select at least one organization');
      return false;
    }
    try {
      const token = getToken();
      const url = mode === 'edit'
        ? `${SERVER_URL}/forms/${formData.id}/`
        : `${SERVER_URL}/forms/`;
      const response = await fetch(url, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          fields: formData.fields,
          is_active: formData.is_active,
          organizations: formData.organizations,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
      }
      await response.json();
      showSuccess(mode === 'edit' ? 'Form updated successfully!' : 'Form created successfully!');
      await fetchForms();
      fetchOverviewStats();
      return true;
    } catch (error) {
      showError('Error saving form: ' + error.message);
      return false;
    }
  };

  // Import a Google Form (POST) with its target organizations, in one step.
  const handleImportForm = async ({ form_url, organizations }) => {
    if (!organizations || organizations.length === 0) {
      showError('Please select at least one organization');
      return false;
    }
    try {
      const token = getToken();
      const response = await fetch(`${SERVER_URL}/forms/import-google-form/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ form_url, organizations }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || JSON.stringify(errorData));
      }
      await response.json();
      showSuccess('Form imported successfully!');
      await fetchForms();
      fetchOverviewStats();
      return true;
    } catch (error) {
      showError('Error importing form: ' + error.message);
      return false;
    }
  };

  // Delete form
  const handleDeleteForm = async () => {
    if (!formToDelete) return;

    try {
      setLoading(true);
      const token = getToken();
      
      const response = await fetch(`${SERVER_URL}/forms/${formToDelete.id}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        showSuccess('Form deleted successfully!');
        setShowDeleteModal(false);
        setFormToDelete(null);
        fetchForms();
      } else {
        const errorData = await response.json();
        showError('Failed to delete form: ' + JSON.stringify(errorData));
      }
    } catch (error) {
      showError('Error deleting form: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Confirm delete form
  const confirmDeleteForm = (form) => {
    setFormToDelete(form);
    setShowDeleteModal(true);
  };

  // Handle viewing answer details
  const handleViewAnswer = async (answer) => {
        setSelectedAnswer(answer);
    setLoadingAnswerDetails(true);
    
    try {
      // Fetch form details to get field labels
      const token = getToken();
      const response = await fetch(`${SERVER_URL}/forms/${answer.form}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const formData = await response.json();
        // Add form fields to the answer object so we can map field names to labels
        setSelectedAnswer({
          ...answer,
          formFields: formData.fields || []
        });
      } else {
                setSelectedAnswer(answer);
      }
    } catch (error) {
            setSelectedAnswer(answer);
    } finally {
      setLoadingAnswerDetails(false);
      setShowAnswerModal(true);
    }
  };

  // Close answer modal
  const handleCloseAnswerModal = () => {
    setShowAnswerModal(false);
    setSelectedAnswer(null);
  };

  // Helper function to get field label from field name
  const getFieldLabel = (fieldName, formFields) => {
    if (!formFields || formFields.length === 0) {
      return fieldName; // Fallback to field name if no form fields available
    }
    
    const field = formFields.find(f => f.name === fieldName);
    return field ? (field.label || field.name) : fieldName;
  };

  // Group form answers by form
  const groupAnswersByForm = (answers) => {
    const grouped = {};
    
    answers.forEach(answer => {
      const formId = answer.form;
      const formTitle = answer.form_title || `Form #${formId}`;
      
      if (!grouped[formId]) {
        grouped[formId] = {
          formId: formId,
          formTitle: formTitle,
          answers: [],
          count: 0
        };
      }
      
      grouped[formId].answers.push(answer);
      grouped[formId].count++;
    });
    
    return grouped;
  };

  // Toggle expanded state for a form
  const toggleFormExpansion = (formId) => {
    const newExpanded = new Set(expandedForms);
    if (newExpanded.has(formId)) {
      newExpanded.delete(formId);
    } else {
      newExpanded.add(formId);
    }
    setExpandedForms(newExpanded);
  };

  // Forms list + overview KPIs are loaded once on mount (KPIs are shown on every
  // tab, and the Forms tab is the default landing tab).
  useEffect(() => {
    fetchForms();
    fetchOverviewStats();
    fetchOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Answers are fetched lazily the first time the Answers tab is opened.
  useEffect(() => {
    if (activeTab === 'answers') {
      fetchFormAnswers();
    }
  }, [activeTab, fetchFormAnswers]);

  // Function to handle form editing
  // Open the builder in create mode with a blank form.
  const openCreateForm = () => {
    setBuilderMode('create');
    setBuilderInitial(null);
    setShowBuilder(true);
  };

  const handleEditForm = async (form) => {
    let full = form;
    try {
      const token = getToken();
      const response = await fetch(`${SERVER_URL}/forms/${form.id}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        full = await response.json();
      }
    } catch (error) {
      console.error('Error fetching complete form details:', error);
    }
    setBuilderMode('edit');
    setBuilderInitial(full);
    setShowBuilder(true);
  };

  // Forms filtered by search / status / organization, then sorted.
  const visibleForms = useMemo(() => {
    const q = debouncedFormSearch.trim().toLowerCase();
    const list = forms.filter((f) => {
      if (formStatus === 'active' && !f.is_active) return false;
      if (formStatus === 'inactive' && f.is_active) return false;
      if (formOrg !== 'all' && !(f.organization_names || []).includes(formOrg)) return false;
      if (q && !`${f.title} ${f.description || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const dir = formSort.dir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) =>
      formSort.key === 'title'
        ? a.title.localeCompare(b.title) * dir
        : (new Date(a.created_at) - new Date(b.created_at)) * dir
    );
  }, [forms, debouncedFormSearch, formStatus, formOrg, formSort]);

  const toggleSort = (key) =>
    setFormSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));

  // Answers filtered by search / form, then grouped for display.
  const visibleAnswers = useMemo(() => {
    const q = debouncedAnswerSearch.trim().toLowerCase();
    return formAnswers.filter((a) => {
      if (answerForm !== 'all' && String(a.form) !== String(answerForm)) return false;
      if (q && !`${a.event_name || ''} ${a.filled_by_username || ''} ${a.ip_address || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [formAnswers, debouncedAnswerSearch, answerForm]);

  const visibleGroupedAnswers = useMemo(
    () => groupAnswersByForm(visibleAnswers),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleAnswers]
  );

  // Export the currently-filtered answers as CSV (client-side).
  const exportAnswersCsv = () => {
    if (visibleAnswers.length === 0) {
      showError('No answers to export');
      return;
    }
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['Form', 'Event', 'Filled by', 'Filled at', 'IP address', 'Answers'];
    const lines = [header.map(esc).join(',')];
    visibleAnswers.forEach((a) => {
      lines.push([
        a.form_title || a.form,
        a.event_name || `Event #${a.event}`,
        a.filled_by_username || 'Anonymous',
        new Date(a.filled_at).toLocaleString(),
        a.ip_address || '',
        JSON.stringify(a.answers || {}),
      ].map(esc).join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'form-answers.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
    <div className="container-fluid mt-4">
      <Container fluid className="forms-container">
      <div className="mi-page-head">
        <div>
          <h1>Forms Management</h1>
          <div className="mi-sub">Create, import and analyze data-collection forms for partner organizations.</div>
        </div>
        <div className="mi-page-head__actions">
          <Button variant="outline-primary" onClick={() => setShowImport(true)}>
            <i className="bi bi-cloud-arrow-down me-2"></i>Import Form
          </Button>
          <Button variant="primary" onClick={openCreateForm}>
            <i className="bi bi-plus-lg me-2"></i>Create Form
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <section className="mi-stats">
        <div className="mi-stat mi-clickable" onClick={() => setActiveTab('stats')}>
          <div className="mi-stat__label">Total forms</div>
          <div className="mi-stat__value">{overviewStats ? overviewStats.total_forms : '—'}</div>
          <div className="mi-stat__delta">across {availableOrganizations.length} org{availableOrganizations.length !== 1 ? 's' : ''}</div>
        </div>
        <div className="mi-stat mi-clickable" onClick={() => setActiveTab('stats')}>
          <div className="mi-stat__label">Active forms</div>
          <div className="mi-stat__value"><span className="mi-accent">{forms.filter((f) => f.is_active).length}</span></div>
          <div className="mi-stat__delta">{forms.filter((f) => !f.is_active).length} inactive</div>
        </div>
        <div className="mi-stat mi-clickable" onClick={() => setActiveTab('answers')}>
          <div className="mi-stat__label">Total responses</div>
          <div className="mi-stat__value">{overviewStats ? overviewStats.total_responses : '—'}</div>
          <div className="mi-stat__delta">collected</div>
        </div>
        <div className="mi-stat mi-clickable" onClick={() => setActiveTab('stats')}>
          <div className="mi-stat__label">Avg / form</div>
          <div className="mi-stat__value">{overviewStats ? overviewStats.average_responses_per_form : '—'}</div>
          <div className="mi-stat__delta">responses</div>
        </div>
      </section>

      {/* Tabs */}
      <div className="mi-tabs" role="tablist" aria-label="Forms sections">
        <button
          role="tab"
          aria-selected={activeTab === 'forms'}
          className={"mi-tab" + (activeTab === 'forms' ? " active" : "")}
          onClick={() => setActiveTab('forms')}
        >
          <i className="bi bi-ui-checks-grid"></i> Forms
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'answers'}
          className={"mi-tab" + (activeTab === 'answers' ? " active" : "")}
          onClick={() => setActiveTab('answers')}
        >
          <i className="bi bi-chat-left-text"></i> Answers
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'stats'}
          className={"mi-tab" + (activeTab === 'stats' ? " active" : "")}
          onClick={() => setActiveTab('stats')}
        >
          <i className="bi bi-bar-chart"></i> Statistics
        </button>
      </div>

      {/* Forms Tab */}
      {activeTab === 'forms' && (
        <>
        <div className="mi-toolbar">
          <div className="mi-field">
            <label>Search</label>
            <div className="mi-search">
              <i className="bi bi-search"></i>
              <Form.Control
                type="search"
                value={formSearch}
                onChange={(e) => setFormSearch(e.target.value)}
                placeholder="Search forms by title…"
              />
            </div>
          </div>
          <div className="mi-field">
            <label>Status</label>
            <Form.Select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
              <option value="all">Any status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Form.Select>
          </div>
          <div className="mi-field">
            <label>Organization</label>
            <Form.Select value={formOrg} onChange={(e) => setFormOrg(e.target.value)}>
              <option value="all">All organizations</option>
              {availableOrganizations.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
            </Form.Select>
          </div>
        </div>
        <div className="mi-card">
          <div className="mi-card__head">
            <div className="mi-card__title">Forms <span className="mi-chip" style={{ marginLeft: 8 }}>{visibleForms.length}</span></div>
          </div>
          {loading ? (
            <TableSkeleton columns={7} />
          ) : (
            <div className="mi-table-wrap">
              <table className="mi-tbl">
                <thead>
                  <tr>
                    <th className="mi-sortable" onClick={() => toggleSort('title')}>
                      Title{formSort.key === 'title' && <i className={`bi bi-caret-${formSort.dir === 'asc' ? 'up' : 'down'}-fill ms-1`} style={{ fontSize: '.7rem' }}></i>}
                    </th>
                    <th>Description</th>
                    <th className="text-center">Organizations</th>
                    <th className="text-center">Status</th>
                    <th className="text-center mi-sortable" onClick={() => toggleSort('created')}>
                      Created{formSort.key === 'created' && <i className={`bi bi-caret-${formSort.dir === 'asc' ? 'up' : 'down'}-fill ms-1`} style={{ fontSize: '.7rem' }}></i>}
                    </th>
                    <th className="text-center">Fields</th>
                    <th className="text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {forms.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <EmptyState
                          icon="bi-ui-checks-grid"
                          title="No forms yet"
                          description="Create a form or import one from Google Forms to start collecting responses."
                          action={
                            <Button variant="primary" onClick={openCreateForm}>
                              <i className="bi bi-plus-lg me-2"></i>Create Form
                            </Button>
                          }
                        />
                      </td>
                    </tr>
                  ) : visibleForms.length === 0 ? (
                    <tr>
                      <td colSpan="7">
                        <EmptyState
                          icon="bi-search"
                          title="No forms match your filters"
                          description="Try adjusting your search, status or organization filters."
                        />
                      </td>
                    </tr>
                  ) : (
                    visibleForms.map((form) => (
                      <tr key={form.id}>
                        <td className="mi-ev-title">{form.title}</td>
                        <td>
                          {form.gform_url ? (
                            <>
                              <div>{form.description || 'Form imported from Google Forms'}</div>
                              <div className="mi-ev-sub">
                                <i className="bi bi-google" style={{ color: 'var(--mi-amber)' }}></i> Imported from Google Forms
                              </div>
                            </>
                          ) : (
                            form.description || 'No description'
                          )}
                        </td>
                        <td className="text-center">
                          <OrganizationBadges
                            organizations={form.organization_names}
                            maxVisible={2}
                          />
                        </td>
                        <td className="text-center">
                          <span className={`mi-badge ${form.is_active ? 'mi-success' : 'mi-neutral'}`}>
                            <span className="mi-led"></span> {form.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-center">{new Date(form.created_at).toLocaleDateString()}</td>
                        <td className="text-center">{form.fields?.length || 0}</td>
                        <td className="text-center">
                          <div className="mi-row-actions" style={{ justifyContent: 'center' }}>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => {
                                setSelectedForm(form);
                                setShowFormModal(true);
                              }}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => handleEditForm(form)}
                            >
                              Edit
                            </Button>
                            <button
                              type="button"
                              className="mi-icon-btn"
                              title="Statistics"
                              onClick={() => setActiveTab('stats')}
                            >
                              <i className="bi bi-bar-chart"></i>
                            </button>
                            <button
                              type="button"
                              className="mi-icon-btn mi-icon-btn--danger"
                              title="Delete"
                              onClick={() => confirmDeleteForm(form)}
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
      )}

      {/* Form Answers Tab */}
      {activeTab === 'answers' && (
        <>
        <div className="mi-toolbar">
          <div className="mi-field">
            <label>Search</label>
            <div className="mi-search">
              <i className="bi bi-search"></i>
              <Form.Control
                type="search"
                value={answerSearch}
                onChange={(e) => setAnswerSearch(e.target.value)}
                placeholder="Search by event, user or IP…"
              />
            </div>
          </div>
          <div className="mi-field">
            <label>Form</label>
            <Form.Select value={answerForm} onChange={(e) => setAnswerForm(e.target.value)}>
              <option value="all">All forms</option>
              {forms.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
            </Form.Select>
          </div>
          <div className="mi-toolbar__spacer"></div>
          <div className="mi-field">
            <label>&nbsp;</label>
            <Button variant="outline-primary" onClick={exportAnswersCsv} disabled={visibleAnswers.length === 0}>
              <i className="bi bi-download me-2"></i>Export CSV
            </Button>
          </div>
        </div>
        {loading ? (
          <div className="mi-card"><TableSkeleton columns={5} /></div>
        ) : formAnswers.length === 0 ? (
          <div className="mi-card">
            <EmptyState
              icon="bi-chat-left-text"
              title="No responses yet"
              description="Responses submitted when partners fill out your forms will appear here."
            />
          </div>
        ) : visibleAnswers.length === 0 ? (
          <div className="mi-card">
            <EmptyState
              icon="bi-search"
              title="No responses match your filters"
              description="Try adjusting your search or form filter."
            />
          </div>
        ) : (
          <div>
            {Object.entries(visibleGroupedAnswers).map(([formId, formGroup]) => (
              <div key={formId} className="mi-card mb-3">
                <button
                  type="button"
                  className="mi-card__head mi-acc-head"
                  aria-expanded={expandedForms.has(formId)}
                  onClick={() => toggleFormExpansion(formId)}
                >
                  <div className="mi-card__title">
                    <i className={`bi bi-chevron-${expandedForms.has(formId) ? 'down' : 'right'} me-2`}></i>
                    {formGroup.formTitle}
                    <span style={{ marginLeft: 8, fontWeight: 400, fontSize: '.82rem', color: 'var(--mi-muted)' }}>
                      {formGroup.count} response{formGroup.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <span className="mi-badge mi-info"><span className="mi-led"></span> {formGroup.count}</span>
                </button>

                {expandedForms.has(formId) && (
                  <div className="mi-table-wrap">
                    <table className="mi-tbl">
                      <thead>
                        <tr>
                          <th>Event</th>
                          <th>Filled By</th>
                          <th className="text-center">Filled At</th>
                          <th className="text-center">IP Address</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formGroup.answers.map((answer) => (
                          <tr key={answer.id}>
                            <td className="mi-ev-title">{answer.event_name || `Event #${answer.event}`}</td>
                            <td>{answer.filled_by_username || 'Anonymous'}</td>
                            <td className="text-center">{new Date(answer.filled_at).toLocaleString()}</td>
                            <td className="text-center mi-ev-sub">{answer.ip_address || 'N/A'}</td>
                            <td className="text-center">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                onClick={() => handleViewAnswer(answer)}
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        </>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <StatisticsTab forms={forms} />
      )}

      {/* View Form Modal */}
      <Modal show={showFormModal} onHide={() => setShowFormModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Form Details: {selectedForm?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedForm && (
            <div>
              <div className="mi-meta-chips" style={{ marginBottom: 16 }}>
                <span className={`mi-badge ${selectedForm.is_active ? 'mi-success' : 'mi-neutral'}`}>
                  <span className="mi-led"></span> {selectedForm.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="mi-chip"><i className="bi bi-calendar3"></i> {new Date(selectedForm.created_at).toLocaleDateString()}</span>
                <span className="mi-chip"><i className="bi bi-ui-checks"></i> {selectedForm.fields?.length || 0} fields</span>
              </div>

              {selectedForm.description && (
                <div className="mi-pv-field">
                  <label>Description</label>
                  <div className="mi-ctrl-ro">{selectedForm.description}</div>
                </div>
              )}

              <div className="mi-pv-field">
                <label>Organizations</label>
                {selectedForm.organization_names && selectedForm.organization_names.length > 0 ? (
                  <div className="mi-meta-chips" style={{ marginTop: 0 }}>
                    {selectedForm.organization_names.map((name, index) => (
                      <span key={index} className="mi-chip">{name}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted">{selectedForm.organization_name || 'No organization'}</span>
                )}
              </div>

              <div className="fb-section-title"><span>Fields</span></div>
              {selectedForm.fields?.length ? selectedForm.fields.map((field, index) => (
                <div key={index} className="fb-field-item">
                  <div className="fb-field-main">
                    <div className="fb-field-label">
                      {field.label || field.name}<span className="fb-type-badge">{field.type}</span>
                      {field.required && <span className="mi-badge mi-warning" style={{ marginLeft: 6 }}>Required</span>}
                    </div>
                    {field.options && (
                      <div className="fb-field-meta">
                        Options: {Array.isArray(field.options) ? field.options.join(', ') : field.options}
                      </div>
                    )}
                  </div>
                </div>
              )) : <p className="text-muted">No fields defined</p>}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFormModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create / Edit form (unified) */}
      <FormBuilderModal
        show={showBuilder}
        mode={builderMode}
        initialForm={builderInitial}
        organizations={availableOrganizations}
        onClose={() => setShowBuilder(false)}
        onSave={handleSaveForm}
      />

      {/* Import Google Form (single step) */}
      <ImportFormModal
        show={showImport}
        organizations={availableOrganizations}
        onClose={() => setShowImport(false)}
        onImport={handleImportForm}
      />

      {/* Delete confirmation */}
      <ConfirmModal
        show={showDeleteModal}
        title="Delete form"
        confirmLabel="Delete form"
        confirmVariant="danger"
        confirmIcon="bi-trash"
        loading={loading}
        onConfirm={handleDeleteForm}
        onCancel={() => { setShowDeleteModal(false); setFormToDelete(null); }}
      >
        <p>Are you sure you want to delete <strong>{formToDelete?.title}</strong>?</p>
        <p className="text-muted mb-0">
          <i className="bi bi-exclamation-triangle text-warning me-1"></i>
          This action cannot be undone. Existing responses will also be removed.
        </p>
      </ConfirmModal>

      {/* Answer Details Modal */}
      <Modal show={showAnswerModal} onHide={handleCloseAnswerModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Response Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAnswer && (
            <div>
              <div className="mi-meta-chips" style={{ marginBottom: 20 }}>
                <span className="mi-chip"><i className="bi bi-ui-checks"></i> {selectedAnswer.form_title || `Form #${selectedAnswer.form}`}</span>
                <span className="mi-chip"><i className="bi bi-person"></i> {selectedAnswer.filled_by_username || 'Anonymous'}</span>
                <span className="mi-chip"><i className="bi bi-calendar3"></i> {new Date(selectedAnswer.filled_at).toLocaleString()}</span>
                {selectedAnswer.ip_address && (
                  <span className="mi-chip"><i className="bi bi-hdd-network"></i> {selectedAnswer.ip_address}</span>
                )}
                {selectedAnswer.event && (
                  <span className="mi-chip"><i className="bi bi-shield-exclamation"></i> {selectedAnswer.event_name || `Event #${selectedAnswer.event}`}</span>
                )}
              </div>

              <div className="mb-4">
                {loadingAnswerDetails ? (
                  <p>Loading form details...</p>
                ) : selectedAnswer.answers && Object.keys(selectedAnswer.answers).length > 0 ? (
                  <div>
                    {(() => {
                      // Sort answers according to formFields order if available
                      if (selectedAnswer.formFields && selectedAnswer.formFields.length > 0) {
                        return selectedAnswer.formFields
                          .filter(field => selectedAnswer.answers.hasOwnProperty(field.name))
                          .map((field, index) => {
                            const fieldValue = selectedAnswer.answers[field.name];
                            const questionLabel = field.label || field.name;
                            const isSingleChoice = field.type === 'radio' || field.type === 'select';
                            return (
                              <div key={index} className="mi-pv-field">
                                <label>{questionLabel}</label>
                                {Array.isArray(fieldValue) ? (
                                  <div className="mi-meta-chips" style={{ marginTop: 0 }}>
                                    {fieldValue.map((value, idx) => (
                                      <span key={idx} className="mi-chip">{value}</span>
                                    ))}
                                  </div>
                                ) : typeof fieldValue === 'string' && fieldValue.includes('http') ? (
                                  <div className="mi-ctrl-ro">
                                    <a href={fieldValue} target="_blank" rel="noopener noreferrer">
                                      <i className="bi bi-link-45deg me-1"></i>{fieldValue}
                                    </a>
                                  </div>
                                ) : isSingleChoice && fieldValue ? (
                                  <div>
                                    <span className="mi-badge mi-success"><span className="mi-led"></span> {fieldValue}</span>
                                  </div>
                                ) : (
                                  <div className="mi-ctrl-ro">{fieldValue}</div>
                                )}
                              </div>
                            );
                          });
                      } else {
                        // Fallback to original behavior if formFields not available
                        return Object.entries(selectedAnswer.answers).map(([fieldName, fieldValue], index) => {
                          const questionLabel = getFieldLabel(fieldName, selectedAnswer.formFields);
                          return (
                            <div key={index} className="mi-pv-field">
                              <label>{questionLabel}</label>
                              {Array.isArray(fieldValue) ? (
                                <div className="mi-meta-chips" style={{ marginTop: 0 }}>
                                  {fieldValue.map((value, idx) => (
                                    <span key={idx} className="mi-chip">{value}</span>
                                  ))}
                                </div>
                              ) : typeof fieldValue === 'string' && fieldValue.includes('http') ? (
                                <div className="mi-ctrl-ro">
                                  <a href={fieldValue} target="_blank" rel="noopener noreferrer">
                                    <i className="bi bi-link-45deg me-1"></i>{fieldValue}
                                  </a>
                                </div>
                              ) : (
                                <div className="mi-ctrl-ro">{fieldValue}</div>
                              )}
                            </div>
                          );
                        });
                      }
                    })()}
                  </div>
                ) : (
                  <p className="text-muted">No answers provided</p>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseAnswerModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
    </div>
    </>
  );
};

export default FormsView;
