import { useEffect, useState } from 'react';
import { Trash2, Database } from 'lucide-react';
import { adminFetch } from '../api';

type BlockedUrl = { id: number; url: string };
type BlockedDomain = { id: number; domain: string };

export const ActiveDatabase = () => {
  const [urls, setUrls] = useState<BlockedUrl[]>([]);
  const [domains, setDomains] = useState<BlockedDomain[]>([]);

  const fetchData = async () => {
    return adminFetch<{ urls: BlockedUrl[]; domains: BlockedDomain[] }>('/api/admin/blocklist')
      .then((data) => {
        setUrls(data.urls);
        setDomains(data.domains);
      })
      .catch((error) => console.error('Failed to load blocklist:', error));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const deleteUrl = async (id: number) => {
    await adminFetch(`/api/admin/blocklist/urls/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const deleteDomain = async (id: number) => {
    await adminFetch(`/api/admin/blocklist/domains/${id}`, { method: 'DELETE' });
    fetchData();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* URLs */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-secondary/50 p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-phish-phish" /> Scam URLs
          </h3>
          <span className="text-xs bg-muted px-2 py-1 rounded-full font-mono">{urls.length} Active</span>
        </div>
        <div className="p-4 max-h-[600px] overflow-y-auto space-y-2">
          {urls.length === 0 ? <p className="text-muted-foreground text-sm p-4 text-center">No active URLs</p> : null}
          {urls.map(u => (
            <div key={u.id} className="flex items-center justify-between bg-background p-3 rounded border border-border text-sm shadow-sm hover:border-primary/30 transition-colors">
              <span className="font-mono truncate mr-4" title={u.url}>{u.url}</span>
              <button onClick={() => deleteUrl(u.id)} className="text-muted-foreground hover:text-phish-phish transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Domains */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-secondary/50 p-4 border-b border-border flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <Database className="w-4 h-4 text-phish-suspicious" /> Suspicious Domains
          </h3>
          <span className="text-xs bg-muted px-2 py-1 rounded-full font-mono">{domains.length} Active</span>
        </div>
        <div className="p-4 max-h-[600px] overflow-y-auto space-y-2">
          {domains.length === 0 ? <p className="text-muted-foreground text-sm p-4 text-center">No active domains</p> : null}
          {domains.map(d => (
            <div key={d.id} className="flex items-center justify-between bg-background p-3 rounded border border-border text-sm shadow-sm hover:border-primary/30 transition-colors">
              <span className="font-mono truncate mr-4">{d.domain}</span>
              <button onClick={() => deleteDomain(d.id)} className="text-muted-foreground hover:text-phish-phish transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
