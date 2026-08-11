const API_BASE = import.meta.env.VITE_API_URL || '';

export async function fetchSettings() {
  const res = await fetch(`${API_BASE}/api/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function saveSettings(settings) {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save settings');
  return res.json();
}

export async function connectSettings(apiKey) {
  const res = await fetch(`${API_BASE}/api/settings/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ openrouter_api_key: apiKey }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Connection failed');
  }
  return res.json();
}

export async function fetchModels() {
  const res = await fetch(`${API_BASE}/api/settings/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

export async function fetchLabels() {
  const res = await fetch(`${API_BASE}/api/labels`);
  if (!res.ok) throw new Error('Failed to fetch catalog labels');
  return res.json();
}

export async function createLabel(name) {
  const res = await fetch(`${API_BASE}/api/labels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to create catalog label');
  }
  return res.json();
}

export async function updateLabel(id, name) {
  const res = await fetch(`${API_BASE}/api/labels/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to update catalog label');
  }
  return res.json();
}

export async function deleteLabel(id) {
  const res = await fetch(`${API_BASE}/api/labels/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete catalog label');
  return res.json();
}

export async function fetchSoftwares(search = '', os = '', tag = '') {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (os) params.append('os', os);
  if (tag) params.append('tag', tag);

  const res = await fetch(`${API_BASE}/api/softwares?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch softwares');
  return res.json();
}

export async function fetchSoftware(id) {
  const res = await fetch(`${API_BASE}/api/softwares/${id}`);
  if (!res.ok) throw new Error('Failed to fetch software details');
  return res.json();
}

export async function createSoftware(softwareData) {
  const res = await fetch(`${API_BASE}/api/softwares`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(softwareData),
  });
  if (!res.ok) throw new Error('Failed to create software entry');
  return res.json();
}

export async function updateSoftware(id, softwareData) {
  const res = await fetch(`${API_BASE}/api/softwares/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(softwareData),
  });
  if (!res.ok) throw new Error('Failed to update software entry');
  return res.json();
}

export async function deleteSoftware(id) {
  const res = await fetch(`${API_BASE}/api/softwares/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete software');
  return res.json();
}

export async function analyzeFilename(filename) {
  const res = await fetch(`${API_BASE}/api/softwares/analyze-filename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename }),
  });
  if (!res.ok) throw new Error('Failed to analyze filename');
  return res.json();
}

export async function addCustomField(softwareId, key, value) {
  const res = await fetch(`${API_BASE}/api/softwares/${softwareId}/custom-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to add custom field');
  }
  return res.json();
}

export async function deleteCustomField(softwareId, key) {
  const res = await fetch(`${API_BASE}/api/softwares/${softwareId}/custom-fields/${encodeURIComponent(key)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete custom field');
  return res.json();
}

export async function addLicense(softwareId, content) {
  const res = await fetch(`${API_BASE}/api/softwares/${softwareId}/licenses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to add license');
  return res.json();
}

export async function updateLicense(softwareId, licenseId, content) {
  const res = await fetch(`${API_BASE}/api/softwares/${softwareId}/licenses/${licenseId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to update license');
  return res.json();
}

export async function deleteLicense(softwareId, licenseId) {
  const res = await fetch(`${API_BASE}/api/softwares/${softwareId}/licenses/${licenseId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete license');
  return res.json();
}

export function uploadFile(softwareId, catalogLabelId, catalogLabel, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('software_id', softwareId);
    if (catalogLabelId) formData.append('catalog_label_id', catalogLabelId);
    if (catalogLabel) formData.append('catalog_label', catalogLabel);
    formData.append('file', file);

    xhr.open('POST', `${API_BASE}/api/files/upload`);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(xhr.responseText || 'Upload failed'));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

export async function uploadSoftwareCover(softwareId, file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/api/softwares/${softwareId}/cover`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to upload cover image');
  return res.json();
}

export function getSoftwareCoverUrl(softwareId) {
  return `${API_BASE}/api/softwares/${softwareId}/cover`;
}

export async function updateFileLabel(fileId, catalogLabelId) {
  const res = await fetch(`${API_BASE}/api/files/${fileId}/label`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ catalog_label_id: catalogLabelId }),
  });
  if (!res.ok) throw new Error('Failed to update file label');
  return res.json();
}

export async function deleteFile(fileId) {
  const res = await fetch(`${API_BASE}/api/files/${fileId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete file');
  return res.json();
}

export function getDownloadUrl(fileId) {
  return `${API_BASE}/api/files/${fileId}/download`;
}
