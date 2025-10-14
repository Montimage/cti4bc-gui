import React, { useEffect, useState } from "react";

const SERVER_URL = process.env.REACT_APP_API_URL;

export default function OrganizationSelector({ onOrganizationsSelected }) {
  const [orgs, setOrgs] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    setLoading(true);
    // Use your endpoint that returns [{id, name}] or {organizations: [...]}
    fetch(`${SERVER_URL}/organizations/summary/`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.organizations ?? []);
        setOrgs(list);
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Notify parent whenever the selection changes
  useEffect(() => {
    onOrganizationsSelected(selected);
  }, [selected, onOrganizationsSelected]);

  if (loading) {
    return (
      <div className="d-flex align-items-center gap-2">
        <div className="spinner-border" role="status" />
        <span>Loading organizations…</span>
      </div>
    );
  }

  if (orgs.length === 0) {
    return <p className="text-muted mb-0">No organizations available.</p>;
  }

  return (
    <div className="list-group">
      {orgs.map(o => (
        <label key={o.id} className="list-group-item d-flex align-items-center">
          <input
            type="checkbox"
            className="form-check-input me-2"
            checked={selected.includes(o.id)}
            onChange={() => toggle(o.id)}
          />
          <div className="fw-semibold">{o.name}</div>
        </label>
      ))}
    </div>
  );
}