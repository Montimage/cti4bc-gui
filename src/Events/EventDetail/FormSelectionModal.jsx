import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert, Badge, Form } from 'react-bootstrap';
import { useToast } from '../../components/Toast';

const SERVER_URL = process.env.REACT_APP_API_URL;

const FormSelectionModal = ({ show, onClose, eventOrganizationId, eventInfo, onFormsLoaded }) => {
  const { showError, showSuccess } = useToast();
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [showFormResponse, setShowFormResponse] = useState(false);
  const [formResponses, setFormResponses] = useState({});
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [organizations, setOrganizations] = useState([]);
  const [userAnsweredForms, setUserAnsweredForms] = useState([]);

  // Fetch forms from the same organization when modal opens
  useEffect(() => {
    if (show && eventOrganizationId) {
      fetchOrganizationsAndForms();
    } else {
      setForms([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, eventOrganizationId]);

  const fetchOrganizationsAndForms = async () => {
    setLoading(true);
    try {
      // First fetch organizations to get the mapping
      const orgs = await fetchOrganizations();
      
      // Fetch user's answered forms for this event and get the IDs directly
      const answeredFormIds = await fetchUserAnsweredForms();
      
      // Then fetch forms with the answered form IDs
      await fetchOrganizationForms(orgs, answeredFormIds);
    } catch (error) {
      showError('Error fetching data: ' + error.message);
      setLoading(false);
    }
  };

  // Fetch organizations to map names to IDs
  useEffect(() => {
    fetchOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getToken = () => {
    return localStorage.getItem('accessToken');
  };

  const fetchOrganizationForms = async (orgs = organizations, answeredFormIds = []) => {
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
        // Find the event organization name
        const eventOrg = orgs.find(org => 
          org.id === eventOrganizationId || 
          org.id === Number(eventOrganizationId) || 
          org.id === String(eventOrganizationId)
        );
        const eventOrgName = eventOrg ? eventOrg.name : null;
                // Filter forms that belong to the same organization and are active
        const organizationForms = data.forms.filter(form => {
                    // Check if form is active first
          if (!form.is_active) {
                        return false;
          }
          
          // Check different possible organization field structures
          let belongsToOrganization = false;
          
          // Check if organizations array exists and contains the event organization ID
          if (form.organizations && Array.isArray(form.organizations)) {
            belongsToOrganization = form.organizations.includes(eventOrganizationId) || 
                                  form.organizations.includes(Number(eventOrganizationId)) ||
                                  form.organizations.includes(String(eventOrganizationId));
                      }
          
          // Check if organization_ids array exists and contains the event organization ID
          if (!belongsToOrganization && form.organization_ids && Array.isArray(form.organization_ids)) {
            belongsToOrganization = form.organization_ids.includes(eventOrganizationId) || 
                                   form.organization_ids.includes(Number(eventOrganizationId)) ||
                                   form.organization_ids.includes(String(eventOrganizationId));
                      }
          
          // Check if organization_names contains the event organization name
          if (!belongsToOrganization && eventOrgName && form.organization_names && Array.isArray(form.organization_names)) {
            belongsToOrganization = form.organization_names.includes(eventOrgName);
                      }
          
                    return belongsToOrganization;
        });
        
        // Filter out forms that the user has already answered for this event
        const availableForms = organizationForms.filter(form => 
          !answeredFormIds.includes(form.id)
        );
        
        setForms(availableForms);
        
        // Notify parent component about the number of available forms
        if (onFormsLoaded) {
          onFormsLoaded(availableForms.length);
        }
      } else {
        showError('Failed to fetch forms');
      }
    } catch (error) {
      showError('Error fetching forms: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const token = getToken();
      const response = await fetch(`${SERVER_URL}/organizations/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
                setOrganizations(data.organizations || []);
        return data.organizations || [];
      }
    } catch (error) {
          }
    return [];
  };

  const fetchUserAnsweredForms = async () => {
    try {
      const token = getToken();
      const eventId = eventInfo?.id;
      
      if (!eventId) {
        return [];
      }

      // Get answers for this specific event
      const response = await fetch(`${SERVER_URL}/forms/answers/?event_id=${eventId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      
      if (response.ok) {
        const data = await response.json();
        
        // Extract form IDs that the user has already answered for this event
        const answeredFormIds = data.answers ? data.answers.map(answer => answer.form) : [];
        setUserAnsweredForms(answeredFormIds);
        
        return answeredFormIds;
      } else {
        console.error('API error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        
        // If API fails, we should be conservative and assume no forms are answered
        // This prevents showing forms that might already be answered
        return [];
      }
    } catch (error) {
      console.error('Error fetching user answered forms:', error);
      // Return empty array if there's an error
      return [];
    }
  };

  const handleSelectForm = (form) => {
    setSelectedForm(form);
    setShowFormResponse(true);
    // Initialize form responses
    const initialResponses = {};
    form.fields.forEach(field => {
      // Initialize based on field type
      if (field.type === 'checkbox' && field.options) {
        // Multiple checkboxes - initialize as empty string (will be comma-separated values)
        initialResponses[field.name] = '';
      } else if (field.type === 'checkbox' && !field.options) {
        // Single checkbox - initialize as false
        initialResponses[field.name] = 'false';
      } else {
        // All other field types - initialize as empty string
        initialResponses[field.name] = '';
      }
    });
    setFormResponses(initialResponses);
          };

  const handleResponseChange = (fieldName, value) => {
    setFormResponses(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const submitFormResponse = async () => {
    setSubmittingResponse(true);
    try {
      const token = getToken();
                              // Prepare the payload with proper validation
      const eventId = eventInfo?.id || null;
      
                                          if (!eventId) {
        showError('Error: Event ID is missing. Cannot submit form response without a valid event.');
        setSubmittingResponse(false);
        return;
      }
      
      const payload = {
        form: selectedForm.id,
        event: eventId,
        answers: formResponses
      };
      
                  const response = await fetch(`${SERVER_URL}/forms/answers/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

                  // Check if response is actually JSON before trying to parse it
      const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
        // If it's not JSON, get the text to see what the server actually returned
        const responseText = await response.text();
                // Try to extract meaningful error information from HTML error pages
        let errorMessage = `Server error (${response.status}): Expected JSON response but got ${contentType}.`;
        
        // Try to extract the actual error from Django error pages
        if (responseText.includes('<title>') && responseText.includes('</title>')) {
          const titleMatch = responseText.match(/<title>(.*?)<\/title>/);
          if (titleMatch) {
            errorMessage = `Server error: ${titleMatch[1]}`;
          }
        }
        
        // Try to extract exception information
        if (responseText.includes('exception_value')) {
          const exceptionMatch = responseText.match(/<pre class="exception_value">(.*?)<\/pre>/s);
          if (exceptionMatch) {
            errorMessage += ` - ${exceptionMatch[1].replace(/<[^>]*>/g, '').trim()}`;
          }
        }
        
        showError(errorMessage);
        return;
      }

      const responseData = await response.json();
      if (response.ok) {
        showSuccess('Form response submitted successfully!');
        
        // Remove the submitted form from the list
        const updatedForms = forms.filter(form => form.id !== selectedForm.id);
        setForms(updatedForms);
        
        // Update answered forms list
        setUserAnsweredForms(prev => [...prev, selectedForm.id]);
        
        // Reset form response state
        setShowFormResponse(false);
        setSelectedForm(null);
        setFormResponses({});
        
        // Notify parent about updated forms count
        if (onFormsLoaded) {
          onFormsLoaded(updatedForms.length);
        }
        
        // Auto-clear success message and handle modal behavior
        setTimeout(() => {
          // If no more forms available, close the modal
          if (updatedForms.length === 0) {
            onClose();
          }
          // Otherwise, stay open to show remaining forms
        }, 500); // Reduced to 500 milliseconds for better UX
      } else {
                showError('Failed to submit form response: ' + (responseData.error || responseData.message || JSON.stringify(responseData)));
      }
    } catch (error) {
                  showError('Error submitting form response: ' + error.message);
    } finally {
      setSubmittingResponse(false);
    }
  };

  const handleBackToForms = () => {
    setShowFormResponse(false);
    setSelectedForm(null);
    setFormResponses({});
  };

  // Helper function to parse field options
  const parseFieldOptions = (field) => {
    if (!field.options) return [];
    
    // If options is already an array, return it
    if (Array.isArray(field.options)) {
      return field.options;
    }
    
    // If options is a string, split by comma
    if (typeof field.options === 'string') {
      return field.options.split(',').map(option => option.trim()).filter(option => option.length > 0);
    }
    
    // If options is an object, try to get values
    if (typeof field.options === 'object') {
      return Object.values(field.options);
    }
    
        return [];
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          {showFormResponse 
            ? `Responding to: ${selectedForm?.title}` 
            : forms.length > 0 
              ? `Available Forms (${forms.length} remaining)`
              : 'Forms Completed'
          }
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {!showFormResponse ? (
          <>
            {forms.length > 0 ? (
              <div>
                <p className="mb-3">
                  <strong>Event shared successfully!</strong> Here are the available forms from the same organization 
                  that you can fill out:
                </p>
                {userAnsweredForms.length > 0 && (
                  <div className="mb-3">
                    <small className="text-success">
                      <i className="bi bi-check-circle me-1"></i>
                      {userAnsweredForms.length} form{userAnsweredForms.length > 1 ? 's' : ''} completed. 
                      {forms.length} remaining.
                    </small>
                  </div>
                )}
              </div>
            ) : !loading && (
              <p className="mb-3">
                <strong>Event shared successfully!</strong>
              </p>
            )}
            
            {loading ? (
              <div className="text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : forms.length === 0 ? (
              <Alert variant="success">
                <p><i className="bi bi-check-circle me-2"></i><strong>All done!</strong></p>
                <p className="mb-0">You have successfully filled all available forms for this organization. This modal will close automatically.</p>
                {eventOrganizationId && (
                  <small className="text-muted">
                    Organization ID: {eventOrganizationId}
                  </small>
                )}
              </Alert>
            ) : (
              <div className="list-group">
                {forms.map(form => (
                  <div key={form.id} className="list-group-item">
                    <div className="d-flex w-100 justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <h6 className="mb-1">{form.title}</h6>
                        <p className="mb-1 text-muted">{form.description || 'No description'}</p>
                        <small className="text-muted">
                          {form.fields?.length || 0} fields • Created {new Date(form.created_at).toLocaleDateString()}
                        </small>
                        <div className="mt-2">
                          <Badge bg="success">Active</Badge>
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleSelectForm(form)}
                        >
                          Fill Form
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : showFormResponse ? (
          <>
            <div className="mb-3">
              <Button variant="outline-secondary" size="sm" onClick={handleBackToForms}>
                ← Back to Forms
              </Button>
            </div>
            
            <div className="mb-3">
              <h6>Form Description:</h6>
              <p className="text-muted">{selectedForm.description || 'No description'}</p>
            </div>

            <Form>
              {selectedForm.fields.map((field, index) => {
                const fieldOptions = parseFieldOptions(field);
                
                return (
                  <Form.Group key={index} className="mb-3">
                    <Form.Label>
                      {field.label}
                      {field.required && <span className="text-danger">*</span>}
                    </Form.Label>
                    
                    {field.type === 'text' && (
                      <Form.Control
                        type="text"
                        value={formResponses[field.name] || ''}
                        onChange={(e) => handleResponseChange(field.name, e.target.value)}
                        required={field.required}
                        placeholder={field.placeholder || ''}
                      />
                    )}
                    
                    {field.type === 'textarea' && (
                      <Form.Control
                        as="textarea"
                        rows={3}
                        style={{ resize: 'vertical', minHeight: '80px', maxHeight: '200px' }}
                        value={formResponses[field.name] || ''}
                        onChange={(e) => handleResponseChange(field.name, e.target.value)}
                        required={field.required}
                        placeholder={field.placeholder || ''}
                      />
                    )}
                    
                    {field.type === 'select' && fieldOptions.length > 0 && (
                      <Form.Select
                        value={formResponses[field.name] || ''}
                        onChange={(e) => handleResponseChange(field.name, e.target.value)}
                        required={field.required}
                      >
                        <option value="">Select an option...</option>
                        {fieldOptions.map((option, optIndex) => (
                          <option key={optIndex} value={option}>
                            {option}
                          </option>
                        ))}
                      </Form.Select>
                    )}
                    
                    {field.type === 'radio' && fieldOptions.length > 0 && (
                      <div>
                        {fieldOptions.map((option, optIndex) => (
                          <Form.Check
                            key={optIndex}
                            type="radio"
                            id={`${field.name}-${optIndex}`}
                            name={field.name}
                            value={option}
                            checked={formResponses[field.name] === option}
                            onChange={(e) => handleResponseChange(field.name, e.target.value)}
                            label={option}
                            className="mb-2"
                          />
                        ))}
                      </div>
                    )}
                    
                    {field.type === 'checkbox' && fieldOptions.length > 0 && (
                      <div>
                        {fieldOptions.map((option, optIndex) => {
                          const currentValues = formResponses[field.name] ? formResponses[field.name].split(',') : [];
                          return (
                            <Form.Check
                              key={optIndex}
                              type="checkbox"
                              id={`${field.name}-${optIndex}`}
                              value={option}
                              checked={currentValues.includes(option)}
                              onChange={(e) => {
                                const newValues = e.target.checked 
                                  ? [...currentValues, e.target.value]
                                  : currentValues.filter(v => v !== e.target.value);
                                handleResponseChange(field.name, newValues.join(','));
                              }}
                              label={option}
                              className="mb-2"
                            />
                          );
                        })}
                      </div>
                    )}
                    
                    {field.type === 'checkbox' && fieldOptions.length === 0 && (
                      <Form.Check
                        type="checkbox"
                        checked={formResponses[field.name] === 'true'}
                        onChange={(e) => handleResponseChange(field.name, e.target.checked ? 'true' : 'false')}
                        label={field.placeholder || 'Yes'}
                      />
                    )}
                    
                    {field.type === 'email' && (
                      <Form.Control
                        type="email"
                        value={formResponses[field.name] || ''}
                        onChange={(e) => handleResponseChange(field.name, e.target.value)}
                        required={field.required}
                        placeholder={field.placeholder || ''}
                      />
                    )}
                    
                    {field.type === 'number' && (
                      <Form.Control
                        type="number"
                        value={formResponses[field.name] || ''}
                        onChange={(e) => handleResponseChange(field.name, e.target.value)}
                        required={field.required}
                        placeholder={field.placeholder || ''}
                      />
                    )}
                    
                    {field.type === 'date' && (
                      <Form.Control
                        type="date"
                        value={formResponses[field.name] || ''}
                        onChange={(e) => handleResponseChange(field.name, e.target.value)}
                        required={field.required}
                      />
                    )}
                    
                    {field.type === 'time' && (
                      <Form.Control
                        type="time"
                        value={formResponses[field.name] || ''}
                        onChange={(e) => handleResponseChange(field.name, e.target.value)}
                        required={field.required}
                      />
                    )}
                    
                    {field.type === 'url' && (
                      <Form.Control
                        type="url"
                        value={formResponses[field.name] || ''}
                        onChange={(e) => handleResponseChange(field.name, e.target.value)}
                        required={field.required}
                        placeholder={field.placeholder || 'https://example.com'}
                      />
                    )}
                    
                    {field.description && (
                      <Form.Text className="text-muted">
                        {field.description}
                      </Form.Text>
                    )}
                  </Form.Group>
                );
              })}
            </Form>
          </>
        ) : null}
      </Modal.Body>
      <Modal.Footer>
        {!showFormResponse ? (
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        ) : showFormResponse ? (
          <>
            <Button variant="secondary" onClick={handleBackToForms}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={submitFormResponse}
              disabled={submittingResponse}
            >
              {submittingResponse ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Submitting...
                </>
              ) : (
                'Submit Response'
              )}
            </Button>
          </>
        ) : null}
      </Modal.Footer>
    </Modal>
  );
};

export default FormSelectionModal;
