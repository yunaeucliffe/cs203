import { useState } from "react";

function Home() {

  const [destination, setDestination] = useState("");

  return (
    <div className="home-page">

      {/* Greeting */}
      <h1>Good morning, Mary 👋</h1>

      {/* Search */}
      <h2>Where would you like to go?</h2>

      <input
        type="text"
        placeholder="e.g. Chinatown, Library"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
      />

      <button>
        Search
      </button>


      {/* Quick Actions */}
      <div className="quick-actions">

        <button className="action-button">
          <span>🏠</span>
          <span>Home</span>
        </button>

        <button className="action-button">
          <span>❤️</span>
          <span>Favourites</span>
        </button>

      </div>


      {/* Bottom Navigation */}
      <nav className="bottom-nav">

        <button>
          🏠
          <span>Home</span>
        </button>

        <button>
          🗺️
          <span>Trips</span>
        </button>

        <button>
          👤
          <span>Profile</span>
        </button>

      </nav>

    </div>
  );
}

export default Home;