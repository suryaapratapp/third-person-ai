import { useEffect, useMemo, useState } from 'react'
import { RefreshCcw, Search, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import {
  createAdminUser,
  deleteAdminUploadSession,
  deleteAdminUser,
  listAdminUploadSessions,
  listAdminUsers,
  updateAdminUploadSession,
  updateAdminUser,
} from '../services/adminServiceApi'

const defaultUserForm = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  phone: '',
  dob: '',
}

export default function AdminPage() {
  const [tab, setTab] = useState('users')

  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(1)
  const [usersData, setUsersData] = useState({ items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [userForm, setUserForm] = useState(defaultUserForm)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [editingUserId, setEditingUserId] = useState('')
  const [editingUserDraft, setEditingUserDraft] = useState({})

  const [sessionSearch, setSessionSearch] = useState('')
  const [sessionStatus, setSessionStatus] = useState('')
  const [sessionPage, setSessionPage] = useState(1)
  const [sessionsData, setSessionsData] = useState({ items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState('')

  const isUnauthorized = useMemo(() => {
    const userStatus = usersError.toLowerCase().includes('admin access required')
    const sessionStatusMsg = sessionsError.toLowerCase().includes('admin access required')
    return userStatus || sessionStatusMsg
  }, [usersError, sessionsError])

  const loadUsers = async () => {
    setUsersLoading(true)
    setUsersError('')
    try {
      const response = await listAdminUsers({ search: userSearch, page: userPage, pageSize: 20 })
      setUsersData(response)
    } catch (error) {
      setUsersError(error?.error?.message || 'Unable to load users.')
      setUsersData({ items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
    } finally {
      setUsersLoading(false)
    }
  }

  const loadSessions = async () => {
    setSessionsLoading(true)
    setSessionsError('')
    try {
      const response = await listAdminUploadSessions({
        search: sessionSearch,
        status: sessionStatus,
        page: sessionPage,
        pageSize: 20,
      })
      setSessionsData(response)
    } catch (error) {
      setSessionsError(error?.error?.message || 'Unable to load upload sessions.')
      setSessionsData({ items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } })
    } finally {
      setSessionsLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [userSearch, userPage])

  useEffect(() => {
    void loadSessions()
  }, [sessionSearch, sessionStatus, sessionPage])

  const onCreateUser = async (event) => {
    event.preventDefault()
    setUsersError('')
    setIsCreatingUser(true)

    try {
      await createAdminUser({
        email: userForm.email.trim(),
        firstName: userForm.firstName.trim(),
        lastName: userForm.lastName.trim(),
        phone: userForm.phone.trim() || null,
        dob: userForm.dob || null,
        password: userForm.password || null,
      })
      setUserForm(defaultUserForm)
      await loadUsers()
    } catch (error) {
      setUsersError(error?.error?.message || 'Unable to create user.')
    } finally {
      setIsCreatingUser(false)
    }
  }

  const startEditUser = (user) => {
    setEditingUserId(user.id)
    setEditingUserDraft({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      emailVerified: Boolean(user.emailVerified),
      phoneVerified: Boolean(user.phoneVerified),
    })
  }

  const saveEditUser = async () => {
    if (!editingUserId) return
    setUsersError('')
    try {
      await updateAdminUser(editingUserId, {
        firstName: editingUserDraft.firstName || null,
        lastName: editingUserDraft.lastName || null,
        phone: editingUserDraft.phone || null,
        emailVerified: Boolean(editingUserDraft.emailVerified),
        phoneVerified: Boolean(editingUserDraft.phoneVerified),
      })
      setEditingUserId('')
      setEditingUserDraft({})
      await loadUsers()
    } catch (error) {
      setUsersError(error?.error?.message || 'Unable to update user.')
    }
  }

  const onDeleteUser = async (id) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return
    setUsersError('')
    try {
      await deleteAdminUser(id)
      await loadUsers()
    } catch (error) {
      setUsersError(error?.error?.message || 'Unable to delete user.')
    }
  }

  const onUpdateSession = async (session, patch) => {
    setSessionsError('')
    try {
      await updateAdminUploadSession(session.id, patch)
      await loadSessions()
    } catch (error) {
      setSessionsError(error?.error?.message || 'Unable to update upload session.')
    }
  }

  const onDeleteSession = async (id) => {
    if (!window.confirm('Delete this upload session?')) return
    setSessionsError('')
    try {
      await deleteAdminUploadSession(id)
      await loadSessions()
    } catch (error) {
      setSessionsError(error?.error?.message || 'Unable to delete upload session.')
    }
  }

  return (
    <main className="px-4 pb-14 pt-8 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl space-y-4">
        <GlassCard className="border-white/15 bg-slate-950/45 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100/80">Admin</p>
              <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">Admin Console</h1>
              <p className="mt-2 text-sm text-slate-100/80">Manage users and upload sessions with search, pagination, and CRUD operations.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadUsers()
                void loadSessions()
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:bg-white/15"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          <div className="mt-4 inline-flex rounded-xl border border-white/15 bg-slate-950/70 p-1">
            <button
              type="button"
              onClick={() => setTab('users')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === 'users' ? 'bg-white text-indigo-700' : 'text-slate-100/85 hover:bg-white/10'}`}
            >
              Users
            </button>
            <button
              type="button"
              onClick={() => setTab('sessions')}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === 'sessions' ? 'bg-white text-indigo-700' : 'text-slate-100/85 hover:bg-white/10'}`}
            >
              Upload Sessions
            </button>
          </div>
        </GlassCard>

        {isUnauthorized ? (
          <GlassCard className="border-rose-200/30 bg-rose-300/10 p-5">
            <p className="text-sm text-rose-100">Admin access required. Add your email to `ADMIN_EMAILS` on API and `VITE_ADMIN_EMAILS` on frontend.</p>
          </GlassCard>
        ) : null}

        {tab === 'users' ? (
          <>
            <GlassCard className="border-white/15 bg-slate-950/45 p-5">
              <form onSubmit={onCreateUser} className="space-y-3">
                <p className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                  <UserPlus className="h-4 w-4" />
                  Add user
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    value={userForm.email}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="Email"
                    className="h-10 rounded-lg border border-white/15 bg-slate-900/65 px-3 text-sm text-white outline-none"
                  />
                  <input
                    value={userForm.firstName}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, firstName: event.target.value }))}
                    placeholder="First name"
                    className="h-10 rounded-lg border border-white/15 bg-slate-900/65 px-3 text-sm text-white outline-none"
                  />
                  <input
                    value={userForm.lastName}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, lastName: event.target.value }))}
                    placeholder="Last name"
                    className="h-10 rounded-lg border border-white/15 bg-slate-900/65 px-3 text-sm text-white outline-none"
                  />
                  <input
                    value={userForm.phone}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="Phone (optional)"
                    className="h-10 rounded-lg border border-white/15 bg-slate-900/65 px-3 text-sm text-white outline-none"
                  />
                  <input
                    type="date"
                    value={userForm.dob}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, dob: event.target.value }))}
                    className="h-10 rounded-lg border border-white/15 bg-slate-900/65 px-3 text-sm text-white outline-none"
                  />
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="Password (optional)"
                    className="h-10 rounded-lg border border-white/15 bg-slate-900/65 px-3 text-sm text-white outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingUser}
                  className="rounded-lg border border-cyan-200/35 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
                >
                  {isCreatingUser ? 'Creating...' : 'Create user'}
                </button>
              </form>
              {usersError ? <p className="mt-2 text-xs text-rose-200">{usersError}</p> : null}
            </GlassCard>

            <GlassCard className="border-white/15 bg-slate-950/45 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-white/15 bg-slate-900/65 px-3">
                  <Search className="h-4 w-4 text-slate-100/60" />
                  <input
                    value={userSearch}
                    onChange={(event) => {
                      setUserPage(1)
                      setUserSearch(event.target.value)
                    }}
                    placeholder="Search users"
                    className="w-full bg-transparent text-sm text-white outline-none"
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {usersLoading ? <p className="text-sm text-slate-100/80">Loading users...</p> : null}
                {!usersLoading && !usersData.items.length ? <p className="text-sm text-slate-100/80">No users found.</p> : null}
                {usersData.items.map((user) => (
                  <div key={user.id} className="rounded-xl border border-white/15 bg-slate-900/55 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{user.email}</p>
                        <p className="text-xs text-slate-100/70">{user.firstName || '-'} {user.lastName || ''} · {new Date(user.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] ${user.emailVerified ? 'border-emerald-200/30 bg-emerald-300/10 text-emerald-100' : 'border-amber-200/30 bg-amber-300/10 text-amber-100'}`}>{user.emailVerified ? 'Email verified' : 'Email pending'}</span>
                        <button
                          type="button"
                          onClick={() => startEditUser(user)}
                          className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void onDeleteUser(user.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200/30 bg-rose-300/10 px-2 py-1 text-[11px] text-rose-100"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    </div>

                    {editingUserId === user.id ? (
                      <div className="mt-3 grid gap-2 md:grid-cols-3">
                        <input
                          value={editingUserDraft.firstName || ''}
                          onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, firstName: event.target.value }))}
                          placeholder="First name"
                          className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-xs text-white outline-none"
                        />
                        <input
                          value={editingUserDraft.lastName || ''}
                          onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, lastName: event.target.value }))}
                          placeholder="Last name"
                          className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-xs text-white outline-none"
                        />
                        <input
                          value={editingUserDraft.phone || ''}
                          onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, phone: event.target.value }))}
                          placeholder="Phone"
                          className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-xs text-white outline-none"
                        />
                        <label className="inline-flex items-center gap-2 text-xs text-slate-100/85">
                          <input
                            type="checkbox"
                            checked={Boolean(editingUserDraft.emailVerified)}
                            onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, emailVerified: event.target.checked }))}
                          />
                          Email verified
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs text-slate-100/85">
                          <input
                            type="checkbox"
                            checked={Boolean(editingUserDraft.phoneVerified)}
                            onChange={(event) => setEditingUserDraft((prev) => ({ ...prev, phoneVerified: event.target.checked }))}
                          />
                          Phone verified
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void saveEditUser()}
                            className="rounded-lg border border-cyan-200/35 bg-cyan-300/10 px-2 py-1 text-[11px] font-semibold text-cyan-100"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUserId('')
                              setEditingUserDraft({})
                            }}
                            className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-[11px] text-slate-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-100/75">
                <p>
                  Page {usersData.pagination.page} of {Math.max(usersData.pagination.totalPages, 1)} · {usersData.pagination.total} users
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={usersData.pagination.page <= 1}
                    onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                    className="rounded border border-white/20 bg-white/5 px-2 py-1 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    disabled={usersData.pagination.totalPages > 0 && usersData.pagination.page >= usersData.pagination.totalPages}
                    onClick={() => setUserPage((prev) => prev + 1)}
                    className="rounded border border-white/20 bg-white/5 px-2 py-1 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </GlassCard>
          </>
        ) : (
          <GlassCard className="border-white/15 bg-slate-950/45 p-5">
            <div className="grid gap-2 md:grid-cols-3">
              <div className="flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-slate-900/65 px-3 md:col-span-2">
                <Search className="h-4 w-4 text-slate-100/60" />
                <input
                  value={sessionSearch}
                  onChange={(event) => {
                    setSessionPage(1)
                    setSessionSearch(event.target.value)
                  }}
                  placeholder="Search by source app or user email"
                  className="w-full bg-transparent text-sm text-white outline-none"
                />
              </div>
              <select
                value={sessionStatus}
                onChange={(event) => {
                  setSessionPage(1)
                  setSessionStatus(event.target.value)
                }}
                className="h-10 rounded-lg border border-white/15 bg-slate-900/65 px-3 text-sm text-white outline-none"
              >
                <option value="">All statuses</option>
                <option value="READY">READY</option>
                <option value="ANALYZING">ANALYZING</option>
                <option value="FAILED">FAILED</option>
                <option value="PARSED">PARSED</option>
              </select>
            </div>

            {sessionsError ? <p className="mt-2 text-xs text-rose-200">{sessionsError}</p> : null}

            <div className="mt-4 space-y-2">
              {sessionsLoading ? <p className="text-sm text-slate-100/80">Loading upload sessions...</p> : null}
              {!sessionsLoading && !sessionsData.items.length ? <p className="text-sm text-slate-100/80">No upload sessions found.</p> : null}
              {sessionsData.items.map((session) => (
                <div key={session.id} className="rounded-xl border border-white/15 bg-slate-900/55 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{session.sourceApp} · {session.status}</p>
                      <p className="text-xs text-slate-100/70">{session.userEmail} · {new Date(session.createdAt).toLocaleString()}</p>
                      <p className="text-xs text-slate-100/70">Messages: {session.messageCount} · Files: {session.fileCount}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={session.status}
                        onChange={(event) => void onUpdateSession(session, { status: event.target.value })}
                        className="h-8 rounded-lg border border-white/15 bg-slate-950/70 px-2 text-xs text-white outline-none"
                      >
                        <option value="READY">READY</option>
                        <option value="PARSED">PARSED</option>
                        <option value="ANALYZING">ANALYZING</option>
                        <option value="FAILED">FAILED</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => void onDeleteSession(session.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200/30 bg-rose-300/10 px-2 py-1 text-[11px] text-rose-100"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-100/75">
              <p>
                Page {sessionsData.pagination.page} of {Math.max(sessionsData.pagination.totalPages, 1)} · {sessionsData.pagination.total} sessions
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={sessionsData.pagination.page <= 1}
                  onClick={() => setSessionPage((prev) => Math.max(1, prev - 1))}
                  className="rounded border border-white/20 bg-white/5 px-2 py-1 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={sessionsData.pagination.totalPages > 0 && sessionsData.pagination.page >= sessionsData.pagination.totalPages}
                  onClick={() => setSessionPage((prev) => prev + 1)}
                  className="rounded border border-white/20 bg-white/5 px-2 py-1 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </GlassCard>
        )}

        <GlassCard className="border-white/15 bg-slate-950/40 p-4">
          <p className="inline-flex items-center gap-1 text-xs text-slate-100/75">
            <ShieldCheck className="h-3.5 w-3.5" />
            Admin operations are restricted by `ADMIN_EMAILS`/`ADMIN_IDS` on API.
          </p>
        </GlassCard>
      </section>
    </main>
  )
}
