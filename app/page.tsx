'use client'

import { useEffect, useState, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [tab, setTab] = useState<'student' | 'admin'>('student')

  const [adminPassword, setAdminPassword] = useState("")
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_PASSWORD

  const [inputId, setInputId] = useState("")
  const [currentStudent, setCurrentStudent] = useState<any>(null)

  const [attendance, setAttendance] = useState<any[]>([])
  const [successMessage, setSuccessMessage] = useState("")
  const [checkedInLocation, setCheckedInLocation] = useState("")
  const [showScanner, setShowScanner] = useState(false)

  const scannerInitialized = useRef(false)

  useEffect(() => {
    loadAttendance()
  }, [])

  // ================= BUTTON STYLES =================
  const primaryBtn = {
    padding: '10px 14px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer'
  }

  const secondaryBtn = {
    padding: '10px 14px',
    background: '#e5e7eb',
    color: '#111',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer'
  }

  const dangerBtn = {
    padding: '10px 14px',
    background: '#fee2e2',
    color: '#991b1b',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer'
  }

  async function loadAttendance() {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .order('created_at', { ascending: false })

    setAttendance(data || [])
  }

  async function verifyStudent() {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('id', inputId)
      .single()

    if (error || !data) {
      alert("ID not found")
      setCurrentStudent(null)
    } else {
      setCurrentStudent(data)
    }
  }

  async function checkIn(student: any, location: string) {
    const { error } = await supabase.from('attendance').upsert({
      student_id: student.id,
      location,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (!error) {
      setCheckedInLocation(location)
      setSuccessMessage("Check-In Successful")
      loadAttendance()
    }
  }

  useEffect(() => {
    if (!showScanner || !currentStudent || scannerInitialized.current) return

    scannerInitialized.current = true

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: 250 },
      false
    )

    scanner.render(
      async (decodedText) => {
        const allowed = ["cafeteria", "park"]

        if (!allowed.includes(decodedText)) {
          alert("Invalid QR Code")
          scanner.clear().catch(() => {})
          scannerInitialized.current = false
          setShowScanner(false)
          return
        }

        scanner.clear().catch(() => {})
        scannerInitialized.current = false
        setShowScanner(false)

        await checkIn(currentStudent, decodedText)
      },
      () => {}
    )

    return () => {
      scanner.clear().catch(() => {})
      scannerInitialized.current = false
    }
  }, [showScanner, currentStudent])

  function unlockAdmin() {
    if (adminPassword === ADMIN_SECRET) {
      setIsAdminUnlocked(true)
    } else {
      alert("Incorrect password")
    }
  }

  async function handleCSVUpload(file: File) {
    const text = await file.text()

    const rows = text.split("\n").slice(1)

    const students = rows
      .map(row => row.trim())
      .filter(Boolean)
      .map(row => {
        const [id, first_name, last_name] = row.split(",")

        return {
          id: id?.trim(),
          first_name: first_name?.trim(),
          last_name: last_name?.trim()
        }
      })

    const { error } = await supabase
      .from('students')
      .upsert(students, { onConflict: 'id' })

    if (error) {
      console.error(error)
      alert("CSV upload failed")
    } else {
      alert("CSV uploaded successfully")
    }
  }

  function logoutStudent() {
    setCurrentStudent(null)
    setInputId("")
    setShowScanner(false)
    setSuccessMessage("")
    setCheckedInLocation("")
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f6f7fb',
        padding: 20,
        display: 'flex',
        justifyContent: 'center',
        color: '#111'
      }}
    >
      <div style={{ width: '100%', maxWidth: 700 }}>
        <h1 style={{ marginBottom: 20 }}>Walkathon Scanner</h1>

        {/* ================= TAB SWITCHER ================= */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button onClick={() => setTab('student')} style={tab === 'student' ? primaryBtn : secondaryBtn}>
            Student
          </button>

          <button onClick={() => setTab('admin')} style={tab === 'admin' ? primaryBtn : secondaryBtn}>
            Admin
          </button>
        </div>

        {/* ================= STUDENT ================= */}
        {tab === 'student' && (
          <div style={{ background: 'white', padding: 20, borderRadius: 12 }}>
            {!currentStudent && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  verifyStudent()
                }}
              >
                <input
                  style={{ padding: 10, width: '70%' }}
                  placeholder="Enter Student ID"
                  value={inputId}
                  onChange={(e) => setInputId(e.target.value)}
                />

                <button type="submit" style={{ marginLeft: 10, ...primaryBtn }}>
                  Verify
                </button>
              </form>
            )}

            {currentStudent && !successMessage && (
              <div>
                <h2>
                  Welcome {currentStudent.first_name} {currentStudent.last_name}
                </h2>

                {/* FIXED ORDER */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  <button onClick={logoutStudent} style={dangerBtn}>
                    Wrong Student / Log Out
                  </button>

                  {!showScanner && (
                    <button onClick={() => setShowScanner(true)} style={primaryBtn}>
                      Scan QR Code
                    </button>
                  )}
                </div>

                {showScanner && (
                  <div style={{ padding: 10, border: '2px dashed #ddd', borderRadius: 10 }}>
                    <div id="qr-reader" style={{ maxWidth: 400 }} />
                  </div>
                )}
              </div>
            )}

            {currentStudent && successMessage && (
              <div
                style={{
                  textAlign: 'center',
                  padding: 30,
                  background: '#ecfdf5',
                  borderRadius: 12,
                  border: '1px solid #10b981'
                }}
              >
                <h2>✅ Checked In Successfully</h2>

                <p>{currentStudent.first_name} {currentStudent.last_name}</p>
                <p><strong>{checkedInLocation}</strong></p>

                <button onClick={logoutStudent} style={{ marginTop: 20, ...primaryBtn }}>
                  Log Out
                </button>
              </div>
            )}
          </div>
        )}

        {/* ================= ADMIN ================= */}
        {tab === 'admin' && (
          <div style={{ background: 'white', padding: 20, borderRadius: 12 }}>
            <h2>Admin Dashboard</h2>

            {!isAdminUnlocked ? (
              <form onSubmit={(e) => {
                e.preventDefault()
                unlockAdmin()
              }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter admin password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    style={{ padding: 10 }}
                  />

                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={secondaryBtn}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <button type="submit" style={{ marginTop: 10, ...primaryBtn }}>
                  Unlock
                </button>
              </form>
            ) : (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <h3>Upload Students CSV</h3>

                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleCSVUpload(e.target.files[0])
                    }}
                  />
                </div>

                <button onClick={loadAttendance} style={{ ...secondaryBtn, marginBottom: 20 }}>
                  Refresh
                </button>

                <div>
                  {attendance.map((a) => (
                    <div
                      key={`${a.student_id}-${a.location}-${a.created_at}`}
                      style={{ padding: 12, borderBottom: '1px solid #eee' }}
                    >
                      <strong>{a.students?.first_name} {a.students?.last_name}</strong>
                      <br />
                      <small>ID: {a.student_id}</small> → {a.location}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}