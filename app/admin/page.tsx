'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const [password, setPassword] = useState("")
  const [isAuthed, setIsAuthed] = useState(false)

  const [students, setStudents] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])

  // Load both datasets
  async function loadStudents() {
    const { data, error } = await supabase
      .from('students')
      .select('*')

    if (error) {
      console.error(error)
    } else {
      setStudents(data || [])
    }
  }

  async function loadAttendance() {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')

    if (error) {
      console.error(error)
    } else {
      setAttendance(data || [])
    }
  }

  function login() {
    if (password === "admin123") {
      setIsAuthed(true)
      loadStudents()
      loadAttendance()
    } else {
      alert("Wrong password")
    }
  }

  // Create lookup map: student_id → student object
  const studentMap = Object.fromEntries(
    students.map((s) => [s.id, s])
  )

  if (!isAuthed) {
    return (
      <main style={{ padding: 20 }}>
        <h1>Admin Login</h1>

        <input
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={login} style={{ marginLeft: 10 }}>
          Login
        </button>
      </main>
    )
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Admin Dashboard</h1>

      <button onClick={loadAttendance} style={{ marginBottom: 20 }}>
        Refresh
      </button>

      {/* Attendance Feed */}
      {attendance.map((a) => {
        const student = studentMap[a.student_id]

        return (
          <div key={a.id || `${a.student_id}-${a.location}`}>
            {student
              ? `${student.first_name} ${student.last_name} (${student.id})`
              : `Unknown (${a.student_id})`
            } → {a.location}
          </div>
        )
      })}
    </main>
  )
}