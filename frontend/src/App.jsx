import { useEffect, useState } from 'react'
import Home from './pages/Home'
import SharedTrip from './pages/SharedTrip'
import { TripSharingProvider } from './components/TripSharing'

function App() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const update = () => setHash(window.location.hash)
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  if (hash.startsWith('#share/')) return <SharedTrip key={hash} token={hash.slice(7)} />
  return <TripSharingProvider><Home /></TripSharingProvider>
}
export default App
