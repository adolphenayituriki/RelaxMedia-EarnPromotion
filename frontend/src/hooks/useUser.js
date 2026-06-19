import { useState, useEffect } from 'react'

const STORAGE_KEY = 'yt_tracker_user_id'

function generateId() {
  return 'user_' + Math.random().toString(36).substring(2, 10)
}

export default function useUser() {
  const [userId] = useState(() => {
    let id = localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = generateId()
      localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  })

  return userId
}
