import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Alert, Badge, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../auth';
import NavBar from '../NavBar/NavBar';
import { useTheme } from '../ThemeContext';
import { useToast } from '../components/Toast';
import './MyFormAnswers.css';

const SERVER_URL = process.env.REACT_APP_API_URL;

const MyFormAnswers = () => {
  const { showError, showSuccess } = useToast();
  const [myAnswers, setMyAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingResponses, setEditingResponses] = useState({});
  const [saving, setSaving] = useState(false);
  
  const { theme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyAnswers();
  }, []);

  const fetchMyAnswers = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${SERVER_URL}/forms/answers/?filled_by_current_user=true`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMyAnswers(data.answers || []);
      } else {
        showError('Failed to fetch your form answers');
      }
    } catch (error) {
      showError('Error fetching form answers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAnswer = (answer) => {
    setSelectedAnswer(answer);
    setShowDetailModal(true);
  };

  const handleEditAnswer = (answer) => {
    setSelectedAnswer(answer);
    setEditingResponses(answer.answers || {});
    setShowEditModal(true);
  };

  const handleResponseChange = (fieldName, value) => {
    setEditingResponses(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSaveChanges = async () => {
    if (!selectedAnswer) return;
    
    setSaving(true);
    try {
      const token = getToken();
      const response = await fetch(`${SERVER_URL}/forms/answers/${selectedAnswer.id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          form: selectedAnswer.form,
          event: selectedAnswer.event,
          answers: editingResponses,
          filled_by: selectedAnswer.filled_by
        }),
      });

      if (response.ok) {
        showSuccess('Your response has been updated successfully!');
        setShowEditModal(false);
        fetchMyAnswers(); // Refresh the list
      } else {
        const errorData = await response.json();
        showError('Failed to update response: ' + (errorData.error || errorData.message || 'Unknown error'));
      }
    } catch (error) {
      showError('Error updating response: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const renderFieldInput = (field, value) => {
    const fieldName = field.name;
    
    switch (field.type) {
      case 'textarea':
        return (
          <Form.Control
            as="textarea"
            rows={3}
            value={value || ''}
            onChange={(e) => handleResponseChange(fieldName, e.target.value)}
            placeholder={field.placeholder || ''}
          />
        );
      
      case 'select':
        const selectOptions = Array.isArray(field.options) ? field.options : 
                             (typeof field.options === 'string' ? field.options.split(',').map(opt => opt.trim()) : []);
        return (
          <Form.Select
            value={value || ''}
            onChange={(e) => handleResponseChange(fieldName, e.target.value)}
          >
            <option value="">Select an option...</option>
            {selectOptions.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </Form.Select>
        );
      
      case 'radio':
        const radioOptions = Array.isArray(field.options) ? field.options :
                            (typeof field.options === 'string' ? field.options.split(',').map(opt => opt.trim()) : []);
        return (
          <div>
            {radioOptions.map((option, index) => (
              <Form.Check
                key={index}
                type="radio"
                id={`${fieldName}-${index}`}
                name={fieldName}
                value={option}
                checked={value === option}
                onChange={(e) => handleResponseChange(fieldName, e.target.value)}
                label={option}
                className="mb-2"
              />
            ))}
          </div>
        );
      
      case 'checkbox':
        if (Array.isArray(field.options) && field.options.length > 0) {
          const checkboxOptions = field.options;
          const currentValues = value ? value.split(',') : [];
          return (
            <div>
              {checkboxOptions.map((option, index) => (
                <Form.Check
                  key={index}
                  type="checkbox"
                  id={`${fieldName}-${index}`}
                  value={option}
                  checked={currentValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked 
                      ? [...currentValues, e.target.value]
                      : currentValues.filter(v => v !== e.target.value);
                    handleResponseChange(fieldName, newValues.join(','));
                  }}
                  label={option}
                  className="mb-2"
                />
              ))}
            </div>
          );
        } else {
          return (
            <Form.Check
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => handleResponseChange(fieldName, e.target.checked ? 'true' : 'false')}
              label={field.placeholder || 'Yes'}
            />
          );
        }
      
      case 'email':
        return (
          <Form.Control
            type="email"
            value={value || ''}
            onChange={(e) => handleResponseChange(fieldName, e.target.value)}
            placeholder={field.placeholder || ''}
          />
        );
      
      case 'number':
        return (
          <Form.Control
            type="number"
            value={value || ''}
            onChange={(e) => handleResponseChange(fieldName, e.target.value)}
            placeholder={field.placeholder || ''}
          />
        );
      
      case 'date':
        return (
          <Form.Control
            type="date"
            value={value || ''}
            onChange={(e) => handleResponseChange(fieldName, e.target.value)}
          />
        );
      
      case 'url':
        return (
          <Form.Control
            type="url"
            value={value || ''}
            onChange={(e) => handleResponseChange(fieldName, e.target.value)}
            placeholder={field.placeholder || 'https://example.com'}
          />
        );
      
      default: // text
        return (
          <Form.Control
            type="text"
            value={value || ''}
            onChange={(e) => handleResponseChange(fieldName, e.target.value)}
            placeholder={field.placeholder || ''}
          />
        );
    }
  };

  return (
    <>
      <div className="container-fluid mt-4">
        <NavBar />
        <Container fluid className={`my-form-answers-container ${theme === 'dark' ? 'dark-theme' : ''}`}>
          <Row className="mb-4">
            <Col>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-0">
                    <i className="bi bi-file-earmark-text me-3 text-primary"></i>
                    My Form Responses
                  </h2>
                  <p className="text-muted mt-1 mb-0">View and edit your submitted form responses</p>
                </div>
              </div>
            </Col>
          </Row>

          <Row>
            <Col>
              <Card className="shadow-sm">
                <Card.Header className="bg-primary text-white">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                      <i className="bi bi-list-ul me-2"></i>
                      Your Form Responses
                    </h5>
                    <Badge bg="light" className={`fs-6 ${theme === 'dark' ? 'text-dark' : ''}`}>
                      {myAnswers.length} response{myAnswers.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </Card.Header>
                <Card.Body className="p-0">
                  {loading ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <p className="mt-3 text-muted">Loading your responses...</p>
                    </div>
                  ) : myAnswers.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="mb-4">
                        <i className="bi bi-inbox display-1 text-muted"></i>
                      </div>
                      <h4 className="text-muted mb-3">No responses found</h4>
                      <p className="text-muted mb-4">You haven't filled any forms yet.</p>
                      <Button variant="primary" onClick={() => navigate('/events')} className="px-4">
                        <i className="bi bi-calendar-event me-2"></i>
                        Go to Events
                      </Button>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table hover className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th className="border-0 px-4 py-3">
                              <i className="bi bi-file-text me-2 text-primary"></i>
                              Form Title
                            </th>
                            <th className="border-0 px-4 py-3">
                              <i className="bi bi-calendar-event me-2 text-primary"></i>
                              Event
                            </th>
                            <th className="border-0 px-4 py-3">
                              <i className="bi bi-clock me-2 text-primary"></i>
                              Submitted At
                            </th>
                            <th className="border-0 px-4 py-3 text-center">
                              <i className="bi bi-check-circle me-2 text-primary"></i>
                              Status
                            </th>
                            <th className="border-0 px-4 py-3 text-center">
                              <i className="bi bi-gear me-2 text-primary"></i>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {myAnswers.map((answer, index) => (
                            <tr key={answer.id} className="border-bottom">
                              <td className="px-4 py-3">
                                <div className="d-flex align-items-center">
                                  <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" 
                                       style={{ width: '40px', height: '40px' }}>
                                    <i className="bi bi-file-earmark-text text-primary"></i>
                                  </div>
                                  <div>
                                    <strong>{answer.form_title || `Form #${answer.form}`}</strong>
                                    <div className="text-muted small">ID: {answer.form}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="d-flex align-items-center">
                                  <div className="bg-info bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-2" 
                                       style={{ width: '32px', height: '32px' }}>
                                    <i className="bi bi-calendar-event text-info small"></i>
                                  </div>
                                  <span>{answer.event_name || `Event #${answer.event}`}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="d-flex align-items-center">
                                  <i className="bi bi-clock text-muted me-2"></i>
                                  <span>{formatDate(answer.filled_at)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge bg="success" className="px-3 py-2">
                                  <i className="bi bi-check-circle me-1"></i>
                                  Submitted
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <div className="d-flex justify-content-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline-info"
                                    onClick={() => handleViewAnswer(answer)}
                                    className="px-3"
                                  >
                                    <i className="bi bi-eye me-1"></i>
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline-primary"
                                    onClick={() => handleEditAnswer(answer)}
                                    className="px-3"
                                  >
                                    <i className="bi bi-pencil me-1"></i>
                                    Edit
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* View Answer Modal */}
          <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
            <Modal.Header closeButton className={`${theme === 'dark' ? 'bg-dark text-white' : 'bg-light'}`}>
              <Modal.Title className="text-primary">
                <i className="bi bi-eye me-2"></i>
                Response Details
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
              {selectedAnswer && (
                <div>
                  <div className="mb-4">
                    <h6 className="text-primary mb-3">
                      <i className="bi bi-info-circle me-2"></i>
                      Form Information
                    </h6>
                    <Card className={`border-0 ${theme === 'dark' ? 'bg-dark' : 'bg-light'}`}>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <div className="mb-3">
                              <small className="text-muted text-uppercase fw-bold">Form Title</small>
                              <div className="fw-semibold">{selectedAnswer.form_title || `Form #${selectedAnswer.form}`}</div>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="mb-3">
                              <small className="text-muted text-uppercase fw-bold">Event</small>
                              <div className="fw-semibold">{selectedAnswer.event_name || `Event #${selectedAnswer.event}`}</div>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="mb-3">
                              <small className="text-muted text-uppercase fw-bold">Submitted</small>
                              <div className="fw-semibold">{formatDate(selectedAnswer.filled_at)}</div>
                            </div>
                          </Col>
                          <Col md={6}>
                            <div className="mb-3">
                              <small className="text-muted text-uppercase fw-bold">IP Address</small>
                              <div className="fw-semibold">{selectedAnswer.ip_address || 'N/A'}</div>
                            </div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </div>

                  <div className="mb-4">
                    <h6 className="text-primary mb-3">
                      <i className="bi bi-chat-square-text me-2"></i>
                      Your Answers
                    </h6>
                    {selectedAnswer.answers && Object.keys(selectedAnswer.answers).length > 0 ? (
                      <div>
                        {(() => {
                          // Sort answers according to formFields order if available
                          if (selectedAnswer.formFields && selectedAnswer.formFields.length > 0) {
                            return selectedAnswer.formFields
                              .filter(field => selectedAnswer.answers.hasOwnProperty(field.name))
                              .map((field, index) => {
                                const fieldValue = selectedAnswer.answers[field.name];
                                return (
                                  <div key={index} className="mb-4">
                                    <div className="fw-semibold mb-2">
                                      <i className="bi bi-question-circle me-2 text-muted"></i>
                                      {field.label || field.name}
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
                            return Object.entries(selectedAnswer.answers).map(([fieldName, fieldValue], index) => (
                              <div key={index} className="mb-4">
                                <div className="fw-semibold mb-2">
                                  <i className="bi bi-question-circle me-2 text-muted"></i>
                                  {fieldName}
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
                            ));
                          }
                        })()}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted">
                        <i className="bi bi-inbox display-6"></i>
                        <p className="mt-2">No answers provided</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className={`${theme === 'dark' ? 'bg-dark' : 'bg-light'}`}>
              <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                <i className="bi bi-x-circle me-1"></i>
                Close
              </Button>
              <Button 
                variant="primary" 
                onClick={() => {
                  setShowDetailModal(false);
                  handleEditAnswer(selectedAnswer);
                }}
              >
                <i className="bi bi-pencil me-1"></i>
                Edit Response
              </Button>
            </Modal.Footer>
          </Modal>

          {/* Edit Answer Modal */}
          <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
            <Modal.Header closeButton className="bg-primary text-white">
              <Modal.Title>
                <i className="bi bi-pencil me-2"></i>
                Edit Your Response
              </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-4">
              {selectedAnswer && (
                <div>
                  <div className="mb-4">
                    <Alert variant="info" className={`border-0 ${theme === 'dark' ? 'bg-dark' : 'bg-light'}`}>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-info-circle text-primary me-2 fs-5"></i>
                        <div>
                          <strong>Form:</strong> {selectedAnswer.form_title || `Form #${selectedAnswer.form}`}
                          <br />
                          <strong>Event:</strong> {selectedAnswer.event_name || `Event #${selectedAnswer.event}`}
                        </div>
                      </div>
                    </Alert>
                  </div>

                  <Form>
                    {selectedAnswer.formFields && selectedAnswer.formFields.map((field, index) => (
                      <Form.Group key={index} className="mb-4">
                        <Form.Label className="fw-semibold">
                          <i className="bi bi-question-circle me-2 text-muted"></i>
                          {field.label || field.name}
                          {field.required && <span className="text-danger ms-1">*</span>}
                        </Form.Label>
                        <div className={`border rounded p-3 ${theme === 'dark' ? 'bg-dark border-secondary' : 'bg-light'}`}>
                          {renderFieldInput(field, editingResponses[field.name])}
                        </div>
                        {field.description && (
                          <Form.Text className="text-muted">
                            <i className="bi bi-lightbulb me-1"></i>
                            {field.description}
                          </Form.Text>
                        )}
                      </Form.Group>
                    ))}

                    {(!selectedAnswer.formFields || selectedAnswer.formFields.length === 0) && (
                      <Alert variant="warning" className="border-0">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Form structure not available. You can still view your submitted answers above.
                      </Alert>
                    )}
                  </Form>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className={`${theme === 'dark' ? 'bg-dark' : 'bg-light'}`}>
              <Button variant="outline-secondary" onClick={() => setShowEditModal(false)}>
                <i className="bi bi-x-circle me-1"></i>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSaveChanges}
                disabled={saving || !selectedAnswer?.formFields?.length}
                className="px-4"
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-1"></i>
                    Save Changes
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Modal>
        </Container>
      </div>
    </>
  );
};

export default MyFormAnswers;
