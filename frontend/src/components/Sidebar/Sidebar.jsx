import { useState, useRef, useEffect } from 'react';
import {
  Plus, Search, ChevronLeft, ChevronRight, Zap, Settings,
  LayoutGrid, Workflow, Server, Cpu, Users, Puzzle,
  MessageSquare, MoreHorizontal, Pencil, Archive, Trash2, LogOut
} from 'lucide-react';
import ContextMenu from '../ContextMenu/ContextMenu';
import styles from './Sidebar.module.css';

const EXPLORER_ITEMS = [
  { icon: LayoutGrid, label: 'Artifacts' },
  { icon: Workflow, label: 'Workflows' },
  { icon: Server, label: 'MCP Servers' },
  { icon: Cpu, label: 'Skills' },
  { icon: Users, label: 'Agents' },
  { icon: Puzzle, label: 'Plugins' },
];

function groupConversations(convs) {
  const groups = { today: [], yesterday: [], week: [], older: [] };
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);

  convs.forEach(c => {
    if (c.date && groups[c.date] !== undefined) {
      groups[c.date].push(c);
      return;
    }

    const ts = c.updated_at || c.created_at;
    if (!ts) {
      groups.older.push(c);
      return;
    }

    const date = new Date(ts);
    if (isNaN(date.getTime())) {
      groups.older.push(c);
    } else if (date >= todayStart) {
      groups.today.push(c);
    } else if (date >= yesterdayStart) {
      groups.yesterday.push(c);
    } else if (date >= weekStart) {
      groups.week.push(c);
    } else {
      groups.older.push(c);
    }
  });
  return groups;
}

export default function Sidebar({
  open, onToggle, conversations, activeConvId,
  onNewChat, onSelectConv, onRenameConv, onDeleteConv, onLogout
}) {
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null); // {x,y,convId}
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const renameRef = useRef(null);

  useEffect(() => {
    if (renamingId && renameRef.current) renameRef.current.focus();
  }, [renamingId]);

  const groups = groupConversations(
    conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  function openContext(e, convId) {
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, convId });
  }

  function handleRename(id) {
    const conv = conversations.find(c => c.id === id);
    setRenameVal(conv?.title || '');
    setRenamingId(id);
    setContextMenu(null);
  }

  function commitRename(id) {
    if (renameVal.trim()) onRenameConv(id, renameVal.trim());
    setRenamingId(null);
  }

  const contextActions = contextMenu ? [
    { icon: Pencil, label: 'Rename', onClick: () => handleRename(contextMenu.convId) },
    { icon: Archive, label: 'Archive', onClick: () => { setContextMenu(null); } },
    { icon: Trash2, label: 'Delete', danger: true, onClick: () => { onDeleteConv(contextMenu.convId); setContextMenu(null); } },
  ] : [];

  const LABEL_MAP = { today: 'Today', yesterday: 'Yesterday', week: 'Last 7 Days', older: 'Older' };

  return (
    <>
      <aside className={`${styles.sidebar} ${open ? styles.open : styles.collapsed}`}>
        {/* Header */}
        <div className={styles.header}>
          {open && (
            <div className={styles.brandMark}>
              <div className={styles.brandIcon}><Zap size={16} color="#fff" strokeWidth={2.5} /></div>
              <span className={styles.brandName}>Agentic AI</span>
            </div>
          )}
          <button className={styles.collapseBtn} onClick={onToggle} aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}>
            {open ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* Primary actions */}
        <div className={styles.actions}>
          <button id="btn-new-chat" className={`${styles.newChatBtn} ${!open ? styles.iconOnly : ''}`} onClick={onNewChat}>
            <Plus size={16} strokeWidth={2.5} />
            {open && <span>New Chat</span>}
          </button>

          <div className={styles.iconBtns}>
            <button className={styles.iconBtn} title="Search" onClick={() => { setSearchOpen(v => !v); }}>
              <Search size={15} />
              {open && <span>Search</span>}
            </button>
            <button className={`${styles.iconBtn} ${explorerOpen ? styles.iconBtnActive : ''}`} title="More" onClick={() => setExplorerOpen(v => !v)}>
              <LayoutGrid size={15} />
              {open && <span>More</span>}
            </button>
          </div>
        </div>

        {/* Search bar */}
        {open && searchOpen && (
          <div className={styles.searchBar}>
            <Search size={13} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search conversations…"
              className={styles.searchInput}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Explorer panel */}
        {open && explorerOpen && (
          <div className={styles.explorer}>
            <div className={styles.explorerTitle}>
              <LayoutGrid size={12} />
              <span>Explorer</span>
            </div>
            <div className={styles.explorerGrid}>
              {EXPLORER_ITEMS.map(({ icon: Icon, label }) => (
                <button key={label} className={styles.explorerItem}>
                  <Icon size={18} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation list */}
        <nav className={styles.convList} aria-label="Conversation history">
          {Object.entries(groups).map(([group, convs]) =>
            convs.length === 0 ? null : (
              <div key={group} className={styles.convGroup}>
                {open && <div className={styles.groupLabel}>{LABEL_MAP[group]}</div>}
                {convs.map(conv => (
                  <div
                    key={conv.id}
                    className={`${styles.convItem} ${activeConvId === conv.id ? styles.convItemActive : ''}`}
                    onClick={() => onSelectConv(conv.id)}
                    title={conv.title}
                  >
                    {!open && <MessageSquare size={14} />}
                    {open && (
                      renamingId === conv.id ? (
                        <input
                          ref={renameRef}
                          className={styles.renameInput}
                          value={renameVal}
                          onChange={e => setRenameVal(e.target.value)}
                          onBlur={() => commitRename(conv.id)}
                          onKeyDown={e => { if (e.key === 'Enter') commitRename(conv.id); if (e.key === 'Escape') setRenamingId(null); }}
                          onClick={e => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <span className={styles.convTitle}>{conv.title}</span>
                          <button
                            className={styles.convMenuBtn}
                            onClick={e => openContext(e, conv.id)}
                            aria-label="Conversation options"
                          >
                            <MoreHorizontal size={13} />
                          </button>
                        </>
                      )
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </nav>

        {/* Profile strip */}
        <div className={styles.profile}>
          <div className={styles.avatar} title="You">A</div>
          {open && <span className={styles.profileName}>Agent User</span>}
          <div className={styles.profileActions}>
            <button className={styles.profileBtn} title="Settings"><Settings size={14} /></button>
            {open && (
              <button className={styles.profileBtn} title="Sign out" onClick={onLogout}><LogOut size={14} /></button>
            )}
          </div>
        </div>
      </aside>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y}
          items={contextActions}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Mobile overlay */}
      {open && <div className={styles.mobileOverlay} onClick={onToggle} />}
    </>
  );
}
