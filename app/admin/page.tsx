'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminPage() {
  const [attendance, setAttendance] = useState<any[]>([])

  useEffect(() => {
    loadAttendance()
  }, [])

  async function loadAttendance() {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.log("ADMIN LOAD ERROR:", error)
    } else {
      setAttendance(data || [])
    }
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Admin Dashboard</h1>

      <button onClick={loadAttendance} style={{ marginBottom: 20 }}>
        Refresh
      </button>

      <div>
        {attendance.map((a) => (
          <div
            key={a.id}
            style={{
              padding: 8,
              borderBottom: '1px solid #ddd'
            }}
          >
            <strong>{a.student_id}</strong> → {a.location}
          </div>
        ))}
      </div>
    </main>
  )
}