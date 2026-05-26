'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [students, setStudents] = useState<any[]>([])
  const [attendance, setAttendance] = useState<any[]>([])

  const [inputId, setInputId] = useState("")
  const [currentStudent, setCurrentStudent] = useState<any>(null)

  // NEW: success message state
  const [successMessage, setSuccessMessage] = useState("")

  useEffect(() => {
    loadAttendance()
  }, [])

  async function loadAttendance() {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')

    if (error) {
      console.log("ATTENDANCE ERROR FULL:", error)
    } else {
      setAttendance(data || [])
    }
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

    if (error) {
      console.error(error)
    } else {
      console.log(`${student.first_name} checked into ${location}`)
      loadAttendance()

      // NEW: success message
      setSuccessMessage(`Checked into ${location} ✔`)

      // NEW: reset flow after short delay
      setTimeout(() => {
        setSuccessMessage("")
        setCurrentStudent(null)
        setInputId("")
      }, 1500)
    }
  }

  return (
    <main style={{ padding: 20 }}>

      <h1>Student Check-In</h1>

      {/* NEW: SUCCESS MESSAGE */}
      {successMessage && (
        <div style={{ marginBottom: 20, color: "green", fontWeight: 600 }}>
          {successMessage}
        </div>
      )}

      {/* ID ENTRY */}
      {!currentStudent && (
        <div style={{ marginBottom: 20 }}>
          <input
            placeholder="Enter Student ID"
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
          />
          <button onClick={verifyStudent} style={{ marginLeft: 10 }}>
            Verify
          </button>
        </div>
      )}

      {/* VERIFIED STUDENT VIEW */}
      {currentStudent && (
        <div style={{ marginBottom: 20 }}>
          <h2>
            Welcome {currentStudent.first_name} {currentStudent.last_name}
          </h2>

          <button onClick={() => checkIn(currentStudent, "cafeteria")}>
            Cafeteria
          </button>

          <button
            onClick={() => checkIn(currentStudent, "park")}
            style={{ marginLeft: 10 }}
          >
            Park
          </button>

          <button
            style={{ marginLeft: 10 }}
            onClick={() => setCurrentStudent(null)}
          >
            Logout / Wrong ID
          </button>
        </div>
      )}

    </main>
  )
}