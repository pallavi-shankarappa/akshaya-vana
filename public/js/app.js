// Constants
const CATS = ['Tree Plantation', 'Water Conservation', 'Waste Management', 'Renewable Energy', 'Biodiversity'];
const STATUS = ['Planned', 'Active', 'On Hold', 'Completed'];

// State Management
let state = {
    token: localStorage.getItem('t'),
    user: JSON.parse(localStorage.getItem('u') || 'null'),
    view: 'dashboard',
    projects: [],
    stats: null,
    users: [],
    loading: false,
    filters: {
        search: '',
        status: '',
        category: ''
    }
};

// DOM Utilities
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = n => Number(n).toLocaleString('en-IN');
const pct = p => Math.min(100, Math.round((p.current / p.target) * 100) || 0);

// API Service
async function api(path, method = 'GET', body) {
    const headers = {
        'Content-Type': 'application/json',
        ...(state.token && { 'Authorization': `Bearer ${state.token}` })
    };
    
    try {
        const response = await fetch(`/api${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 401 && state.token) {
            logout();
            throw new Error('Session expired. Please login again.');
        }

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        showToast(error.message, 'danger');
        throw error;
    }
}

// Authentication
function logout() {
    localStorage.clear();
    state.token = null;
    state.user = null;
    render();
}

// Toast Notifications
function showToast(message, type = 'success') {
    const container = $('#toast-container');
    const toast = document.createElement('div');
    toast.className = `toast animate-fade-in border-${type}`;
    toast.innerHTML = `
        <i data-lucide="${type === 'danger' ? 'alert-circle' : 'check-circle'}" class="text-${type}"></i>
        <span>${message}</span>
    `;
    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Routing & View Management
function navigate(view) {
    state.view = view;
    render();
}

// Components
const Sidebar = () => `
    <aside class="sidebar">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 2.5rem;">
            <div style="font-size: 1.5rem;">🌳</div>
            <h2 style="color: white; margin-bottom: 0; font-size: 1.25rem;">Akshaya Vana</h2>
        </div>
        
        <nav style="flex: 1;">
            <a onclick="navigate('dashboard')" class="nav-link ${state.view === 'dashboard' ? 'active' : ''}">
                <i data-lucide="layout-dashboard"></i> Dashboard
            </a>
            <a onclick="navigate('projects')" class="nav-link ${state.view === 'projects' ? 'active' : ''}">
                <i data-lucide="leaf"></i> Projects
            </a>
            ${state.user.role === 'admin' ? `
            <a onclick="navigate('users')" class="nav-link ${state.view === 'users' ? 'active' : ''}">
                <i data-lucide="users"></i> Team
            </a>
            ` : ''}
        </nav>

        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1.5rem;">
            <div style="margin-bottom: 1rem; padding: 0 1rem;">
                <div style="font-weight: 600; font-size: 0.9rem;">${esc(state.user.name)}</div>
                <div style="font-size: 0.75rem; color: var(--mint); opacity: 0.8; text-transform: uppercase;">${state.user.role}</div>
            </div>
            <a onclick="logout()" class="nav-link" style="color: #fda4af;">
                <i data-lucide="log-out"></i> Logout
            </a>
        </div>
    </aside>
`;

const StatCard = (label, value, icon, colorClass) => `
    <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <p style="color: var(--text-muted); font-size: 0.875rem; font-weight: 500;">${label}</p>
                <h3 style="font-size: 1.75rem; margin: 0.25rem 0;">${value}</h3>
            </div>
            <div style="padding: 0.5rem; border-radius: 0.5rem; background: var(--mint); color: var(--forest-green);">
                <i data-lucide="${icon}"></i>
            </div>
        </div>
    </div>
`;

// Views
async function renderDashboard() {
    const main = $('#main-content');
    main.innerHTML = '<div class="animate-pulse">Loading dashboard statistics...</div>';
    
    try {
        const stats = await api('/stats');
        state.stats = stats;
        
        main.innerHTML = `
            <div class="animate-fade-in">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                    <h1>Environmental Impact Dashboard</h1>
                    ${stats.db !== 'Connected' ? '<span class="tag tag-on-hold">⚠️ Database Offline</span>' : ''}
                </div>

                <div class="grid grid-cols-4" style="margin-bottom: 2rem;">
                    ${StatCard('Total Projects', stats.total, 'folder', 'primary')}
                    ${StatCard('Active Now', stats.active, 'activity', 'success')}
                    ${StatCard('Completed', stats.completed, 'check-circle', 'info')}
                    ${StatCard('Avg. Progress', `${stats.avgProgress}%`, 'trending-up', 'warning')}
                </div>

                <div class="grid grid-cols-2">
                    <div class="card">
                        <h3>Project Status Distribution</h3>
                        <div style="height: 300px; display: flex; align-items: center; justify-content: center;">
                            <canvas id="statusChart"></canvas>
                        </div>
                    </div>
                    <div class="card">
                        <h3>Progress by Category (%)</h3>
                        <div style="height: 300px; display: flex; align-items: center; justify-content: center;">
                            <canvas id="categoryChart"></canvas>
                        </div>
                    </div>
                    <div class="card">
                        <h3>Regional Project Density</h3>
                        <div style="height: 300px; display: flex; align-items: center; justify-content: center;">
                            <canvas id="locationChart"></canvas>
                        </div>
                    </div>
                    <div class="card">
                        <h3>Recent Environmental Activity</h3>
                        <div style="margin-top: 1rem;">
                            ${stats.recent.length ? stats.recent.map(h => `
                                <div style="padding: 0.75rem 0; border-bottom: 1px solid var(--border); display: flex; gap: 1rem; align-items: flex-start;">
                                    <div style="background: var(--mint); padding: 0.5rem; border-radius: 50%;">
                                        <i data-lucide="arrow-up-right" style="width: 16px; height: 16px; color: var(--forest-green);"></i>
                                    </div>
                                    <div>
                                        <div style="font-weight: 600; font-size: 0.95rem;">${esc(h.project)}</div>
                                        <div style="font-size: 0.85rem; color: var(--text-muted);">
                                            ${fmt(h.from)} → <b>${fmt(h.to)}</b> ${esc(h.unit)} by ${esc(h.by)}
                                        </div>
                                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                                            ${new Date(h.at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                        </div>
                                    </div>
                                </div>
                            `).join('') : '<div class="empty">No recent activity found.</div>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        renderCharts(stats);
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        main.innerHTML = `<div class="card" style="border-color: var(--danger);">Error loading dashboard: ${error.message}</div>`;
    }
}

function renderCharts(s) {
    const colors = ['#1f6f43', '#3a9c68', '#10b981', '#f59e0b', '#3b82f6'];
    
    new Chart($('#statusChart'), {
        type: 'doughnut',
        data: {
            labels: s.byStatus.map(x => x.name),
            datasets: [{ data: s.byStatus.map(x => x.count), backgroundColor: colors }]
        },
        options: { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false }
    });

    new Chart($('#categoryChart'), {
        type: 'bar',
        data: {
            labels: s.byCategory.map(x => x.name),
            datasets: [{ 
                label: 'Progress %',
                data: s.byCategory.map(x => x.progress), 
                backgroundColor: '#1f6f43',
                borderRadius: 8
            }]
        },
        options: { 
            plugins: { legend: { display: false } }, 
            scales: { y: { max: 100, beginAtZero: true } },
            maintainAspectRatio: false 
        }
    });

    new Chart($('#locationChart'), {
        type: 'bar',
        data: {
            labels: s.byLocation.map(x => x.name),
            datasets: [{ 
                data: s.byLocation.map(x => x.count), 
                backgroundColor: '#3a9c68',
                borderRadius: 8
            }]
        },
        options: { 
            indexAxis: 'y', 
            plugins: { legend: { display: false } },
            maintainAspectRatio: false 
        }
    });
}

async function renderProjects() {
    const main = $('#main-content');
    main.innerHTML = `
        <div class="animate-fade-in">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h1>Environmental Projects</h1>
                ${state.user.role !== 'viewer' ? `
                    <button class="btn btn-primary" onclick="openProjectModal()">
                        <i data-lucide="plus"></i> New Project
                    </button>
                ` : ''}
            </div>

            <div class="card" style="margin-bottom: 2rem; padding: 1rem;">
                <div class="grid grid-cols-3" style="gap: 1rem;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <input type="text" id="search-input" placeholder="Search projects by name..." value="${state.filters.search}">
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <select id="status-filter">
                            <option value="">All Statuses</option>
                            ${STATUS.map(s => `<option value="${s}" ${state.filters.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <select id="category-filter">
                            <option value="">All Categories</option>
                            ${CATS.map(c => `<option value="${c}" ${state.filters.category === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <div id="projects-grid" class="grid grid-cols-3">
                <div class="animate-pulse col-span-3">Loading projects...</div>
            </div>
        </div>
    `;

    // Event Listeners for filters
    $('#search-input').addEventListener('input', (e) => {
        state.filters.search = e.target.value;
        debounce(fetchProjects, 300)();
    });
    $('#status-filter').addEventListener('change', (e) => {
        state.filters.status = e.target.value;
        fetchProjects();
    });
    $('#category-filter').addEventListener('change', (e) => {
        state.filters.category = e.target.value;
        fetchProjects();
    });

    fetchProjects();
    if (window.lucide) window.lucide.createIcons();
}

async function fetchProjects() {
    const grid = $('#projects-grid');
    try {
        const query = new URLSearchParams(state.filters).toString();
        const projects = await api(`/projects?${query}`);
        state.projects = projects;
        
        grid.innerHTML = projects.length ? projects.map(p => `
            <div class="card animate-fade-in" style="display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <span class="tag tag-${p.status.toLowerCase().replace(' ', '-')}">${p.status}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 500;">${p.category}</span>
                </div>
                <h3 style="margin-bottom: 0.5rem; cursor: pointer;" onclick="viewProjectDetails('${p._id}')">${esc(p.name)}</h3>
                <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem; flex: 1;">
                    ${esc(p.description.substring(0, 100))}${p.description.length > 100 ? '...' : ''}
                </p>
                
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.5rem;">
                        <span>Progress: <b>${fmt(p.current)}</b> / ${fmt(p.target)} ${esc(p.unit)}</span>
                        <span style="font-weight: 600; color: var(--forest-green);">${pct(p)}%</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar" style="width: ${pct(p)}%"></div>
                    </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 1rem; border-top: 1px solid var(--border);">
                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                        <i data-lucide="user" style="width: 12px; height: 12px; display: inline; vertical-align: middle;"></i> ${esc(p.ownerName)}
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        ${canEdit(p) ? `
                            <button class="btn btn-secondary btn-sm" style="padding: 0.4rem;" onclick="openProjectModal('${p._id}')" title="Edit">
                                <i data-lucide="edit-2" style="width: 16px; height: 16px;"></i>
                            </button>
                            <button class="btn btn-secondary btn-sm" style="padding: 0.4rem; color: var(--danger);" onclick="deleteProject('${p._id}')" title="Delete">
                                <i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-secondary btn-sm" style="padding: 0.4rem;" onclick="viewProjectDetails('${p._id}')" title="View Details">
                            <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('') : '<div class="col-span-3 empty">No projects found matching your filters.</div>';
        
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        grid.innerHTML = `<div class="col-span-3 card" style="border-color: var(--danger);">Failed to load projects.</div>`;
    }
}

async function viewProjectDetails(id) {
    try {
        const p = state.projects.find(x => x._id === id);
        if (!p) return;

        const main = $('#main-content');
        main.innerHTML = `
            <div class="animate-fade-in">
                <div style="margin-bottom: 2rem; display: flex; align-items: center; gap: 1rem;">
                    <button class="btn btn-secondary btn-sm" onclick="navigate('projects')">
                        <i data-lucide="arrow-left"></i> Back
                    </button>
                    <h1>Project Details</h1>
                </div>

                <div class="grid grid-cols-3">
                    <div class="card col-span-2">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem;">
                            <div>
                                <h2 style="margin-bottom: 0.25rem;">${esc(p.name)}</h2>
                                <p style="color: var(--text-muted);"><i data-lucide="map-pin" style="width: 14px; height: 14px; display: inline;"></i> ${esc(p.location)}</p>
                            </div>
                            <span class="tag tag-${p.status.toLowerCase().replace(' ', '-')}">${p.status}</span>
                        </div>

                        <div style="margin-bottom: 2rem;">
                            <label>Environmental Impact Progress</label>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-weight: 600;">
                                <span>${fmt(p.current)} / ${fmt(p.target)} ${esc(p.unit)}</span>
                                <span style="color: var(--forest-green);">${pct(p)}%</span>
                            </div>
                            <div class="progress-container" style="height: 16px;">
                                <div class="progress-bar" style="width: ${pct(p)}%"></div>
                            </div>
                            <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem;">
                                ${fmt(p.target - p.current)} ${esc(p.unit)} remaining to reach the goal.
                            </p>
                        </div>

                        <div style="margin-bottom: 2rem;">
                            <h3>Description</h3>
                            <p style="white-space: pre-wrap;">${esc(p.description)}</p>
                        </div>

                        <div class="grid grid-cols-2" style="background: var(--bg-light); padding: 1.5rem; border-radius: 0.75rem;">
                            <div>
                                <label>Project Manager</label>
                                <p><b>${esc(p.ownerName)}</b></p>
                            </div>
                            <div>
                                <label>Category</label>
                                <p><b>${esc(p.category)}</b></p>
                            </div>
                            <div style="margin-top: 1rem;">
                                <label>Start Date</label>
                                <p><b>${p.startDate ? new Date(p.startDate).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Not set'}</b></p>
                            </div>
                            <div style="margin-top: 1rem;">
                                <label>Target Completion</label>
                                <p><b>${p.endDate ? new Date(p.endDate).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'Not set'}</b></p>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <h3>Progress History</h3>
                        <div style="margin-top: 1.5rem;">
                            ${p.history && p.history.length ? p.history.slice().reverse().map(h => `
                                <div style="padding: 1rem 0; border-bottom: 1px solid var(--border);">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                                        <span style="font-weight: 600;">${fmt(h.from)} → ${fmt(h.to)}</span>
                                        <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(h.at).toLocaleDateString()}</span>
                                    </div>
                                    <div style="font-size: 0.85rem; color: var(--text-muted);">Updated by ${esc(h.by)}</div>
                                </div>
                            `).join('') : '<div class="empty">No updates recorded yet.</div>'}
                        </div>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        showToast(error.message, 'danger');
    }
}

function openProjectModal(id) {
    const p = id ? state.projects.find(x => x._id === id) : {
        name: '', location: '', category: CATS[0], status: 'Planned',
        target: 100, current: 0, unit: 'trees', description: '',
        startDate: '', endDate: ''
    };

    const modal = document.createElement('div');
    modal.className = 'modal auth-layout';
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.zIndex = '1000';
    modal.style.background = 'rgba(0,0,0,0.5)';

    modal.innerHTML = `
        <div class="auth-card animate-fade-in" style="max-width: 600px; max-height: 90vh; overflow-y: auto;">
            <h2>${id ? 'Edit' : 'New'} Project</h2>
            <form id="project-form">
                <div class="form-group">
                    <label>Project Name</label>
                    <input type="text" id="m-name" value="${esc(p.name)}" required placeholder="e.g. Western Ghats Reforestation">
                </div>
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" id="m-location" value="${esc(p.location)}" required placeholder="e.g. Coorg, Karnataka">
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label>Category</label>
                        <select id="m-category">
                            ${CATS.map(c => `<option value="${c}" ${c === p.category ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="m-status">
                            ${STATUS.map(s => `<option value="${s}" ${s === p.status ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="grid grid-cols-3">
                    <div class="form-group">
                        <label>Target</label>
                        <input type="number" id="m-target" value="${p.target}" min="1" required>
                    </div>
                    <div class="form-group">
                        <label>Current Progress</label>
                        <input type="number" id="m-current" value="${p.current}" min="0" required>
                    </div>
                    <div class="form-group">
                        <label>Unit</label>
                        <input type="text" id="m-unit" value="${esc(p.unit)}" placeholder="trees, kW, etc.">
                    </div>
                </div>
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label>Start Date</label>
                        <input type="date" id="m-startDate" value="${p.startDate ? p.startDate.split('T')[0] : ''}">
                    </div>
                    <div class="form-group">
                        <label>End Date</label>
                        <input type="date" id="m-endDate" value="${p.endDate ? p.endDate.split('T')[0] : ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="m-description" rows="3" placeholder="Describe the environmental impact and goals...">${esc(p.description)}</textarea>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button type="submit" class="btn btn-primary" style="flex: 1;">Save Project</button>
                    <button type="button" class="btn btn-secondary" style="flex: 1;" onclick="this.closest('.modal').remove()">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();

    $('#project-form').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            name: $('#m-name').value,
            location: $('#m-location').value,
            category: $('#m-category').value,
            status: $('#m-status').value,
            target: Number($('#m-target').value),
            current: Number($('#m-current').value),
            unit: $('#m-unit').value,
            description: $('#m-description').value,
            startDate: $('#m-startDate').value,
            endDate: $('#m-endDate').value
        };

        try {
            await api(id ? `/projects/${id}` : '/projects', id ? 'PUT' : 'POST', payload);
            modal.remove();
            showToast(id ? 'Project updated successfully' : 'Project created successfully');
            fetchProjects();
        } catch (error) {
            // Error toast handled by api()
        }
    };
}

async function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    try {
        await api(`/projects/${id}`, 'DELETE');
        showToast('Project deleted successfully');
        fetchProjects();
    } catch (error) {
        // Error toast handled by api()
    }
}

async function renderUsers() {
    const main = $('#main-content');
    main.innerHTML = '<div class="animate-pulse">Loading team members...</div>';
    
    try {
        const users = await api('/users');
        state.users = users;
        
        main.innerHTML = `
            <div class="animate-fade-in">
                <h1>Team Management</h1>
                <div class="card">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="text-align: left; border-bottom: 2px solid var(--border);">
                                <th style="padding: 1rem;">Member</th>
                                <th style="padding: 1rem;">Email</th>
                                <th style="padding: 1rem;">Role</th>
                                <th style="padding: 1rem; text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${users.map(u => `
                                <tr style="border-bottom: 1px solid var(--border);">
                                    <td style="padding: 1rem;">
                                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                                            <div style="width: 32px; height: 32px; border-radius: 50%; background: var(--mint); color: var(--forest-green); display: flex; align-items: center; justify-content: center; font-weight: 600;">
                                                ${u.name.charAt(0)}
                                            </div>
                                            <b>${esc(u.name)}</b>
                                        </div>
                                    </td>
                                    <td style="padding: 1rem; color: var(--text-muted);">${esc(u.email)}</td>
                                    <td style="padding: 1rem;">
                                        ${u._id === state.user.id ? `
                                            <span class="tag tag-active">${u.role} (You)</span>
                                        ` : `
                                            <select onchange="updateUserRole('${u._id}', this.value)" style="width: auto; padding: 0.25rem 0.5rem;">
                                                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                                                <option value="manager" ${u.role === 'manager' ? 'selected' : ''}>Manager</option>
                                                <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>Viewer</option>
                                            </select>
                                        `}
                                    </td>
                                    <td style="padding: 1rem; text-align: right;">
                                        ${u._id !== state.user.id ? `
                                            <button class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="deleteUser('${u._id}')">
                                                <i data-lucide="user-minus" style="width: 16px; height: 16px;"></i>
                                            </button>
                                        ` : ''}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        main.innerHTML = `<div class="card" style="border-color: var(--danger);">Failed to load team: ${error.message}</div>`;
    }
}

async function updateUserRole(id, role) {
    try {
        await api(`/users/${id}/role`, 'PUT', { role });
        showToast('User role updated');
        renderUsers();
    } catch (error) {
        // Error toast handled by api()
    }
}

async function deleteUser(id) {
    if (!confirm('Remove this user from the team?')) return;
    try {
        await api(`/users/${id}`, 'DELETE');
        showToast('User removed');
        renderUsers();
    } catch (error) {
        // Error toast handled by api()
    }
}

function canEdit(p) {
    return state.user.role === 'admin' || (state.user.role === 'manager' && p.owner === state.user.id);
}

// Auth View
function renderAuth() {
    const isRegister = state.view === 'register';
    $('#app').innerHTML = `
        <div class="auth-layout">
            <div class="auth-card animate-fade-in">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <div style="font-size: 3rem; margin-bottom: 0.5rem;">🌳</div>
                    <h1 style="margin-bottom: 0.25rem;">Akshaya Vana</h1>
                    <p style="color: var(--text-muted);">${isRegister ? 'Join our sustainability initiative' : 'Project tracker for a greener planet'}</p>
                </div>
                
                <form id="auth-form">
                    ${isRegister ? `
                        <div class="form-group">
                            <label>Full Name</label>
                            <input type="text" id="auth-name" required placeholder="John Doe">
                        </div>
                    ` : ''}
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="auth-email" required placeholder="name@company.com">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <div style="position: relative;">
                            <input type="password" id="auth-password" required minlength="6" placeholder="••••••••">
                            <button type="button" onclick="togglePasswordVisibility()" style="position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted);">
                                <i data-lucide="eye" style="width: 18px; height: 18px;"></i>
                            </button>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary" style="width: 100%; margin-top: 1rem;">
                        ${isRegister ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div style="margin-top: 1.5rem; text-align: center; font-size: 0.9rem;">
                    <span style="color: var(--text-muted);">${isRegister ? 'Already have an account?' : 'New to Akshaya Vana?'}</span>
                    <a href="#" onclick="navigate('${isRegister ? 'login' : 'register'}')" style="color: var(--forest-green); font-weight: 600; text-decoration: none; margin-left: 0.25rem;">
                        ${isRegister ? 'Sign In' : 'Create one now'}
                    </a>
                </div>

                <div style="margin-top: 2rem; padding: 1rem; background: var(--mint); border-radius: 0.75rem; font-size: 0.8rem;">
                    <div style="font-weight: 600; color: var(--dark-green); margin-bottom: 0.5rem;">Demo Credentials</div>
                    <div style="color: var(--forest-green);">Email: <code>admin@akshayavana.com</code></div>
                    <div style="color: var(--forest-green);">Pass: <code>Password@123</code></div>
                </div>
            </div>
        </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();

    $('#auth-form').onsubmit = async (e) => {
        e.preventDefault();
        const payload = {
            email: $('#auth-email').value,
            password: $('#auth-password').value,
            ...(isRegister && { name: $('#auth-name').value })
        };
        
        try {
            const data = await api(isRegister ? '/auth/register' : '/auth/login', 'POST', payload);
            state.token = data.token;
            state.user = data.user;
            localStorage.setItem('t', data.token);
            localStorage.setItem('u', JSON.stringify(data.user));
            state.view = 'dashboard';
            render();
            showToast(`Welcome back, ${data.user.name}!`);
        } catch (error) {
            // Error toast handled by api()
        }
    };
}

function togglePasswordVisibility() {
    const input = $('#auth-password');
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Main Render Function
function render() {
    if (!state.token) {
        if (state.view !== 'register') state.view = 'login';
        renderAuth();
        return;
    }

    $('#app').innerHTML = `
        <div class="app-container">
            ${Sidebar()}
            <main class="main-content" id="main-content"></main>
        </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();

    switch (state.view) {
        case 'dashboard': renderDashboard(); break;
        case 'projects': renderProjects(); break;
        case 'users': renderUsers(); break;
        default: renderDashboard();
    }
}

// Helper: Debounce
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    render();
});
