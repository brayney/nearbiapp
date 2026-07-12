import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import Avatar from '../components/Avatar';
import { usersApi } from '../api/resources';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      usersApi
        .search(query)
        .then(({ data }) => setResults(data.users))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-ink-line bg-ink/95 px-4 py-4 backdrop-blur">
      <h1 className="font-display text-2xl mb-4">Search</h1>
      <div className="flex items-center gap-2 bg-ink-soft border border-ink-line rounded-xl px-4 py-2.5">
        <SearchIcon size={18} className="text-slate-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people"
          className="flex-1 bg-transparent outline-none placeholder-slate-mute text-[15px]"
        />
      </div>
      </header>

      {loading && <p className="text-slate-mute text-sm">Searching...</p>}

      <div className="space-y-1">
        {results.map((u) => (
          <Link
            key={u._id}
            to={`/profile/${u.username}`}
            className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-ink-soft transition-colors"
          >
            <Avatar src={u.profilePicture?.url} alt={u.username} size="md" />
            <div>
              <p className="font-medium text-sm">{u.username}</p>
              <p className="text-slate-faint text-xs">{u.followersCount} followers</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
