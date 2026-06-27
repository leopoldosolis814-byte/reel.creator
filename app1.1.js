class ProjectManager {
    constructor() {
        this.projects = [];
        this.currentProject = null;
        this.albumItems = [];
        this.config = { autoSave: false, darkMode: false };
        this.loadData();
        this.initEventListeners();
        this.renderAll();
    }

    loadData() {
        const savedProjects = localStorage.getItem('projects');
        if (savedProjects) this.projects = JSON.parse(savedProjects);
        const savedAlbum = localStorage.getItem('album');
        if (savedAlbum) this.albumItems = JSON.parse(savedAlbum);
        const savedConfig = localStorage.getItem('config');
        if (savedConfig) this.config = JSON.parse(savedConfig);
        if (this.config.darkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('darkMode').checked = true;
        }
        if (this.config.autoSave) document.getElementById('autoSave').checked = true;
    }

    saveData() {
        localStorage.setItem('projects', JSON.stringify(this.projects));
        localStorage.setItem('album', JSON.stringify(this.albumItems));
        localStorage.setItem('config', JSON.stringify(this.config));
        this.updateStats();
    }

    createProject(name, client, date, status = 'activo') {
        const project = {
            id: Date.now().toString(),
            name: name || 'Proyecto sin nombre',
            client: client || 'Sin cliente',
            date: date || new Date().toISOString().split('T')[0],
            status: status,
            createdAt: new Date().toISOString(),
            content: { idea: '', script: '', prompt: '', copy: '', hashtags: '', comments: '' },
            images: [],
            videos: []
        };
        this.projects.push(project);
        this.currentProject = project.id;
        this.saveData();
        this.renderAll();
        this.populateProjectSelector();
        return project;
    }

    getProject(id) { return this.projects.find(p => p.id === id); }

    updateProject(id, updates) {
        const project = this.getProject(id);
        if (project) {
            Object.assign(project, updates);
            this.saveData();
            this.renderAll();
        }
    }

    deleteProject(id) {
        this.projects = this.projects.filter(p => p.id !== id);
        if (this.currentProject === id) {
            this.currentProject = this.projects.length > 0 ? this.projects[0].id : null;
        }
        this.saveData();
        this.renderAll();
        this.populateProjectSelector();
    }

    saveContent(projectId, content) {
        const project = this.getProject(projectId);
        if (project) {
            project.content = { ...project.content, ...content };
            this.saveData();
        }
    }

    getContent(projectId) {
        const project = this.getProject(projectId);
        return project ? project.content : null;
    }

    addImage(data) {
        const item = { id: Date.now().toString(), type: 'image', data: data, timestamp: new Date().toISOString() };
        this.albumItems.push(item);
        this.saveData();
        this.renderAlbum();
        this.updateStats();
        return item;
    }

    addVideo(data) {
        const item = { id: Date.now().toString(), type: 'video', data: data, timestamp: new Date().toISOString() };
        this.albumItems.push(item);
        this.saveData();
        this.renderAlbum();
        this.updateStats();
        return item;
    }

    deleteAlbumItem(id) {
        this.albumItems = this.albumItems.filter(item => item.id !== id);
        this.saveData();
        this.renderAlbum();
        this.updateStats();
    }

    reorderAlbumItems(fromIndex, toIndex) {
        const [removed] = this.albumItems.splice(fromIndex, 1);
        this.albumItems.splice(toIndex, 0, removed);
        this.saveData();
        this.renderAlbum();
    }

    exportProject(id) {
        const project = this.getProject(id);
        if (!project) return;
        const data = { project: project, album: this.albumItems, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proyecto_${project.name}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportAll() {
        const data = { projects: this.projects, album: this.albumItems, config: this.config, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_completo_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    renderAll() {
        this.renderProjects();
        this.renderDashboard();
        this.renderAlbum();
        this.updateStats();
    }

    renderProjects() {
        const container = document.getElementById('projectsList');
        if (!container) return;
        if (this.projects.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--secondary);">No hay proyectos aún. Crea uno nuevo.</p>';
            return;
        }
        container.innerHTML = this.projects.map(project => `
            <div class="project-card" data-id="${project.id}">
                <h3>${project.name}</h3>
                <div class="project-meta">👤 ${project.client}</div>
                <div class="project-meta">📅 ${project.date}</div>
                <span class="project-status status-${project.status}">${project.status}</span>
                <div style="margin-top:12px;">
                    <button class="action-btn" onclick="window.pm.editProject('${project.id}')">✏️ Editar</button>
                    <button class="action-btn" onclick="window.pm.deleteProject('${project.id}')">🗑️ Eliminar</button>
                    <button class="action-btn" onclick="window.pm.exportProject('${project.id}')">📤 Exportar</button>
                </div>
            </div>
        `).join('');
    }

    renderDashboard() {
        const recentList = document.getElementById('recentList');
        if (!recentList) return;
        const sorted = [...this.projects].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        if (sorted.length === 0) {
            recentList.innerHTML = '<li style="color:var(--secondary);">No hay proyectos recientes</li>';
        } else {
            recentList.innerHTML = sorted.map(p => `<li>📁 ${p.name} - ${p.client} (${p.date})</li>`).join('');
        }
    }

    renderAlbum() {
        const container = document.getElementById('albumGrid');
        if (!container) return;
        if (this.albumItems.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--secondary);">No hay elementos en el álbum.</p>';
            return;
        }
        container.innerHTML = this.albumItems.map((item, index) => `
            <div class="album-item" draggable="true" data-index="${index}">
                ${item.type === 'image' ? `<img src="${item.data}" alt="Imagen ${index}">` : `<video src="${item.data}" controls></video>`}
                <div class="item-actions">
                    <button onclick="window.pm.deleteAlbumItem('${item.id}')">🗑️</button>
                </div>
            </div>
        `).join('');
        const items = container.querySelectorAll('.album-item');
        items.forEach(item => {
            item.addEventListener('dragstart', this.handleDragStart.bind(this));
            item.addEventListener('dragend', this.handleDragEnd.bind(this));
            item.addEventListener('dragover', this.handleDragOver.bind(this));
            item.addEventListener('drop', this.handleDrop.bind(this));
        });
    }

    updateStats() {
        document.getElementById('projectCount').textContent = this.projects.length;
        document.getElementById('imageCount').textContent = this.albumItems.filter(i => i.type === 'image').length;
        document.getElementById('videoCount').textContent = this.albumItems.filter(i => i.type === 'video').length;
    }

    populateProjectSelector() {
        const selector = document.getElementById('projectSelector');
        if (!selector) return;
        selector.innerHTML = this.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        if (this.currentProject && this.projects.some(p => p.id === this.currentProject)) {
            selector.value = this.currentProject;
        } else if (this.projects.length > 0) {
            selector.value = this.projects[0].id;
            this.currentProject = this.projects[0].id;
        }
        this.loadContentToEditor();
    }

    loadContentToEditor() {
        const projectId = document.getElementById('projectSelector').value;
        if (!projectId) return;
        const content = this.getContent(projectId);
        if (content) {
            document.getElementById('ideaInput').value = content.idea || '';
            document.getElementById('scriptInput').value = content.script || '';
            document.getElementById('promptInput').value = content.prompt || '';
            document.getElementById('copyInput').value = content.copy || '';
            document.getElementById('hashtagsInput').value = content.hashtags || '';
            document.getElementById('commentsInput').value = content.comments || '';
        }
    }

    handleDragStart(e) {
        const index = e.target.dataset.index;
        e.dataTransfer.setData('text/plain', index);
        e.target.style.opacity = '0.4';
    }

    handleDragEnd(e) { e.target.style.opacity = '1'; }
    handleDragOver(e) { e.preventDefault(); }

    handleDrop(e) {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
        const toIndex = parseInt(e.target.closest('.album-item').dataset.index);
        if (fromIndex !== toIndex) this.reorderAlbumItems(fromIndex, toIndex);
    }

    editProject(id) {
        const project = this.getProject(id);
        if (!project) return;
        document.getElementById('projectName').value = project.name;
        document.getElementById('projectClient').value = project.client;
        document.getElementById('projectDate').value = project.date;
        document.getElementById('projectStatus').value = project.status;
        document.getElementById('projectModal').classList.remove('hidden');
        document.getElementById('saveProjectBtn').dataset.editId = id;
    }

    initEventListeners() {
        document.querySelectorAll('#sideMenu ul li').forEach(item => {
            item.addEventListener('click', () => this.navigateTo(item.dataset.section));
        });

        document.getElementById('menuToggle').addEventListener('click', () => {
            document.getElementById('sideMenu').classList.toggle('collapsed');
        });

        document.getElementById('newProjectBtn').addEventListener('click', () => {
            document.getElementById('projectModal').classList.remove('hidden');
            document.getElementById('projectName').value = '';
            document.getElementById('projectClient').value = '';
            document.getElementById('projectDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('projectStatus').value = 'activo';
            delete document.getElementById('saveProjectBtn').dataset.editId;
        });

        document.getElementById('saveProjectBtn').addEventListener('click', () => {
            const name = document.getElementById('projectName').value;
            const client = document.getElementById('projectClient').value;
            const date = document.getElementById('projectDate').value;
            const status = document.getElementById('projectStatus').value;
            const editId = document.getElementById('saveProjectBtn').dataset.editId;
            if (editId) {
                this.updateProject(editId, { name, client, date, status });
            } else {
                this.createProject(name, client, date, status);
            }
            document.getElementById('projectModal').classList.add('hidden');
        });

        document.getElementById('closeModalBtn').addEventListener('click', () => {
            document.getElementById('projectModal').classList.add('hidden');
        });

        document.getElementById('saveContentBtn').addEventListener('click', () => {
            const projectId = document.getElementById('projectSelector').value;
            if (!projectId) return;
            const content = {
                idea: document.getElementById('ideaInput').value,
                script: document.getElementById('scriptInput').value,
                prompt: document.getElementById('promptInput').value,
                copy: document.getElementById('copyInput').value,
                hashtags: document.getElementById('hashtagsInput').value,
                comments: document.getElementById('commentsInput').value
            };
            this.saveContent(projectId, content);
            alert('✅ Contenido guardado correctamente');
        });

        document.getElementById('addImageBtn').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => {
                const files = Array.from(e.target.files);
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (event) => this.addImage(event.target.result);
                    reader.readAsDataURL(file);
                });
            };
            input.click();
        });

        document.getElementById('addVideoBtn').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'video/*';
            input.multiple = true;
            input.onchange = (e) => {
                const files = Array.from(e.target.files);
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (event) => this.addVideo(event.target.result);
                    reader.readAsDataURL(file);
                });
            };
            input.click();
        });

        document.getElementById('saveAllBtn').addEventListener('click', () => {
            this.saveData();
            alert('✅ Todos los datos guardados');
        });

        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportAll();
        });

        document.getElementById('projectSelector').addEventListener('change', () => {
            this.loadContentToEditor();
        });

        document.querySelectorAll('.web-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.open(btn.dataset.url, '_blank');
            });
        });

        document.getElementById('autoSave').addEventListener('change', (e) => {
            this.config.autoSave = e.target.checked;
            this.saveData();
        });

        document.getElementById('darkMode').addEventListener('change', (e) => {
            this.config.darkMode = e.target.checked;
            document.body.classList.toggle('dark-mode', e.target.checked);
            this.saveData();
        });

        document.getElementById('clearDataBtn').addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres eliminar todos los datos? Esta acción no se puede deshacer.')) {
                localStorage.clear();
                location.reload();
            }
        });

        setInterval(() => {
            if (this.config.autoSave) {
                this.saveData();
                console.log('✅ Auto guardado realizado');
            }
        }, 30000);

        window.addEventListener('beforeunload', () => {
            this.saveData();
        });
    }

    navigateTo(section) {
        document.querySelectorAll('.content-section').forEach(el => el.classList.remove('active'));
        const targetSection = document.getElementById(`${section}Section`);
        if (targetSection) targetSection.classList.add('active');
        document.querySelectorAll('#sideMenu ul li').forEach(el => {
            el.classList.remove('active');
            if (el.dataset.section === section) el.classList.add('active');
        });
        if (window.innerWidth <= 768) document.getElementById('sideMenu').classList.add('collapsed');
        if (section === 'projects') this.renderProjects();
        else if (section === 'album') this.renderAlbum();
        else if (section === 'content') this.populateProjectSelector();
        else if (section === 'dashboard') { this.renderDashboard(); this.updateStats(); }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.pm = new ProjectManager();
    window.pm.navigateTo('dashboard');
    console.log('🚀 Aplicación iniciada correctamente');
});