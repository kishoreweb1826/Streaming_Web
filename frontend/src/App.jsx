import { Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Search, TrendingUp, Tv, Film, ChevronLeft, Star, Clock, Layers, Zap, Heart } from 'lucide-react';

/* ============================================================ */
/*  CONFIG & MEGA API LOADERS                                   */
/* ============================================================ */
const TMDB_KEY = "15d2ea6d0dc1d476efbca3eba2b9bbfb";
const TMDB_BASE = "https://api.themoviedb.org/3";

function getEmbedUrl(server, type, id, season, episode, title = '') {
  if (type === 'movie') {
    switch (server) {
      case 1: return `https://vidsrc.net/embed/movie?tmdb=${id}`;
      case 2: return `https://autoembed.co/movie/tmdb/${id}`;
      case 3: return `https://multiembed.mov/?video_id=${id}&tmdb=1`;
      case 4: return `https://vidsrc.cc/v2/embed/movie/${id}`;
      case 5: return `https://player.smashy.stream/movie/${id}`;
      case 6: return `https://embed.su/embed/movie/${id}`;
      case 7: return `https://vidlink.pro/movie/${id}`;
      case 8: return `https://animesalt.ac/?s=${encodeURIComponent(title)}`;
      default: return `https://vidsrc.net/embed/movie?tmdb=${id}`;
    }
  } else {
    switch (server) {
      case 1: return `https://vidsrc.net/embed/tv?tmdb=${id}&season=${season}&ep=${episode}`;
      case 2: return `https://autoembed.co/tv/tmdb/${id}-${season}-${episode}`;
      case 3: return `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}`;
      case 4: return `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}`;
      case 5: return `https://player.smashy.stream/tv/${id}?s=${season}&e=${episode}`;
      case 6: return `https://embed.su/embed/tv/${id}/${season}/${episode}`;
      case 7: return `https://vidlink.pro/tv/${id}/${season}/${episode}`;
      case 8: return `https://animesalt.ac/?s=${encodeURIComponent(title)}`;
      default: return `https://vidsrc.net/embed/tv?tmdb=${id}&season=${season}&ep=${episode}`;
    }
  }
}

/* ============================================================ */
/*  TMDB LIVE FETCHERS                                          */
/* ============================================================ */
async function fetchTrendingMovies() {
  try {
    const res = await fetch(`${TMDB_BASE}/movie/now_playing?api_key=${TMDB_KEY}`);
    return (await res.json()).results || [];
  } catch { return []; }
}
async function fetchTrendingTv() {
  try {
    const res = await fetch(`${TMDB_BASE}/tv/on_the_air?api_key=${TMDB_KEY}&language=en-US`);
    return (await res.json()).results || [];
  } catch { return []; }
}

async function fetchLatestEpisodesFeed() {
  try {
    const res = await fetch(`${TMDB_BASE}/tv/on_the_air?api_key=${TMDB_KEY}&language=en-US&page=1`);
    const onAir = (await res.json()).results || [];
    const top = onAir.slice(0, 10);
    const deepDetails = await Promise.all(
      top.map(series => fetch(`${TMDB_BASE}/tv/${series.id}?api_key=${TMDB_KEY}`).then(r => r.json()))
    );

    let episodes = deepDetails.map(detail => {
      const ep = detail.last_episode_to_air || {};
      return {
        id: detail.id,
        show_name: detail.name,
        poster_path: detail.poster_path, // Vertical poster for symmetry
        season: ep.season_number || 1,
        episode: ep.episode_number || 1,
        ep_name: ep.name || 'New Episode',
        air_date: ep.air_date || '2000-01-01',
        type: 'tv'
      };
    });

    return episodes.sort((a, b) => new Date(b.air_date) - new Date(a.air_date)).slice(0, 6);
  } catch { return []; }
}

