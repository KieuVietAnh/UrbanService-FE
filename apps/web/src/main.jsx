import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { setApiBaseUrl } from '@urbanmind/shared-api'

// Set API base URL from environment variable
const apiUrl = import.meta.env.VITE_API_URL
if (apiUrl) {
  setApiBaseUrl(apiUrl)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)