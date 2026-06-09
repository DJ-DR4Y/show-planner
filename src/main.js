import '../style.css';
import initialData from './initialData.json';

const rawData = JSON.parse(localStorage.getItem('show-schedule')) || initialData;
let schedule = Array.isArray(rawData) ? rawData : (rawData.schedule || []);
let docTitle = rawData.title || "Feuille de Route - 26 Juin 2026";

// Standardize data structure
schedule = schedule.map(item => ({
  ...item,
  chansons: Array.isArray(item.chansons) ? item.chansons : []
}));

const tableBody = document.getElementById('table-body');
const titleElement = document.querySelector('h1');

if (titleElement) {
  titleElement.textContent = docTitle;
  titleElement.contentEditable = true;
  titleElement.addEventListener('blur', () => {
    docTitle = titleElement.textContent;
  });
}

const addRowBtn = document.getElementById('add-row');
const saveAllBtn = document.getElementById('save-all');
const resetBtn = document.getElementById('reset-data');
const exportBtn = document.getElementById('export-csv');
const newDocBtn = document.getElementById('new-doc');
const loadJsonBtn = document.getElementById('load-json');
const saveJsonBtn = document.getElementById('save-json');
const fileInput = document.getElementById('file-input');

function calculateDuration(start, end) {
  if (!start || !end) return "0 min";
  
  const [h1, m1] = start.split(':').map(Number);
  const [h2, m2] = end.split(':').map(Number);
  
  let totalMin1 = h1 * 60 + m1;
  let totalMin2 = h2 * 60 + m2;
  
  if (totalMin2 < totalMin1) {
    totalMin2 += 24 * 60;
  }
  
  const diff = totalMin2 - totalMin1;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  
  if (h > 0) {
    return `${h}h${m > 0 ? m.toString().padStart(2, '0') : '00'}m`;
  }
  return `${m} min`;
}