async function fetchJikanLatestEpisodes() {
  try {
    const res = await fetch(`https://api.jikan.moe/v4/watch/episodes`);
    const data = (await res.json()).data || [];
    return data.slice(0, 6).map(item => ({
      search_title: item.entry.title,
      show_name: item.entry.title,
      poster: item.entry.images?.jpg?.image_url,
      episode: item.episodes[0]?.mal_id || 1,
      season: 1,
      is_jikan: true,
      type: 'tv'
    }));
  } catch { return []; }
}

async function fetchAnime(genreId = '') {
  try {
    let params = genreId === 'airing'
      ? '&with_genres=16&first_air_date.gte=2024-01-01'
      : (genreId ? `&with_genres=16,${genreId}` : '&with_genres=16');

    const res = await fetch(`${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}${params}&with_original_language=ja&sort_by=popularity.desc`);
    return (await res.json()).results || [];
  } catch { return []; }
}

async function fetchTamilMovies() {
  try {
    const res = await fetch(`${TMDB_BASE}/discover/movie?api_key=${TMDB_KEY}&with_original_language=ta&sort_by=popularity.desc`);
    return (await res.json()).results || [];
  } catch { return []; }
}

async function fetchKDrama() {
  try {
    const res = await fetch(`${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&with_original_language=ko&sort_by=popularity.desc`);
    return (await res.json()).results || [];
  } catch { return []; }
}

async function fetchSearch(query) {
  try {
    const res = await fetch(`${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}`);
    return (await res.json()).results.filter(item => item.media_type === 'movie' || item.media_type === 'tv');
  } catch { return []; }
}

async function fetchDetails(type, id) {
  try {
    const res = await fetch(`${TMDB_BASE}/${type}/${id}?api_key=${TMDB_KEY}`); return await res.json();
  } catch { return null; }
}

/* ============================================================ */
/*  NAVBAR                                                      */
/* ============================================================ */
function Navbar() {
  const [search, setSearch] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/search/${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="logo">
        <Play size={28} fill="url(#grad)" stroke="url(#grad)" strokeWidth={1} />
        <svg width="0" height="0">
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop stopColor="#7c5cfc" offset="0%" />
            <stop stopColor="#ff4081" offset="100%" />
          </linearGradient>
        </svg>
        KFLIX
      </Link>
      <div className="nav-center">
        <Link to="/" className={isActive('/')}><Film size={16} /> Home</Link>
        <Link to="/movies" className={isActive('/movies')}><Film size={16} /> Movies</Link>
        <Link to="/tv" className={isActive('/tv')}><Tv size={16} /> Series</Link>
        <Link to="/anime" className={isActive('/anime')}><Zap size={16} /> Anime</Link>
        <Link to="/tamil" className={isActive('/tamil')}><Film size={16} /> Tamil</Link>
        <Link to="/kdrama" className={isActive('/kdrama')}><Heart size={16} /> K-Drama</Link>
        <Link to="/server-hub" className={isActive('/server-hub')}><Layers size={16} /> Server Hub</Link>
      </div>
      <form className="search-bar" onSubmit={handleSearch}>
        <Search size={18} color="var(--text-muted)" />
        <input type="text" className="search-input" placeholder="Search a movie, anime, or series..." value={search} onChange={e => setSearch(e.target.value)} />
      </form>
    </nav>
  );
}

