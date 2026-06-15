// frontend/src/components/NewTrip.jsx
import { useState } from 'react';

export default function NewTrip() {
  const [formData, setFormData] = useState({
    truck: '',
    driver: '',
    freight_amount: '',
    origin: '',
    destination: '',
    departure_datetime: '2026-06-11T12:12',
    status: 'Planned',
    cargo_description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Trip data:', formData);
    
    // TODO: Send to your Django backend
    // const response = await fetch('/api/trips/', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(formData)
    // });
    
    alert('Trip saved! Check console for data.');
  };

  const handleCancel = () => {
    if (confirm('Discard changes?')) {
      setFormData({
        truck: '',
        driver: '',
        freight_amount: '',
        origin: '',
        destination: '',
        departure_datetime: '2026-06-11T12:12',
        status: 'Planned',
        cargo_description: ''
      });
    }
  };

  return (
    <div style={styles.card}>
      <h1 style={styles.title}>✈️ New Trip</h1>

      <form onSubmit={handleSubmit}>
        {/* Truck */}
        <div style={styles.formRow}>
          <label>Truck <span style={styles.required}>*</span></label>
          <input
            type="text"
            name="truck"
            value={formData.truck}
            onChange={handleChange}
            placeholder="e.g. Scania R450 - Plate ABC 123"
            required
            style={styles.input}
          />
        </div>

        {/* Driver */}
        <div style={styles.formRow}>
          <label>Driver <span style={styles.required}>*</span></label>
          <input
            type="text"
            name="driver"
            value={formData.driver}
            onChange={handleChange}
            placeholder="e.g. John Kamau"
            required
            style={styles.input}
          />
        </div>

        {/* Freight Amount */}
        <div style={styles.formRow}>
          <label>Freight Amount ($) <span style={styles.required}>*</span></label>
          <input
            type="number"
            name="freight_amount"
            value={formData.freight_amount}
            onChange={handleChange}
            placeholder="e.g. 1850"
            required
            style={styles.input}
          />
        </div>

        {/* Origin & Destination side by side */}
        <div style={styles.row}>
          <div style={{ flex: 1 }}>
            <label>Origin <span style={styles.required}>*</span></label>
            <input
              type="text"
              name="origin"
              value={formData.origin}
              onChange={handleChange}
              placeholder="e.g. Masvingo"
              required
              style={styles.input}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Destination <span style={styles.required}>*</span></label>
            <input
              type="text"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              placeholder="e.g. Kafue"
              required
              style={styles.input}
            />
          </div>
        </div>

        {/* Departure Date/Time */}
        <div style={styles.formRow}>
          <label>Departure Date/Time <span style={styles.required}>*</span></label>
          <input
            type="datetime-local"
            name="departure_datetime"
            value={formData.departure_datetime}
            onChange={handleChange}
            required
            style={styles.input}
          />
        </div>

        {/* Status */}
        <div style={styles.formRow}>
          <label>Status</label>
          <input
            type="text"
            name="status"
            value={formData.status}
            onChange={handleChange}
            placeholder="e.g. Planned, In Transit, Delivered"
            style={styles.input}
          />
          <small style={styles.small}>You can type any status</small>
        </div>

        {/* Cargo Description */}
        <div style={styles.formRow}>
          <label>Cargo Description <span style={styles.required}>*</span></label>
          <textarea
            name="cargo_description"
            value={formData.cargo_description}
            onChange={handleChange}
            placeholder="e.g. Iron Spongy Ferrous"
            required
            style={styles.textarea}
          />
        </div>

        {/* Buttons */}
        <div style={styles.actions}>
          <button type="button" onClick={handleCancel} style={styles.cancelBtn}>
            Cancel
          </button>
          <button type="submit" style={styles.saveBtn}>
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

// Styles (keep the same design as the HTML version)
const styles = {
  card: {
    maxWidth: '600px',
    margin: '2rem auto',
    background: 'white',
    borderRadius: '24px',
    boxShadow: '0 20px 35px -12px rgba(0,0,0,0.15)',
    padding: '2rem',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '600',
    marginTop: 0,
    marginBottom: '1.8rem',
    color: '#0f172a',
    borderLeft: '5px solid #f97316',
    paddingLeft: '1rem'
  },
  formRow: {
    marginBottom: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem'
  },
  row: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '1.5rem',
    flexWrap: 'wrap'
  },
  input: {
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #cbd5e1',
    borderRadius: '16px',
    fontFamily: 'inherit'
  },
  textarea: {
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #cbd5e1',
    borderRadius: '16px',
    fontFamily: 'inherit',
    minHeight: '70px',
    resize: 'vertical'
  },
  required: {
    color: '#e11d48'
  },
  small: {
    color: '#475569',
    fontSize: '0.7rem',
    marginTop: '0.2rem'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '1rem',
    marginTop: '2rem',
    borderTop: '1px solid #e2e8f0',
    paddingTop: '1.8rem'
  },
  cancelBtn: {
    padding: '0.6rem 1.4rem',
    fontWeight: '600',
    borderRadius: '40px',
    border: 'none',
    background: '#f1f5f9',
    color: '#334155',
    cursor: 'pointer'
  },
  saveBtn: {
    padding: '0.6rem 1.4rem',
    fontWeight: '600',
    borderRadius: '40px',
    border: 'none',
    background: '#f97316',
    color: 'white',
    cursor: 'pointer'
  }
};