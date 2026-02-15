"use client";

/**
 * components/AddVehicle.tsx
 * Simple modal form to register a new vehicle from the dashboard.
 */

import { useState } from "react";

interface Props {
  apiBase: string;
  onAdded: () => void;
  onClose: () => void;
}

export default function AddTechnician({ apiBase, onAdded, onClose }: Props) {
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("car");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!name.trim() || !employeeId.trim()) {
      setError("Technician name and employee ID are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/technicians`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          name: name.trim(),
          employeeId: employeeId.trim(),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#00000088",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          background: "#0D1220",
          border: "1px solid #1E2A45",
          borderRadius: 12,
          padding: 24,
          width: 360,
          maxWidth: "90vw",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E8F0" }}>
            Add Technician
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#475569",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ✕
          </button>
        </div>

        <Field label="TECHNICIAN NAME *">
          <input
            style={inputStyle}
            placeholder="e.g. John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>

        <Field label="EMPLOYEE ID">
          <input
            style={inputStyle}
            placeholder="e.g. EMP-001 "
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value.toUpperCase())}
          />
        </Field>

        {error && (
          <div style={{ color: "#FF5252", fontSize: 12, marginBottom: 12 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{
            width: "100%",
            padding: "12px",
            background: saving ? "#1E2A45" : "#1A73E8",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}
        >
          {saving ? "Saving…" : "Add Technician"}
        </button>
      </div>

      <style jsx global>{`
        input,
        select {
          outline: none;
        }
        input::placeholder {
          color: #334155;
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: 2,
          color: "#475569",
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#131929",
  border: "1px solid #1E2A45",
  borderRadius: 6,
  color: "#E2E8F0",
  fontSize: 13,
  fontFamily: "inherit",
  boxSizing: "border-box",
};