/* ============================================================ */
/*  REUSABLE MEDIA CARD                                         */
/* ============================================================ */
function MediaCard({ item, type, index }) {
  const navigate = useNavigate();
  const id = item.id;
  const poster = item.poster_path
    ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
    : (item.poster || 'https://via.placeholder.com/300x450/13162a/fff?text=No+Poster');
  const title = item.title || item.name || item.show_name || 'Unknown Title';
  const year = (item.release_date || item.first_air_date || item.air_date || '').substring(0, 4);

  const handleClick = async () => {
    if (item.is_jikan) {
      const mapRes = await fetch(`${TMDB_BASE}/search/tv?api_key=${TMDB_KEY}&query=${encodeURIComponent(item.search_title)}`);
      const payload = await mapRes.json();
      if (payload.results && payload.results[0]) {
        navigate(`/tv/${payload.results[0].id}/${item.season}/${item.episode}`);
      } else {
        navigate(`/search/${encodeURIComponent(item.search_title)}`);
      }
    } else {
      navigate(`/${type}/${id}`);
    }
  };

  return (
    <motion.div
      className="movie-card"
      onClick={handleClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: (index % 10) * 0.05 }}
    >
      <div className="poster-wrap">
        <span className={`type-badge ${type}`}>
          {item.is_jikan ? `Ep ${item.episode}` : type === 'tv' ? 'Series' : 'Movie'}
        </span>
        <img src={poster} alt={title} className="movie-poster" loading="lazy" />
        <div className="poster-overlay"><div className="play-icon"><Play size={24} fill="white" color="white" /></div></div>
      </div>
      <div className="movie-info">
        <h3 className="movie-title">{title}</h3>
        <div className="movie-meta">
          <span>{year}</span>
          {!item.is_jikan && <span className="rating"><Star size={13} fill="#fbbf24" color="#fbbf24" /> {Number(item.vote_average || 0).toFixed(1)}</span>}
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================ */
/*  PAGES                                                       */
/* ============================================================ */
function HomePage() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [tv, setTv] = useState([]);
  const [anime, setAnime] = useState([]);
  const [jikanAnime, setJikanAnime] = useState([]);
  const [latestEpisodes, setLatestEpisodes] = useState([]);
  const [kdrama, setKdrama] = useState([]);
  const [tamil, setTamil] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHome() {
      const [m, t, a, ja, le, k, tam] = await Promise.all([
        fetchTrendingMovies(), fetchTrendingTv(), fetchAnime(), fetchJikanLatestEpisodes(), fetchLatestEpisodesFeed(), fetchKDrama(), fetchTamilMovies()
      ]);
      setMovies(m); setTv(t); setAnime(a); setJikanAnime(ja); setLatestEpisodes(le); setKdrama(k); setTamil(tam); setLoading(false);
    }
    fetchHome();
  }, []);

  const hero = movies.length > 0 ? movies[0] : null;

  return (
    <div className="fade-in">
      {loading ? (
        <div className="page-loader"><div className="loader" /></div>
      ) : (
        <>
          {hero && (
            <div className="hero">
              <img src={`https://image.tmdb.org/t/p/original${hero.backdrop_path}`} alt="Hero" className="hero-bg" />
              <div className="hero-overlay" />
              <div className="hero-content">
                <div className="badge">🔥 Now Playing Worldwide</div>
                <h1 className="hero-title">{hero.title}</h1>
                <p className="hero-desc">{hero.overview}</p>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={() => navigate(`/movie/${hero.id}`)}>
                    <Play size={18} fill="currentColor" /> Watch Instant
                  </button>
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '4rem' }}>
            <div className="section-header">
              <h2 className="section-title"><TrendingUp /> Blockbuster Movies</h2>
              <Link to="/movies" className="see-all">Explore Movies →</Link>
            </div>
            <div className="grid">
              {movies.slice(0, 12).map((m, i) => <MediaCard key={m.id} item={m} type="movie" index={i} />)}
            </div>
          </div>

          <div style={{ marginBottom: '4rem' }}>
            <div className="section-header">
              <h2 className="section-title"><Tv /> New Series Episodes Airing</h2>
              <Link to="/tv" className="see-all">Explore TV →</Link>
            </div>
            <div className="grid">
              {tv.slice(0, 12).map((t, i) => <MediaCard key={t.id} item={t} type="tv" index={i} />)}
            </div>
          </div>

          {/* REAL LATEST EPISODES DROPS */}
          {latestEpisodes.length > 0 && (
            <div style={{ marginBottom: '4rem' }}>
              <div className="section-header">
                <h2 className="section-title"><Clock /> Latest Episodes Released Worldwide</h2>
              </div>
              <div className="grid">
                {latestEpisodes.map((ep, i) => (
                  <motion.div
                    key={ep.id + 'ep'}
                    className="latest-episode-card movie-card"
                    onClick={() => navigate(`/tv/${ep.id}/${ep.season}/${ep.episode}`)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="poster-wrap">
                      <span className="type-badge">S{ep.season} E{ep.episode}</span>
                      <img src={ep.poster_path ? `https://image.tmdb.org/t/p/w500${ep.poster_path}` : 'https://via.placeholder.com/300x450/13162a/fff?text=No+Poster'} alt={ep.show_name} className="movie-poster" loading="lazy" />
                      <div className="poster-overlay"><div className="play-icon"><Play size={24} fill="white" color="white" /></div></div>
                    </div>
                    <div className="movie-info" style={{ textAlign: 'center' }}>
                      <h3 className="movie-title" style={{ fontSize: '0.9rem' }}>{ep.show_name}</h3>
                      <div className="movie-meta" style={{ justifyContent: 'center' }}>
                        <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{ep.ep_name.length > 20 ? ep.ep_name.substring(0, 20) + '...' : ep.ep_name}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: '4rem' }}>
            <div className="section-header">
              <h2 className="section-title"><Zap /> Latest Episodes (Jikan MyAnimeList API)</h2>
            </div>
            <div className="grid">
              {jikanAnime.slice(0, 6).map((a, i) => <MediaCard key={a.search_title} item={a} type="tv" index={i} />)}
            </div>
          </div>

          <div style={{ marginBottom: '4rem' }}>
            <div className="section-header">
              <h2 className="section-title"><Zap /> Top Animated Series (Anime)</h2>
              <Link to="/anime" className="see-all">Explore Anime →</Link>
            </div>
            <div className="grid">
              {anime.slice(0, 6).map((a, i) => <MediaCard key={a.id} item={a} type="tv" index={i} />)}
            </div>
          </div>

          <div style={{ marginBottom: '4rem' }}>
            <div className="section-header">
              <h2 className="section-title"><Heart /> Best K-Dramas Trending</h2>
              <Link to="/kdrama" className="see-all">Explore K-Dramas →</Link>
            </div>
            <div className="grid">
              {kdrama.slice(0, 6).map((k, i) => <MediaCard key={k.id} item={k} type="tv" index={i} />)}
            </div>
          </div>

          <div style={{ marginBottom: '4rem' }}>
            <div className="section-header">
              <h2 className="section-title"><Film /> Kollywood Hits (Tamil Hub)</h2>
              <Link to="/tamil" className="see-all">Explore Tamil →</Link>
            </div>
            <div className="grid">
              {tamil.slice(0, 6).map((k, i) => <MediaCard key={k.id} item={k} type="movie" index={i} />)}
            </div>
            <p style={{ textAlign: 'center', marginTop: '1rem', color: '#8a8fa8', fontSize: '0.85rem' }}>Select 'S1 (Net)' or 'S3 (Mulv)' inside to potentially unlock regional audio tracks when available.</p>
          </div>
        </>
      )}
    </div>
  );
}

function AnimePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');

  const categories = [
    { name: 'All Anime', id: '' },
    { name: 'New Airing Episodes', id: 'airing' },
    { name: 'Action', id: '10759' }, // TMDB Action & Adventure
    { name: 'Sci-Fi / Fantasy', id: '10765' },
    { name: 'Comedy', id: '35' },
    { name: 'Drama', id: '18' },
  ];

  useEffect(() => {
    setLoading(true);
    fetchAnime(category).then(res => {
      setItems(res); setLoading(false);
    });
  }, [category]);

  return (
    <div className="fade-in">
      <h1 className="section-title" style={{ marginBottom: '2rem' }}><Zap /> The Anime Hub</h1>
      <div className="filters" style={{ marginBottom: '2rem' }}>
        {categories.map(c => (
          <button key={c.name} className={`filter-btn ${category === c.id ? 'active' : ''}`} onClick={() => setCategory(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      {loading ? <div className="page-loader"><div className="loader" /></div> : (
        <div className="grid">{items.map((t, i) => <MediaCard key={t.id} item={t} type="tv" index={i} />)}</div>
      )}
    </div>
  );
}

function KDramaPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKDrama().then(res => { setItems(res); setLoading(false); });
  }, []);

  return (
    <div className="fade-in">
      <h1 className="section-title" style={{ marginBottom: '2rem' }}><Heart /> K-Drama Central</h1>
      {loading ? <div className="page-loader"><div className="loader" /></div> : (
        <div className="grid">{items.map((t, i) => <MediaCard key={t.id} item={t} type="tv" index={i} />)}</div>
      )}
    </div>
  );
}

// NEW: Tamil Anime Fetcher
async function fetchTamilAnime() {
  try {
    const res = await fetch(`${TMDB_BASE}/discover/tv?api_key=${TMDB_KEY}&with_genres=16&with_original_language=ta&sort_by=popularity.desc`);
    return (await res.json()).results || [];
  } catch { return []; }
}

function TamilPage() {
  const [items, setItems] = useState([]);
  const [anime, setAnime] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchTamilMovies(), fetchTamilAnime()]).then(([moviesRes, animeRes]) => {
      setItems(moviesRes);
      setAnime(animeRes);
      setLoading(false);
    });
  }, []);

  return (
    <div className="fade-in">
      <h1 className="section-title" style={{ marginBottom: '2rem' }}><Film /> Tamil Cinema Hub</h1>
      <p style={{ color: '#8a8fa8', marginBottom: '2rem' }}>Use multi-servers inside movies or series for regional dubbed track access.</p>
      {loading ? <div className="page-loader"><div className="loader" /></div> : (
        <>
          <div style={{ marginBottom: '4rem' }}>
            <h2 className="section-title" style={{ marginBottom: '1.5rem', color: 'var(--primary)' }}>Top Tamil Anime (Native & Dubbed Indexed)</h2>
            <div className="grid">
              {anime.length > 0 ? anime.map((t, i) => <MediaCard key={t.id} item={t} type="tv" index={i} />) : <p>No major Tamil Anime active in current DB slice.</p>}
            </div>
          </div>
          <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Blockbuster Tamil Movies</h2>
          <div className="grid">{items.map((t, i) => <MediaCard key={t.id} item={t} type="movie" index={i} />)}</div>
        </>
      )}
    </div>
  );
}