function renderTable() {
  if (!tableBody) return;
  
  // Create a document fragment to minimize reflows
  const fragment = document.createDocumentFragment();
  
  schedule.forEach((item, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="date" value="${item.date}" data-index="${index}" data-key="date"></td>
      <td><input type="text" value="${item.scene}" data-index="${index}" data-key="scene"></td>
      <td><input type="text" value="${item.artiste}" data-index="${index}" data-key="artiste"></td>
      <td><input type="text" value="${item.formule}" data-index="${index}" data-key="formule"></td>
      <td><input type="text" value="${item.taches}" data-index="${index}" data-key="taches"></td>
      <td><input type="time" value="${item.debut}" data-index="${index}" data-key="debut"></td>
      <td><input type="time" value="${item.fin}" data-index="${index}" data-key="fin"></td>
      <td class="duration-cell" id="duration-${index}">${calculateDuration(item.debut, item.fin)}</td>
      <td class="song-list-cell">
        <div class="song-list-container">
          ${(item.chansons || []).map((song, sIndex) => `
            <div class="song-item">
              <input type="checkbox" class="song-ok" ${song.ok ? 'checked' : ''} data-index="${index}" data-sindex="${sIndex}" data-key="ok">
              <input type="text" class="song-title" value="${song.titre}" data-index="${index}" data-sindex="${sIndex}" data-key="titre" placeholder="Titre">
              <input type="text" class="song-info" value="${song.info}" data-index="${index}" data-sindex="${sIndex}" data-key="info" placeholder="Infos">
              <span class="remove-song-btn" data-index="${index}" data-sindex="${sIndex}">&times;</span>
            </div>
          `).join('')}
        </div>
        <button class="add-song-btn" data-index="${index}">+ Ajouter chanson</button>
      </td>
      <td><button class="delete-btn" data-index="${index}">Suppr.</button></td>
    `;
    fragment.appendChild(tr);
  });

  tableBody.innerHTML = '';
  tableBody.appendChild(fragment);
}

function updateData(index, key, value, sIndex = null) {
  if (sIndex !== null) {
    schedule[index].chansons[sIndex][key] = value;
  } else {
    schedule[index][key] = value;
    if (key === 'debut' || key === 'fin') {
      const durationCell = document.getElementById(`duration-${index}`);
      if (durationCell) {
        durationCell.textContent = calculateDuration(schedule[index].debut, schedule[index].fin);
      }
    }
  }
}

if (tableBody) {
  tableBody.addEventListener('input', (e) => {
    const { index, key, sindex } = e.target.dataset;
    if (index !== undefined && key !== undefined) {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      updateData(parseInt(index), key, value, sindex !== undefined ? parseInt(sindex) : null);
    }
  });

  tableBody.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      const { index, key, sindex } = e.target.dataset;
      if (index !== undefined && key !== undefined) {
        updateData(parseInt(index), key, e.target.checked, sindex !== undefined ? parseInt(sindex) : null);
      }
    }
  });

  tableBody.addEventListener('click', (e) => {
    const index = parseInt(e.target.dataset.index);
    if (e.target.classList.contains('delete-btn')) {
      schedule.splice(index, 1);
      renderTable();
    } else if (e.target.classList.contains('add-song-btn')) {
      if (!schedule[index].chansons) schedule[index].chansons = [];
      schedule[index].chansons.push({ titre: '', info: '', ok: false });
      renderTable();
    } else if (e.target.classList.contains('remove-song-btn')) {
      const sIndex = parseInt(e.target.dataset.sindex);
      schedule[index].chansons.splice(sIndex, 1);
      renderTable();
    }
  });
}

if (addRowBtn) {
  addRowBtn.addEventListener('click', () => {
    const lastRow = schedule[schedule.length - 1] || { date: new Date().toISOString().split('T')[0], debut: '09:00' };
    schedule.push({
      date: lastRow.date,
      scene: lastRow.scene || "",
      artiste: "",
      formule: "",
      taches: "Nouveauté",
      debut: lastRow.fin || "09:00",
      fin: "",
      chansons: []
    });
    renderTable();
  });
}

if (newDocBtn) {
  newDocBtn.addEventListener('click', () => {
    if (confirm('Créer un nouveau document vide ?')) {
      schedule = [{
        date: new Date().toISOString().split('T')[0],
        scene: "",
        artiste: "",
        formule: "",
        taches: "Début",
        debut: "08:00",
        fin: "09:00",
        chansons: []
      }];
      renderTable();
    }
  });
}

if (saveJsonBtn) {
  saveJsonBtn.addEventListener('click', () => {
    const dataToSave = {
      title: docTitle,
      schedule: schedule
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToSave, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `show_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchor.click();
  });
}

if (loadJsonBtn) {
  loadJsonBtn.addEventListener('click', () => fileInput.click());
}

if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const loadedData = JSON.parse(event.target.result);
        if (loadedData.title && loadedData.schedule) {
          docTitle = loadedData.title;
          if (titleElement) titleElement.textContent = docTitle;
          schedule = loadedData.schedule;
        } else {
          schedule = loadedData;
        }
        renderTable();
      } catch (err) { alert("Erreur chargement JSON"); }
    };
    reader.readAsText(file);
  });
}

if (saveAllBtn) {
  saveAllBtn.addEventListener('click', () => {
    const dataToSave = {
      title: docTitle,
      schedule: schedule
    };
    localStorage.setItem('show-schedule', JSON.stringify(dataToSave));
    alert('Enregistré dans le navigateur !');
  });
}

if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const headers = ["Date", "Scène", "Artiste", "Formule", "Tâches", "Début", "Fin", "Durée", "Chansons"];
    const rows = schedule.map(item => [
      item.date,
      item.scene,
      item.artiste,
      item.formule,
      item.taches,
      item.debut,
      item.fin,
      calculateDuration(item.debut, item.fin),
      `"${(item.chansons || []).map(s => `${s.ok ? '[OK] ' : ''}${s.titre} (${s.info})`).join(' | ').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "export_show.csv";
    link.click();
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    if (confirm('Reset aux données initiales ?')) {
      docTitle = initialData.title || "Feuille de Route - 26 Juin 2026";
      if (titleElement) titleElement.textContent = docTitle;
      schedule = JSON.parse(JSON.stringify(initialData.schedule || initialData));
      localStorage.removeItem('show-schedule');
      renderTable();
    }
  });
}

renderTable();


