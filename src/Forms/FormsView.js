import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Table, Modal, Form, Alert, Badge, Card, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { getToken } from '../auth';
import { useToast } from '../components/Toast';
import './FormsView.css';
import NavBar from '../NavBar/NavBar';
import { useTheme } from '../ThemeContext';

// Configuration de l'URL du serveur
const SERVER_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const FormsView = () => {
  const { theme } = useTheme();
  const { showError, showSuccess } = useToast();
  const [activeTab, setActiveTab] = useState('forms'); // 'forms' or 'answers'
  const [forms, setForms] = useState([]);
  const [formAnswers, setFormAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [formToDelete, setFormToDelete] = useState(null);
  
  // Form creation states
  const [newForm, setNewForm] = useState({
    title: '',
    description: '',
    fields: []
  });
  
  // Organizations management
  const [availableOrganizations, setAvailableOrganizations] = useState([]);
  const [selectedOrganizations, setSelectedOrganizations] = useState([]);
  const [showOrganizationModal, setShowOrganizationModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [operationType, setOperationType] = useState(''); // 'create' or 'import'
  
  // Form import states
  const [importData, setImportData] = useState({
    googleFormUrl: ''
  });
  
  // Answer viewing states
  const [showAnswerModal, setShowAnswerModal] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [loadingAnswerDetails, setLoadingAnswerDetails] = useState(false);
  
  // Grouped answers states
  const [groupedAnswers, setGroupedAnswers] = useState({});
  const [expandedForms, setExpandedForms] = useState(new Set());
  
  const [newField, setNewField] = useState({
    name: '',
    type: 'text',
    label: '',
    required: false,
    options: ''
  });

  // State for edit form modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    fields: [],
    is_active: true
  });

  // State for editing individual fields
  const [editingFieldIndex, setEditingFieldIndex] = useState(null);
  const [fieldBeingEdited, setFieldBeingEdited] = useState(null);

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
        const answers = data.answers || [];
        setFormAnswers(answers);
        
        // Group answers by form
        const grouped = groupAnswersByForm(answers);
        setGroupedAnswers(grouped);
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

  // Show organization selection modal
  const showOrganizationSelection = (type, formData = null) => {
    setOperationType(type);
    setPendingFormData(formData);
    
    // Pre-select current organizations if editing
    if (type === 'edit' && formData && formData.organizations) {
      setSelectedOrganizations(formData.organizations);
    } else {
      setSelectedOrganizations([]);
    }
    
    fetchOrganizations().then(() => {
      setShowOrganizationModal(true);
    }).catch((error) => {
      // If fetching organizations fails, we still show the modal
      // so the user can see the error message
      setShowOrganizationModal(true);
    });
  };

  // Handle organization selection
  const handleOrganizationToggle = (orgId) => {
    setSelectedOrganizations(prev => {
      if (prev.includes(orgId)) {
        return prev.filter(id => id !== orgId);
      } else {
        return [...prev, orgId];
      }
    });
  };

  // Select/Deselect all organizations
  const handleSelectAllOrganizations = (selectAll) => {
    if (selectAll) {
      setSelectedOrganizations(availableOrganizations.map(org => org.id));
    } else {
      setSelectedOrganizations([]);
    }
  };

  // Create form with selected organizations or update organizations for existing form
  const createFormWithOrganizations = async () => {
    if (selectedOrganizations.length === 0) {
      showError('Please select at least one organization');
      return;
    }

    try {
      setLoading(true); // Add loading state
      const token = getToken();
      
      if (operationType === 'edit') {
        // Update organizations for existing form
        const response = await fetch(`${SERVER_URL}/forms/${pendingFormData.id}/`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: pendingFormData.title,
            description: pendingFormData.description,
            fields: pendingFormData.fields,
            is_active: pendingFormData.is_active,
            organizations: selectedOrganizations
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to update form organizations: ${JSON.stringify(errorData)}`);
        }
        
        const updatedForm = await response.json();
        // Update the editing form and form list
        setEditingForm(updatedForm);
        setForms(forms.map(form => 
          form.id === updatedForm.id ? updatedForm : form
        ));
        showSuccess(`Form organizations updated successfully for ${selectedOrganizations.length} organization(s)!`);
        setShowOrganizationModal(false);
        
      } else {
        // Create new form (create or import)
        if (operationType === 'import') {
          // Handle import directly - call the import endpoint with organizations
          const response = await fetch(`${SERVER_URL}/forms/import-google-form/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              form_url: importData.googleFormUrl,
              organizations: selectedOrganizations
            })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to import form: ${errorData.error || JSON.stringify(errorData)}`);
          }
          
          await response.json();
          showSuccess(`Form imported successfully for ${selectedOrganizations.length} organization(s)!`);
          
          // Refresh the forms list immediately
          await fetchForms();
          
          // Small delay to show success message before closing modals
          setTimeout(() => {
            // Reset all import-related states
            setShowOrganizationModal(false);
            setShowImportModal(false);
            setImportData({ googleFormUrl: '' });
            setSelectedOrganizations([]);
          }, 1000); // 1 second delay
          
        } else {
          // Create new form
          const formDataWithOrgs = {
            ...newForm,
            organizations: selectedOrganizations
          };
          
          const response = await fetch(`${SERVER_URL}/forms/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formDataWithOrgs)
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to create form: ${JSON.stringify(errorData)}`);
          }
          
          await response.json(); // Parse response but don't store unused variable
          showSuccess(`Form created successfully for ${selectedOrganizations.length} organization(s)!`);
          
          // Refresh the forms list immediately
          await fetchForms();
          
          // Small delay to show success message before closing modals
          setTimeout(() => {
            // Reset all create-related states
            setShowOrganizationModal(false);
            setShowCreateModal(false);
            setNewForm({ title: '', description: '', fields: [] });
            setSelectedOrganizations([]);
          }, 1000); // 1 second delay
        }
      }
      
    } catch (error) {
      console.error('Error in createFormWithOrganizations:', error);
      showError('Error: ' + error.message);
    } finally {
      setLoading(false); // Always clear loading state
    }
  };

  // Create new form (modified to show organization selection)
  const handleCreateForm = async () => {
        if (!newForm.title || !newForm.description) {
      showError('Please fill in all required fields');
      return;
    }
    showOrganizationSelection('create');
  };

  // Add field to new form
  const addField = () => {
    if (newField.name && newField.label) {
      const field = { ...newField };
      if (field.type === 'select' || field.type === 'radio') {
        field.options = field.options.split(',').map(opt => opt.trim());
      } else {
        delete field.options;
      }
      
      setNewForm({
        ...newForm,
        fields: [...newForm.fields, field]
      });
      
      setNewField({
        name: '',
        type: 'text',
        label: '',
        required: false,
        options: ''
      });
    }
  };

  // Remove field from new form
  const removeField = (index) => {
    setNewForm({
      ...newForm,
      fields: newForm.fields.filter((_, i) => i !== index)
    });
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

  // Component for compact organization display
  const OrganizationBadgesCompact = ({ organizations, maxVisible = 2 }) => {
    if (!organizations || organizations.length === 0) {
      return <span className="text-muted">No organization</span>;
    }

    const visibleOrgs = organizations.slice(0, maxVisible);
    const remainingCount = organizations.length - maxVisible;

    return (
      <div className="organization-badges-compact">
        {visibleOrgs.map((name, index) => (
          <Badge key={index} bg="secondary" className="me-1">
            {name.length > 12 ? `${name.substring(0, 12)}...` : name}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <OverlayTrigger
            placement="top"
            overlay={
              <Tooltip className="organizations-tooltip">
                <div>
                  <strong>All Organizations:</strong>
                  <div className="mt-1">
                    {organizations.map((name, index) => (
                      <Badge key={index} bg="info" className="me-1 mb-1">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Tooltip>
            }
          >
            <Badge bg="info" className="organization-badge-more">
              +{remainingCount} more
            </Badge>
          </OverlayTrigger>
        )}
      </div>
    );
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

  useEffect(() => {
    if (activeTab === 'forms') {
      fetchForms();
    } else {
      fetchFormAnswers();
    }
  }, [activeTab, fetchFormAnswers]);

  // Function to handle form editing
  const handleEditForm = async (form) => {
    try {
      // Fetch complete form details to ensure we have all organizations
      const token = getToken();
      const response = await fetch(`${SERVER_URL}/forms/${form.id}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const completeForm = await response.json();
        setEditingForm(completeForm);
        setEditFormData({
          title: completeForm.title || '',
          description: completeForm.description || '',
          fields: completeForm.fields || [],
          is_active: completeForm.is_active !== undefined ? completeForm.is_active : true
        });
      } else {
        // Fallback to the form object passed in if API call fails
        setEditingForm(form);
        setEditFormData({
          title: form.title || '',
          description: form.description || '',
          fields: form.fields || [],
          is_active: form.is_active !== undefined ? form.is_active : true
        });
      }
    } catch (error) {
      console.error('Error fetching complete form details:', error);
      // Fallback to the form object passed in if there's an error
      setEditingForm(form);
      setEditFormData({
        title: form.title || '',
        description: form.description || '',
        fields: form.fields || [],
        is_active: form.is_active !== undefined ? form.is_active : true
      });
    }
    
    setShowEditModal(true);
  };

  // Function to save form changes
  const handleSaveFormChanges = async () => {
    if (!editingForm) return;

    try {
      const token = getToken();
      
      // Preserve organizations - ensure we don't lose them
      const organizationsToSend = editingForm.organizations && Array.isArray(editingForm.organizations) 
        ? editingForm.organizations 
        : [];
      
      const response = await fetch(`${SERVER_URL}/forms/${editingForm.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description,
          fields: editFormData.fields,
          is_active: editFormData.is_active,
          organizations: organizationsToSend
        })
      });

      if (response.ok) {
        const updatedForm = await response.json();
        setForms(forms.map(form => 
          form.id === editingForm.id ? updatedForm : form
        ));
        setShowEditModal(false);
        setEditingForm(null);
              } else {
        await response.json(); // Parse error response
        // Error handling - form update failed
      }
    } catch (error) {
                }
  };

  // Function to add new field in edit mode
  const addFieldToEdit = () => {
    const newField = {
      name: `field_${editFormData.fields.length + 1}`,
      type: 'text',
      label: '',
      required: false,
      options: []
    };
    setEditFormData({
      ...editFormData,
      fields: [...editFormData.fields, newField]
    });
  };

  // Function to remove field in edit mode
  const removeFieldFromEdit = (index) => {
    setEditFormData({
      ...editFormData,
      fields: editFormData.fields.filter((_, i) => i !== index)
    });
  };

  // Helper functions for form field management

  // Function to start editing a field
  const startEditingField = (index) => {
    setEditingFieldIndex(index);
    setFieldBeingEdited({ ...editFormData.fields[index] });
  };

  // Function to cancel field editing
  const cancelFieldEdit = () => {
    setEditingFieldIndex(null);
    setFieldBeingEdited(null);
  };

  // Function to save field changes
  const saveFieldEdit = () => {
    if (editingFieldIndex !== null && fieldBeingEdited) {
      const updatedFields = [...editFormData.fields];
      updatedFields[editingFieldIndex] = { ...fieldBeingEdited };
      setEditFormData({
        ...editFormData,
        fields: updatedFields
      });
      setEditingFieldIndex(null);
      setFieldBeingEdited(null);
    }
  };

  // Function to update field being edited
  const updateFieldBeingEdited = (property, value) => {
    setFieldBeingEdited({
      ...fieldBeingEdited,
      [property]: value
    });
  };

  return (
    <>
    <div className="container-fluid mt-4">
      <NavBar />
      <Container fluid className="forms-container">
      <Row className="mb-4">
        <Col>
          <h2>Forms Management</h2>
        </Col>
      </Row>

      {/* Toggle Buttons */}
      <Row className="mb-4">
        <Col className="d-flex justify-content-center">
          <div className="toggle-buttons">
            <Button
              variant={activeTab === 'forms' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('forms')}
            >
              Forms
            </Button>
            <Button
              variant={activeTab === 'answers' ? 'primary' : 'outline-primary'}
              onClick={() => setActiveTab('answers')}
            >
              Form Answers
            </Button>
          </div>
        </Col>
      </Row>

      {/* Forms Tab */}
      {activeTab === 'forms' && (
        <Row>
          <Col>
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Forms</h5>
                <div className="d-flex gap-2">
                  <Button
                    variant="outline-info"
                    onClick={() => window.location.href = '/admin/form-stats'}
                  >
                    Statistics & KPIs
                  </Button>
                  <Button
                    variant="outline-primary"
                    onClick={() => setShowImportModal(true)}
                  >
                    Import Form
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Create Form
                  </Button>
                </div>
              </Card.Header>
              <Card.Body>
                {loading ? (
                  <div className="text-center">Loading...</div>
                ) : (
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Description</th>
                        <th className="organization-column text-center">Organizations</th>
                        <th className="text-center">Status</th>
                        <th className="text-center">Created</th>
                        <th className="text-center">Fields</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forms.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center">No forms found</td>
                        </tr>
                      ) : (
                        forms.map((form) => (
                          <tr key={form.id}>
                            <td><strong>{form.title}</strong></td>
                            <td>
                              {form.gform_url ? (
                                <>
                                  <div>{form.description || 'Form imported from Google Forms'}</div>
                                  <small className="text-muted">
                                    URL Import
                                  </small>
                                </>
                              ) : (
                                form.description || 'No description'
                              )}
                            </td>
                            <td className="organization-column text-center">
                              <OrganizationBadgesCompact 
                                organizations={form.organization_names} 
                                maxVisible={2}
                              />
                            </td>
                            <td className="text-center">
                              <Badge bg={form.is_active ? 'success' : 'secondary'}>
                                {form.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="text-center">{new Date(form.created_at).toLocaleDateString()}</td>
                            <td className="text-center">{form.fields?.length || 0} fields</td>
                            <td className="table-actions text-center">
                              <Button
                                size="sm"
                                variant="outline-primary"
                                className="me-1"
                                onClick={() => {
                                  setSelectedForm(form);
                                  setShowFormModal(true);
                                }}
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-warning"
                                className="me-1"
                                onClick={() => handleEditForm(form)}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline-danger"
                                onClick={() => confirmDeleteForm(form)}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Form Answers Tab */}
      {activeTab === 'answers' && (
        <Row>
          <Col>
            <Card>
              <Card.Header>
                <h5 className="mb-0">Form Answers</h5>
              </Card.Header>
              <Card.Body>
                {loading ? (
                  <div className="text-center">Loading...</div>
                ) : formAnswers.length === 0 ? (
                  <div className="text-center py-4">
                    <h6 className="text-muted">No form answers found</h6>
                  </div>
                ) : (
                  <div>
                    {Object.entries(groupedAnswers).map(([formId, formGroup]) => (
                      <Card key={formId} className="mb-3">
                        <Card.Header 
                          style={{ cursor: 'pointer' }}
                          onClick={() => toggleFormExpansion(formId)}
                          className="d-flex justify-content-between align-items-center"
                        >
                          <div>
                            <h6 className="mb-0">
                              <i className={`fas fa-chevron-${expandedForms.has(formId) ? 'down' : 'right'} me-2`}></i>
                              {formGroup.formTitle}
                            </h6>
                            <small className="text-muted">
                              {formGroup.count} response{formGroup.count !== 1 ? 's' : ''}
                            </small>
                          </div>
                          <Badge bg="primary">{formGroup.count}</Badge>
                        </Card.Header>
                        
                        {expandedForms.has(formId) && (
                          <Card.Body className="p-0">
                            <Table responsive hover className="mb-0">
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
                                    <td>{answer.event_name || `Event #${answer.event}`}</td>
                                    <td>{answer.filled_by_username || 'Anonymous'}</td>
                                    <td className="text-center">{new Date(answer.filled_at).toLocaleString()}</td>
                                    <td className="text-center">{answer.ip_address || 'N/A'}</td>
                                    <td className="text-center">
                                      <Button
                                        size="sm"
                                        variant="outline-info"
                                        onClick={() => handleViewAnswer(answer)}
                                      >
                                        View
                                      </Button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </Table>
                          </Card.Body>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Create Form Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Form</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Title *</Form.Label>
              <Form.Control
                type="text"
                value={newForm.title}
                onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                placeholder="Enter form title"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newForm.description}
                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                placeholder="Enter form description"
              />
            </Form.Group>

            <hr />
            <h6>Form Fields</h6>
            
            {/* Add Field Section */}
            <Row className="mb-3">
              <Col md={3}>
                <Form.Label>Field Name</Form.Label>
                <Form.Control
                  type="text"
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  placeholder="e.g., email"
                />
              </Col>
              <Col md={3}>
                <Form.Label>Field Type</Form.Label>
                <Form.Select
                  value={newField.type}
                  onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                >
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="number">Number</option>
                  <option value="textarea">Textarea</option>
                  <option value="select">Select</option>
                  <option value="radio">Radio</option>
                  <option value="checkbox">Checkbox</option>
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Label>Label</Form.Label>
                <Form.Control
                  type="text"
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  placeholder="e.g., Email Address"
                />
              </Col>
              <Col md={3}>
                <Form.Label>Required</Form.Label>
                <Form.Check
                  type="checkbox"
                  checked={newField.required}
                  onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                  label="Required field"
                />
              </Col>
            </Row>
            
            {(newField.type === 'select' || newField.type === 'radio') && (
              <Row className="mb-3">
                <Col>
                  <Form.Label>Options (comma-separated)</Form.Label>
                  <Form.Control
                    type="text"
                    value={newField.options}
                    onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                    placeholder="e.g., Option 1, Option 2, Option 3"
                  />
                </Col>
              </Row>
            )}
            
            <div className="mb-3">
              <Button variant="outline-primary" onClick={addField}>
                Add Field
              </Button>
            </div>

            {/* Fields Preview */}
            {newForm.fields.length > 0 && (
              <div>
                <h6>Form Preview</h6>
                {newForm.fields.map((field, index) => (
                  <div key={index} className="border p-2 mb-2 rounded">
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{field.label}</strong> ({field.type})
                        {field.required && <Badge bg="warning" className="ms-2">Required</Badge>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => removeField(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    {field.options && (
                      <small className="text-muted">
                        Options: {Array.isArray(field.options) ? field.options.join(', ') : field.options}
                      </small>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleCreateForm}
            disabled={!newForm.title || newForm.fields.length === 0}
          >
            Create Form
          </Button>
        </Modal.Footer>
      </Modal>

      {/* View Form Modal */}
      <Modal show={showFormModal} onHide={() => setShowFormModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Form Details: {selectedForm?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedForm && (
            <div>
              <p><strong>Description:</strong> {selectedForm.description || 'No description'}</p>
              <div>
                <p><strong>Organizations:</strong></p>
                {selectedForm.organization_names && selectedForm.organization_names.length > 0 ? (
                  <div className="mt-1">
                    {selectedForm.organization_names.map((name, index) => (
                      <Badge key={index} bg="secondary" className="me-1 mb-1">
                        {name}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span>{selectedForm.organization_name || 'No organization'}</span>
                )}
              </div>
              <div>
                <span><strong>Status:</strong></span>
                <Badge bg={selectedForm.is_active ? 'success' : 'secondary'} className="ms-2">
                  {selectedForm.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p><strong>Created:</strong> {new Date(selectedForm.created_at).toLocaleString()}</p>
              
              <hr />
              <h6>Form Fields</h6>
              {selectedForm.fields?.map((field, index) => (
                <div key={index} className="border p-2 mb-2 rounded">
                  <div>
                    <strong>{field.label}</strong> ({field.type})
                    {field.required && <Badge bg="warning" className="ms-2">Required</Badge>}
                  </div>
                  {field.options && (
                    <small className="text-muted">
                      Options: {Array.isArray(field.options) ? field.options.join(', ') : field.options}
                    </small>
                  )}
                </div>
              )) || <p>No fields defined</p>}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFormModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Import Form Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Import Google Form</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Google Form URL</Form.Label>
              <Form.Control
                type="url"
                value={importData.googleFormUrl}
                onChange={(e) => setImportData({ ...importData, googleFormUrl: e.target.value })}
                placeholder="https://docs.google.com/forms/d/your-form-id/edit"
              />
              <Form.Text className="text-info">
                Paste the URL of your Google Form here. The form will be automatically fetched and parsed using our Google Apps Script integration.
              </Form.Text>
            </Form.Group>

            <div className="d-flex justify-content-between align-items-center">
              <div>
                <small className="text-muted">
                  <strong>Supported field types:</strong> Text, Textarea, Multiple Choice (Radio/Select), Checkboxes, Scale (Number)
                </small>
              </div>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowImportModal(false);
            setImportData({ googleFormUrl: '' });
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={() => showOrganizationSelection('import')}
            disabled={!importData.googleFormUrl}
          >
            Import Form
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formToDelete && (
            <div>
              <p>Are you sure you want to delete the form:</p>
              <p><strong>"{formToDelete.title}"</strong></p>
              <p className="text-muted">This action cannot be undone.</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowDeleteModal(false);
              setFormToDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleDeleteForm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete Form'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Organization Selection Modal */}
      <Modal 
        show={showOrganizationModal} 
        onHide={loading && operationType === 'import' ? undefined : () => setShowOrganizationModal(false)} 
        size="lg"
        backdrop={loading && operationType === 'import' ? 'static' : true}
        keyboard={!(loading && operationType === 'import')}
      >
        <Modal.Header closeButton={!(loading && operationType === 'import')}>
          <Modal.Title>
            {loading && operationType === 'import' ? (
              <span className="text-primary">
                <i className="bi bi-download me-2"></i>
                Importing Google Form...
              </span>
            ) : (
              <>
                {operationType === 'create' && 'Select Organizations for New Form'}
                {operationType === 'import' && 'Select Organizations for Imported Form'}
                {operationType === 'edit' && 'Modify Organizations for Form'}
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading && operationType === 'import' ? (
            // Import Loading Screen
            <div className="import-loading-screen text-center">
              <div className="mb-4">
                <div className="spinner-border text-primary" role="status" style={{ width: '4rem', height: '4rem' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
              <h4 className="text-primary mb-3">
                <i className="bi bi-download me-2"></i>
                Importing Google Form
              </h4>
              <p className="text-muted mb-4">
                We're fetching and processing your Google Form...
              </p>
              <div className="progress mb-3" style={{ height: '8px' }}>
                <div 
                  className="progress-bar progress-bar-striped progress-bar-animated" 
                  role="progressbar" 
                  style={{ width: '100%' }}
                ></div>
              </div>
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                This may take a few moments depending on the form complexity
              </small>
            </div>
          ) : (
            <>
              <p>Choose one or more organizations where this form will be available:</p>
              
              {availableOrganizations.length === 0 ? (
                <Alert variant="warning">
                  No organizations available. Please contact an administrator.
                </Alert>
              ) : (
                <>
                  {/* Select All / Deselect All buttons */}
                  <div className="mb-3 d-flex gap-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => handleSelectAllOrganizations(true)}
                      disabled={selectedOrganizations.length === availableOrganizations.length}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => handleSelectAllOrganizations(false)}
                      disabled={selectedOrganizations.length === 0}
                    >
                      Deselect All
                    </Button>
                  </div>

                  <div className="organization-selection">
                    {availableOrganizations.map((org) => (
                      <Form.Check
                        key={org.id}
                        type="checkbox"
                        id={`org-${org.id}`}
                        label={
                          <div>
                            <strong>{org.name}</strong>
                            {org.description && <div className="text-muted">{org.description}</div>}
                          </div>
                        }
                        checked={selectedOrganizations.includes(org.id)}
                        onChange={() => handleOrganizationToggle(org.id)}
                        className="mb-3"
                      />
                    ))}
                  </div>
                </>
              )}
              
              {selectedOrganizations.length > 0 && (
                <Alert variant="info" className="mt-3">
                  Selected organizations: {selectedOrganizations.length} of {availableOrganizations.length}
                </Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {loading && operationType === 'import' ? (
            // Hide buttons during import loading
            <div className="w-100 text-center">
              <small className="text-muted">
                <i className="bi bi-clock me-1"></i>
                Please wait while we process your form...
              </small>
            </div>
          ) : (
            <>
              <Button 
                variant="secondary" 
                onClick={() => setShowOrganizationModal(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={createFormWithOrganizations}
                disabled={selectedOrganizations.length === 0 || loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    {operationType === 'create' && 'Creating...'}
                    {operationType === 'import' && 'Importing...'}
                    {operationType === 'edit' && 'Updating...'}
                  </>
                ) : (
                  <>
                    {operationType === 'create' && 'Create Form for Selected Organizations'}
                    {operationType === 'import' && 'Import Form for Selected Organizations'}
                    {operationType === 'edit' && 'Update Organizations'}
                  </>
                )}
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Edit Form Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Form: {editingForm?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingForm && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Title *</Form.Label>
                <Form.Control
                  type="text"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="Enter form title"
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  placeholder="Enter form description"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Check
                  type="switch"
                  id="formActiveStatus"
                  label={editFormData.is_active ? 'Active' : 'Inactive'}
                  checked={editFormData.is_active}
                  onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Organizations</Form.Label>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <small className="text-muted">
                    Current organizations: {editingForm?.organization_names?.join(', ') || 'None'}
                  </small>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => showOrganizationSelection('edit', editingForm)}
                  >
                    Modify Organizations
                  </Button>
                </div>
              </Form.Group>

              <hr />
              <h6>Form Fields</h6>
              
              {/* Fields List */}
              {editFormData.fields.length === 0 ? (
                <p className="text-muted">No fields added yet. Add new fields below.</p>
              ) : (
                editFormData.fields.map((field, index) => (
                  <div key={index} className="border p-3 mb-3 rounded">
                    {editingFieldIndex === index ? (
                      // Edit mode for this field
                      <div>
                        <Row className="mb-2">
                          <Col md={6}>
                            <Form.Label>Field Name</Form.Label>
                            <Form.Control
                              type="text"
                              value={fieldBeingEdited?.name || ''}
                              onChange={(e) => updateFieldBeingEdited('name', e.target.value)}
                              placeholder="Field name"
                            />
                          </Col>
                          <Col md={6}>
                            <Form.Label>Field Label</Form.Label>
                            <Form.Control
                              type="text"
                              value={fieldBeingEdited?.label || ''}
                              onChange={(e) => updateFieldBeingEdited('label', e.target.value)}
                              placeholder="Field label"
                            />
                          </Col>
                        </Row>
                        <Row className="mb-2">
                          <Col md={6}>
                            <Form.Label>Field Type</Form.Label>
                            <Form.Select
                              value={fieldBeingEdited?.type || 'text'}
                              onChange={(e) => updateFieldBeingEdited('type', e.target.value)}
                            >
                              <option value="text">Text</option>
                              <option value="email">Email</option>
                              <option value="number">Number</option>
                              <option value="textarea">Textarea</option>
                              <option value="select">Select</option>
                              <option value="radio">Radio</option>
                              <option value="checkbox">Checkbox</option>
                              <option value="date">Date</option>
                              <option value="tel">Phone</option>
                              <option value="url">URL</option>
                            </Form.Select>
                          </Col>
                          <Col md={6}>
                            <Form.Label>Required</Form.Label>
                            <Form.Check
                              type="switch"
                              label={fieldBeingEdited?.required ? 'Required' : 'Optional'}
                              checked={fieldBeingEdited?.required || false}
                              onChange={(e) => updateFieldBeingEdited('required', e.target.checked)}
                            />
                          </Col>
                        </Row>
                        {(fieldBeingEdited?.type === 'select' || fieldBeingEdited?.type === 'radio' || fieldBeingEdited?.type === 'checkbox') && (
                          <Row className="mb-2">
                            <Col>
                              <Form.Label>Options (one per line)</Form.Label>
                              <Form.Control
                                as="textarea"
                                rows={3}
                                value={Array.isArray(fieldBeingEdited?.options) ? 
                                  fieldBeingEdited.options.join('\n') : 
                                  (fieldBeingEdited?.options || '')
                                }
                                onChange={(e) => {
                                  const options = e.target.value.split('\n').filter(opt => opt.trim());
                                  updateFieldBeingEdited('options', options);
                                }}
                                placeholder="Option 1&#10;Option 2&#10;Option 3"
                              />
                            </Col>
                          </Row>
                        )}
                        <div className="d-flex gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            onClick={saveFieldEdit}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={cancelFieldEdit}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // View mode for this field
                      <div>
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <strong>{field.label || field.name}</strong>
                              <Badge bg="info" className="text-white">{field.type}</Badge>
                              {field.required && <Badge bg="warning">Required</Badge>}
                            </div>
                            <small className="text-muted">Name: {field.name}</small>
                            {field.options && Array.isArray(field.options) && field.options.length > 0 && (
                              <div className="mt-1">
                                <small className="text-muted">
                                  Options: {field.options.join(', ')}
                                </small>
                              </div>
                            )}
                          </div>
                          <div className="d-flex gap-1">
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() => startEditingField(index)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => removeFieldFromEdit(index)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}

              {/* Add Field Section */}
              <Row className="mb-3">
                <Col md={3}>
                  <Form.Label>Field Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={newField.name}
                    onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                    placeholder="e.g., email"
                  />
                </Col>
                <Col md={3}>
                  <Form.Label>Field Type</Form.Label>
                  <Form.Select
                    value={newField.type}
                    onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                  >
                    <option value="text">Text</option>
                    <option value="email">Email</option>
                    <option value="number">Number</option>
                    <option value="textarea">Textarea</option>
                    <option value="select">Select</option>
                    <option value="radio">Radio</option>
                    <option value="checkbox">Checkbox</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label>Label</Form.Label>
                  <Form.Control
                    type="text"
                    value={newField.label}
                    onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                    placeholder="e.g., Email Address"
                  />
                </Col>
                <Col md={3}>
                  <Form.Label>Required</Form.Label>
                  <Form.Check
                    type="checkbox"
                    checked={newField.required}
                    onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                    label="Required field"
                  />
                </Col>
              </Row>
              
              {(newField.type === 'select' || newField.type === 'radio') && (
                <Row className="mb-3">
                  <Col>
                    <Form.Label>Options (comma-separated)</Form.Label>
                    <Form.Control
                      type="text"
                      value={newField.options}
                      onChange={(e) => setNewField({ ...newField, options: e.target.value })}
                      placeholder="e.g., Option 1, Option 2, Option 3"
                    />
                  </Col>
                </Row>
              )}
              
              <div className="mb-3">
                <Button variant="outline-primary" onClick={addFieldToEdit}>
                  Add Field
                </Button>
              </div>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSaveFormChanges}
          >
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Answer Details Modal */}
      <Modal show={showAnswerModal} onHide={handleCloseAnswerModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Response Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedAnswer && (
            <div>
              <div className="mb-4">
                <h6>Form Information</h6>
                <Card className="mb-3">
                  <Card.Body>
                    <div className="row">
                      <div className="col-md-6">
                        <strong>Form Title:</strong> {selectedAnswer.form_title}
                      </div>
                      <div className="col-md-6">
                        <strong>Form ID:</strong> {selectedAnswer.form}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>

              <div className="mb-4">
                <h6>Response Information</h6>
                <Card className="mb-3">
                  <Card.Body>
                    <div className="row">
                      <div className="col-md-6">
                        <strong>Submitted by:</strong> {selectedAnswer.filled_by_username}
                      </div>
                      <div className="col-md-6">
                        <strong>User ID:</strong> {selectedAnswer.filled_by}
                      </div>
                    </div>
                    <div className="row mt-2">
                      <div className="col-md-6">
                        <strong>Submitted on:</strong> {new Date(selectedAnswer.filled_at).toLocaleString()}
                      </div>
                      <div className="col-md-6">
                        <strong>IP Address:</strong> {selectedAnswer.ip_address}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </div>

              {selectedAnswer.event && (
                <div className="mb-4">
                  <h6>Related Event</h6>
                  <Card className="mb-3">
                    <Card.Body>
                      <div className="row">
                        <div className="col-md-6">
                          <strong>Event ID:</strong> {selectedAnswer.event}
                        </div>
                        <div className="col-md-6">
                          <strong>Event Info:</strong> {selectedAnswer.event_info}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              )}

              <div className="mb-4">
                <h6>Answers</h6>
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
                            return (
                              <div key={index} className="mb-4">
                                <div className="fw-semibold mb-2">
                                  <i className="bi bi-question-circle me-2 text-muted"></i>
                                  {questionLabel}
                                </div>
                                <div className={`border rounded p-3 ${theme === 'dark' ? 'bg-dark border-secondary' : 'bg-light'}`}>
                                  <div className="answer-content">
                                    {Array.isArray(fieldValue) ? (
                                      <div className="d-flex flex-wrap gap-1">
                                        {fieldValue.map((value, idx) => (
                                          <Badge key={idx} bg="secondary" className="px-2 py-1">
                                            {value}
                                          </Badge>
                                        ))}
                                      </div>
                                    ) : typeof fieldValue === 'string' && fieldValue.includes('http') ? (
                                      <a href={fieldValue} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                                        <i className="bi bi-link-45deg me-1"></i>
                                        {fieldValue}
                                      </a>
                                    ) : typeof fieldValue === 'string' && fieldValue.length > 100 ? (
                                      <div className="text-wrap" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                        {fieldValue}
                                      </div>
                                    ) : (
                                      <span>{fieldValue}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          });
                      } else {
                        // Fallback to original behavior if formFields not available
                        return Object.entries(selectedAnswer.answers).map(([fieldName, fieldValue], index) => {
                          const questionLabel = getFieldLabel(fieldName, selectedAnswer.formFields);
                          return (
                            <div key={index} className="mb-4">
                              <div className="fw-semibold mb-2">
                                <i className="bi bi-question-circle me-2 text-muted"></i>
                                {questionLabel}
                              </div>
                              <div className={`border rounded p-3 ${theme === 'dark' ? 'bg-dark border-secondary' : 'bg-light'}`}>
                                <div className="answer-content">
                                  {Array.isArray(fieldValue) ? (
                                    <div className="d-flex flex-wrap gap-1">
                                      {fieldValue.map((value, idx) => (
                                        <Badge key={idx} bg="secondary" className="px-2 py-1">
                                          {value}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : typeof fieldValue === 'string' && fieldValue.includes('http') ? (
                                    <a href={fieldValue} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                                      <i className="bi bi-link-45deg me-1"></i>
                                      {fieldValue}
                                    </a>
                                  ) : typeof fieldValue === 'string' && fieldValue.length > 100 ? (
                                    <div className="text-wrap" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                      {fieldValue}
                                    </div>
                                  ) : (
                                    <span>{fieldValue}</span>
                                  )}
                                </div>
                              </div>
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