// NEW: Server Format Raw API Page (For VAPI Latest Episodes)
function ServerHubPage() {
  const [vapiEps, setVapiEps] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchVapiServer() {
      try {
        // Attempting to hit the raw VAPI server formats exactly as requested by user
        // Using bypass proxy since vidsrc standard blocks frontend CORS
        const res = await fetch(`https://corsproxy.io/?https://vidsrc.net/vapi/episode/latest/1`);
        const payload = await res.json();
        if (payload && payload.result) {
          setVapiEps(payload.result.items || []);
        } else {
          // Fallback to local node.js API backend if running
          const localRes = await fetch(`https://streaming-web-n6mi.onrender.com`);
          const localPayload = await localRes.json();
          if (localPayload) setVapiEps(localPayload.items || []);
        }
      } catch (err) {
        console.warn("VAPI Fetch failed, using fallback mock or backend must be running.", err);
      } finally {
        setLoading(false);
      }
    }
    fetchVapiServer();
  }, []);

  return (
    <div className="fade-in">
      <div className="section-header">
        <h1 className="section-title" style={{ color: '#00e5ff' }}><Layers /> Raw Server API (Latest Episodes VAPI)</h1>
      </div>
      <p style={{ color: '#8a8fa8', marginBottom: '2rem' }}>
        Direct connection to `vapi/episode/latest/:page`. If list is empty, ensure your local Node.js backend proxy is running.
      </p>

      {loading ? <div className="page-loader"><div className="loader" /></div> : (
        <div className="grid">
          {vapiEps.length > 0 ? vapiEps.map((ep, i) => (
            <motion.div
              key={ep.imdb_id + ep.season + ep.episode + i}
              className="movie-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => navigate(`/tv/${ep.tmdb_id}/${ep.season}/${ep.episode}`)}
            >
              <div className="poster-wrap">
                <span className="type-badge" style={{ background: '#ff4081' }}>S{ep.season} E{ep.episode}</span>
                <img src={ep.poster_path ? `https://image.tmdb.org/t/p/w500${ep.poster_path}` : 'https://via.placeholder.com/300x450/13162a/fff'} alt="VAPI Raw" className="movie-poster" />
                <div className="poster-overlay"><div className="play-icon"><Play size={24} fill="white" color="white" /></div></div>
              </div>
              <div className="movie-info" style={{ textAlign: 'center' }}>
                <h3 className="movie-title">TMDB: {ep.tmdb_id || 'Unknown'}</h3>
                <div className="movie-meta" style={{ justifyContent: 'center' }}>
                  <span style={{ color: '#4ade80' }}>RAW VAPI FETCH</span>
                </div>
              </div>
            </motion.div>
          )) : (
            <div style={{ padding: '2rem', background: 'var(--surface)', borderRadius: '12px', gridColumn: '1 / -1', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>Could not connect to VAPI servers. Ensure backend handles the proxies.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchPage() {
  const { query } = useParams();
  const q = decodeURIComponent(query || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSearch(q).then(data => { setResults(data); setLoading(false); });
  }, [q]);

  return (
    <div className="fade-in">
      <h1 className="section-title" style={{ marginBottom: '2rem' }}><Search /> Search: {q}</h1>
      {loading ? <div className="page-loader"><div className="loader" /></div> : results.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>We couldn't find any match. Try a different title.</p>
      ) : (
        <div className="grid">{results.map((r, i) => <MediaCard key={r.id} item={r} type={r.media_type} index={i} />)}</div>
      )}
    </div>
  );
}

/* ============================================================ */
/*  AD-FREE EMBED PLAYER (WITH FORCE FULLSCREEN API)            */
/* ============================================================ */
function PlayerFrame({ src }) {
  const [loading, setLoading] = useState(true);
  const wrapperRef = useRef(null);

  const forceFullscreenMode = () => {
    const elem = wrapperRef.current;
    if (elem) {
      if (elem.requestFullscreen) { elem.requestFullscreen(); }
      else if (elem.webkitRequestFullscreen) { elem.webkitRequestFullscreen(); }
      else if (elem.msRequestFullscreen) { elem.msRequestFullscreen(); }
    }
  };

  return (
    <div className="player-wrapper fade-in" ref={wrapperRef} style={{ background: '#000', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', position: 'relative' }}>

      <button
        onClick={forceFullscreenMode}
        style={{ position: 'absolute', top: 15, right: 15, zIndex: 99, background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        [ ] Force Fullscreen
      </button>

      <div className="player-container" style={{ position: 'relative', width: '100%', height: '100%', aspectRatio: '16/9' }}>
        {loading && (
          <div className="loader-wrap" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className="loader" style={{ width: 40, height: 40, border: '4px solid #1e2140', borderBottomColor: '#00e5ff', borderRadius: '50%', animation: 'rotation 1s linear infinite' }} />
            <p style={{ marginTop: '1rem', color: '#8a8fa8', fontWeight: 'bold' }}>Connecting to Network...</p>
          </div>
        )}

        <iframe
          className="player-iframe"
          key={src}
          src={src}
          allowFullScreen={true}
          webkitAllowFullScreen={true}
          mozAllowFullScreen={true}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write; clipboard-read"
          onLoad={() => setLoading(false)}
          style={{ width: '100%', height: '100%', border: 'none', position: 'relative', zIndex: 5 }}
          title="Streaming Player"
        />
      </div>
    </div>
  );
}

/* ============================================================ */
/*  MOVIE PLAYER PAGE                                           */
/* ============================================================ */
function MoviePlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [server, setServer] = useState(1);
  const [info, setInfo] = useState(null);

  useEffect(() => { fetchDetails('movie', id).then(setInfo); }, [id]);

  const embedUrl = getEmbedUrl(server, 'movie', id, null, null, info?.title);

  return (
    <div className="player-page fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '1rem' }}>
      <button className="back-btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /> Go Back</button>

      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Film size={24} color="var(--primary)" /> {info ? info.title : 'Loading Title...'}
        </h2>
      </div>

      <PlayerFrame src={embedUrl} />

      <h3 style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-main)' }}>Video blocked or frozen? Click below to cycle databases!</h3>
      <div className="server-selector" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => setServer(1)} className={`server-btn ${server === 1 ? 'active' : ''}`}>S1 (Net)</button>
        <button onClick={() => setServer(2)} className={`server-btn ${server === 2 ? 'active' : ''}`}>S2 (Auto)</button>
        <button onClick={() => setServer(3)} className={`server-btn ${server === 3 ? 'active' : ''}`}>S3 (Mulv)</button>
        <button onClick={() => setServer(4)} className={`server-btn ${server === 4 ? 'active' : ''}`}>S4 (V2)</button>
        <button onClick={() => setServer(5)} className={`server-btn ${server === 5 ? 'active' : ''}`}>S5 (Smash)</button>
        <button onClick={() => setServer(6)} className={`server-btn ${server === 6 ? 'active' : ''}`}>S6 (Su)</button>
        <button onClick={() => setServer(7)} className={`server-btn ${server === 7 ? 'active' : ''}`}>S7 (Link)</button>
        <button onClick={() => setServer(8)} className={`server-btn ${server === 8 ? 'active' : ''}`} style={{ background: server === 8 ? '#ff4081' : '' }}>S8 (Tamil Hub)</button>
      </div>

      <div className="stream-info" style={{ marginTop: '3rem', padding: '2rem', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{info?.title}</h3>
        <p style={{ color: '#8a8fa8' }}>{info?.overview}</p>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', color: '#fff' }}>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.4rem 1rem', borderRadius: '12px' }}>⭐ {info?.vote_average ? Number(info.vote_average).toFixed(1) : '?'} / 10</span>
          <span style={{ background: 'rgba(255,255,255,0.1)', padding: '0.4rem 1rem', borderRadius: '12px' }}>📅 {info?.release_date}</span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  TV SERIES / ANIME / KDRAMA PLAYER PAGE                      */
/* ============================================================ */
function TvPlayer() {
  const { id, season: paramSeason, episode: paramEpisode } = useParams();
  const navigate = useNavigate();

  const season = parseInt(paramSeason) || 1;
  const episode = parseInt(paramEpisode) || 1;

  const [server, setServer] = useState(1);
  const [info, setInfo] = useState(null);

  useEffect(() => { fetchDetails('tv', id).then(setInfo); }, [id]);

  const embedUrl = getEmbedUrl(server, 'tv', id, season, episode, info?.name);

  const totalSeasons = (info?.seasons || []).filter(s => s.season_number > 0);
  const currentSeasonData = totalSeasons.find(s => s.season_number === season);
  const epsCount = currentSeasonData ? currentSeasonData.episode_count : 24;

  const totalEpisodes = Array.from({ length: epsCount }, (_, i) => i + 1);

  return (
    <div className="player-page fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '1rem' }}>
      <button className="back-btn" onClick={() => navigate(-1)}><ChevronLeft size={20} /> Browser Index</button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Tv size={24} color="var(--primary)" /> {info ? info.name : 'Loading Series...'}
        </h2>
        <div className="now-playing" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', padding: '0.4rem 1.2rem', borderRadius: '30px', fontWeight: 'bold' }}>
          <span style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%' }} /> S{season} • E{episode}
        </div>
      </div>

      <PlayerFrame src={embedUrl} />

      <h3 style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-main)' }}>Video blocked or frozen? Click below to cycle databases!</h3>
      <div className="server-selector" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button onClick={() => setServer(1)} className={`server-btn ${server === 1 ? 'active' : ''}`}>S1 (Net)</button>
        <button onClick={() => setServer(2)} className={`server-btn ${server === 2 ? 'active' : ''}`}>S2 (Auto)</button>
        <button onClick={() => setServer(3)} className={`server-btn ${server === 3 ? 'active' : ''}`}>S3 (Mulv)</button>
        <button onClick={() => setServer(4)} className={`server-btn ${server === 4 ? 'active' : ''}`}>S4 (V2)</button>
        <button onClick={() => setServer(5)} className={`server-btn ${server === 5 ? 'active' : ''}`}>S5 (Smash)</button>
        <button onClick={() => setServer(6)} className={`server-btn ${server === 6 ? 'active' : ''}`}>S6 (Su)</button>
        <button onClick={() => setServer(7)} className={`server-btn ${server === 7 ? 'active' : ''}`}>S7 (Link)</button>
        <button onClick={() => setServer(8)} className={`server-btn ${server === 8 ? 'active' : ''}`} style={{ background: server === 8 ? '#ff4081' : '' }}>S8 (Tamil Hub)</button>
      </div>

      <div style={{ marginTop: '3rem', background: 'var(--surface)', padding: '2rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Layers size={20} /> Select Season</h3>

        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          {totalSeasons.length > 0 ? totalSeasons.map(s => (
            <button
              key={s.season_number}
              onClick={() => navigate(`/tv/${id}/${s.season_number}/1`, { replace: true })}
              style={{ background: season === s.season_number ? 'var(--primary)' : 'var(--surface-light)', color: season === s.season_number ? '#fff' : 'var(--text-muted)', border: 'none', padding: '0.8rem 1.5rem', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap' }}
            >
              Season {s.season_number}
            </button>
          )) : <p>Loading seasons logic...</p>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem' }}>
          {totalEpisodes.map(ep => (
            <button
              key={ep}
              onClick={() => navigate(`/tv/${id}/${season}/${ep}`, { replace: true })}
              style={{ background: episode === ep ? 'var(--gradient-primary)' : 'var(--surface-light)', color: episode === ep ? '#fff' : 'var(--text-main)', border: episode === ep ? 'none' : '1px solid var(--border)', padding: '1rem 0.5rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', transition: 'all 0.2s' }}
            >
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{ep}</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Episode {ep}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="stream-info" style={{ marginTop: '3rem', padding: '2rem', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>{info?.name}</h3>
        <p style={{ color: '#8a8fa8' }}>{info?.overview}</p>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  ROUTING ENGINE                                              */
/* ============================================================ */
export default function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/movies" element={<HomePage />} />
            <Route path="/tv" element={<HomePage />} />
            <Route path="/anime" element={<AnimePage />} />
            <Route path="/kdrama" element={<KDramaPage />} />
            <Route path="/tamil" element={<TamilPage />} />
            <Route path="/server-hub" element={<ServerHubPage />} />
            <Route path="/search/:query" element={<SearchPage />} />
            <Route path="/movie/:id" element={<MoviePlayer />} />
            <Route path="/tv/:id" element={<TvPlayer />} />
            <Route path="/tv/:id/:season" element={<TvPlayer />} />
            <Route path="/tv/:id/:season/:episode" element={<TvPlayer />} />
          </Routes>
        </AnimatePresence>
      </main>
      <footer style={{ textAlign: 'center', padding: '3rem', borderTop: '1px solid var(--border)', marginTop: '4rem', color: 'var(--text-muted)' }}>
        <p>© 2026 <span>KFLIX Global Hub</span></p>
        <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--primary)', fontWeight: '500' }}>Created by Kishore Kumar</p>
      </footer>
    </div>
  );
}
