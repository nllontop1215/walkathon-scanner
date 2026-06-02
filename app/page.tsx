'use client'

import { useEffect, useState, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [tab, setTab] = useState<'student' | 'admin'>('student')

  const [adminPassword, setAdminPassword] = useState("")
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)

  const [showPassword, setShowPassword] = useState(false)

  const ADMIN_SECRET =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD
  
  console.log("ADMIN SECRET:", process.env.NEXT_PUBLIC_ADMIN_PASSWORD)
  
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

    const rows = text.split("\n").slice(1) // skip header

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
    <main style={{ padding: 20 }}>
      <h1>Walkathon Scanner</h1>

      <div style={{ marginBottom: 20 }}>
        <button onClick={() => setTab('student')}>Student</button>
        <button onClick={() => setTab('admin')} style={{ marginLeft: 10 }}>
          Admin
        </button>
      </div>

      {/* ================= STUDENT ================= */}
{tab === 'student' && (
  <div>

    {!currentStudent && (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          verifyStudent()
        }}
      >
        <input
          placeholder="Enter Student ID"
          value={inputId}
          onChange={(e) => setInputId(e.target.value)}
        />

        <button
          type="submit"
          style={{ marginLeft: 10 }}
        >
          Verify
        </button>
      </form>
    )}

    {currentStudent && !successMessage && (
      <div>
        <h2>
          Welcome {currentStudent.first_name}{' '}
          {currentStudent.last_name}
        </h2>

        <button
          onClick={logoutStudent}
          style={{
            marginBottom: 20
          }}
        >
          Wrong Student / Log Out
        </button>

        <br />

        {!showScanner && (
          <button
            onClick={() => setShowScanner(true)}
          >
            Scan QR Code
          </button>
        )}

        {showScanner && (
          <div style={{ marginTop: 20 }}>
            <div
              id="qr-reader"
              style={{ maxWidth: 400 }}
            />
          </div>
        )}
      </div>
    )}

    {currentStudent && successMessage && (
      <div
        style={{
          textAlign: 'center',
          padding: 30
        }}
      >
        <h2>
          ✅ Successfully Checked In!
        </h2>

        <p>
          {currentStudent.first_name}{' '}
          {currentStudent.last_name}
        </p>

        <p>
          Location:{' '}
          <strong>
            {checkedInLocation}
          </strong>
        </p>

        <button
          onClick={logoutStudent}
          style={{
            marginTop: 20,
            padding: '10px 20px'
          }}
        >
          Log Out
        </button>
      </div>
    )}

  </div>
)}

      {/* ================= ADMIN ================= */}
      {tab === 'admin' && (
        <div>
          <h2>Admin Dashboard</h2>

          {!isAdminUnlocked ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                unlockAdmin()
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
  <input
    type={showPassword ? "text" : "password"}
    placeholder="Enter admin password"
    value={adminPassword}
    onChange={(e) => setAdminPassword(e.target.value)}
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    style={{
      padding: '6px 10px',
      fontSize: 12,
      cursor: 'pointer'
    }}
  >
    {showPassword ? "Hide" : "Show"}
  </button>
</div>
              <button type="submit" style={{ marginLeft: 10 }}>
                Unlock
              </button>
            </form>
          ) : (
            <div>
              {/* 🆕 CSV UPLOAD */}
              <div style={{ marginBottom: 20 }}>
                <h3>Upload Students CSV</h3>

                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleCSVUpload(e.target.files[0])
                    }
                  }}
                />
              </div>

              {/* Attendance feed */}
              <button onClick={loadAttendance} style={{ marginBottom: 20 }}>
                Refresh
              </button>

              <div>
                {attendance.map((a) => (
                  <div
                    key={`${a.student_id}-${a.location}-${a.created_at}`}
                    style={{
                      padding: 8,
                      borderBottom: '1px solid #ddd'
                    }}
                  >
                    <strong>{a.student_id}</strong> → {a.location}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}