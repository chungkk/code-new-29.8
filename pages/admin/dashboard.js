import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ProtectedPage from '../../components/ProtectedPage';
import { fetchWithAuth } from '../../lib/api';
import { toast } from 'react-toastify';
import styles from '../../styles/adminDashboard.module.css';

function AdminDashboardContent() {
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    displayTitle: '',
    description: '',
    level: 'A1'
  });

  const generateIdFromTitle = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // remove special chars except spaces
      .replace(/\s+/g, '-') // replace spaces with -
      .replace(/-+/g, '-') // replace multiple - with single
      .replace(/^-|-$/g, ''); // remove leading/trailing -
  };
  const [audioFile, setAudioFile] = useState(null);
  const [audioSource, setAudioSource] = useState('file');
  const [audioUrl, setAudioUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [srtText, setSrtText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('lessons');
  const [unusedFiles, setUnusedFiles] = useState({ audio: [], json: [] });
  const [deletingFiles, setDeletingFiles] = useState(false);
  const [formCollapsed, setFormCollapsed] = useState(false);

  useEffect(() => {
    fetchLessons();
    loadUnusedFiles();
  }, []);

  const validateSRT = (text) => {
    if (!text.trim()) return true; // optional
    const lines = text.trim().split('\n');
    let i = 0;
    while (i < lines.length) {
      if (lines[i].trim() === '') {
        i++;
        continue;
      }
      const indexLine = lines[i].trim();
      if (!/^\d+$/.test(indexLine)) return false;
      i++;
      if (i >= lines.length) return false;
      const timeLine = lines[i].trim();
      const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      if (!timeMatch) return false;
      i++;
      let hasText = false;
      while (i < lines.length && lines[i].trim() !== '' && !/^\d+$/.test(lines[i].trim())) {
        if (lines[i].trim()) hasText = true;
        i++;
      }
      if (!hasText) return false;
    }
    return true;
  };

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/lessons?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = (await res.json() || []).filter(l => l && l._id);
      setLessons(data);
    } catch (error) {
      console.error('Error fetching lessons:', error);
      toast.error('Kann Lektionsliste nicht laden');
    } finally {
      setLoading(false);
    }
  };

  const loadUnusedFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/unused-files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUnusedFiles(data);
      }
    } catch (error) {
      console.error('Error loading unused files:', error);
    }
  };

  const deleteUnusedFiles = async (files) => {
    if (!confirm(`Sind Sie sicher, dass Sie ${files.length} ungenutzte Dateien löschen möchten?`)) return;

    setDeletingFiles(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/unused-files', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ files })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`${data.deleted.length} Dateien gelöscht`);
        if (data.errors.length > 0) {
          toast.warning(`Löschfehler: ${data.errors.join(', ')}`);
        }
        loadUnusedFiles(); // Refresh
      } else {
        toast.error('Dateilöschfehler');
      }
    } catch (error) {
      console.error('Error deleting files:', error);
      toast.error('Dateilöschfehler');
    } finally {
      setDeletingFiles(false);
    }
  };

  const handleTranscribe = async () => {
    if (audioSource === 'file' && !audioFile) {
      toast.error('Bitte wählen Sie eine Audio-Datei aus');
      return;
    }
    if (audioSource === 'url' && !audioUrl.trim()) {
      toast.error('Bitte geben Sie eine Audio-URL ein');
      return;
    }

    setTranscribing(true);
    try {
      const formData = new FormData();
      if (audioSource === 'url') {
        formData.append('url', audioUrl);
      } else {
        formData.append('audio', audioFile);
      }

      const token = localStorage.getItem('token');
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Transcription failed');
      }

      const data = await res.json();
      setSrtText(data.srt);
      toast.success('SRT erfolgreich aus Audio generiert!');
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Fehler bei der Transkription: ' + error.message);
    } finally {
      setTranscribing(false);
    }
  };

  const handleFileUpload = async () => {
    setUploading(true);
    let audioPath = '';
    let jsonPath = '';

    try {
      // Upload audio file (required)
      if (audioSource === 'file' && !audioFile) {
        throw new Error('Bitte wählen Sie eine Audio-Datei aus');
      }
      if (audioSource === 'url' && !audioUrl.trim()) {
        throw new Error('Bitte geben Sie eine Audio-URL ein');
      }

      const uploadFormData = new FormData();
      if (audioSource === 'url') {
        uploadFormData.append('type', 'url');
        uploadFormData.append('url', audioUrl);
        uploadFormData.append('audioType', 'audio');
      } else {
        uploadFormData.append('file', audioFile);
        uploadFormData.append('type', 'audio');
      }

      const audioRes = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: uploadFormData
      });

      if (!audioRes.ok) {
        const errorData = await audioRes.json();
        throw new Error(errorData.message || 'Upload audio failed');
      }

      const audioData = await audioRes.json();
      audioPath = audioData.url;

      // Convert SRT to JSON (required)
      if (!srtText.trim()) {
        throw new Error('Bitte geben Sie SRT-Text ein');
      }

      const token = localStorage.getItem('token');
      const srtRes = await fetch('/api/convert-srt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          srtText: srtText,
          lessonId: formData.id
        })
      });

      if (!srtRes.ok) {
        const errorData = await srtRes.json();
        throw new Error(errorData.message || 'Convert SRT failed');
      }

      const srtData = await srtRes.json();
      jsonPath = srtData.url;

      return {
        audio: audioPath,
        json: jsonPath
      };
    } catch (error) {
        throw new Error('Upload/Konvertierungsfehler: ' + error.message);
    } finally {
      setUploading(false);
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    // Validate required fields
    if (editingLesson && !formData.id.trim()) newErrors.id = 'ID ist erforderlich';
    if (!formData.title.trim()) newErrors.title = 'Titel ist erforderlich';
    if (!formData.displayTitle.trim()) newErrors.displayTitle = 'Anzeigetitel ist erforderlich';
    if (!formData.description.trim()) newErrors.description = 'Beschreibung ist erforderlich';
    if (!formData.level) newErrors.level = 'Niveau ist erforderlich';

    // For new lessons, require both audio file/URL and SRT text
    if (!editingLesson) {
      if (audioSource === 'file' && !audioFile) newErrors.audio = 'Audio file là bắt buộc';
      if (audioSource === 'url' && !audioUrl.trim()) newErrors.audio = 'Audio URL là bắt buộc';
      if (audioSource === 'youtube' && !youtubeUrl.trim()) newErrors.audio = 'YouTube URL là bắt buộc';
      if (!srtText.trim()) newErrors.srt = 'SRT text là bắt buộc';
    }

    // Validate SRT format if provided
    if (srtText.trim() && !validateSRT(srtText)) {
      newErrors.srt = 'Ungültiges SRT-Format';
    }

    setErrors(newErrors);
    setGeneralError('');
    if (Object.keys(newErrors).length > 0) return;

    // Upload audio and convert SRT
    let finalAudioPath = '';
    let finalJsonPath = '';
    let finalYoutubeUrl = '';

    if (!editingLesson) {
      try {
        if (audioSource === 'youtube') {
          // For YouTube, just save the URL directly
          finalYoutubeUrl = youtubeUrl.trim();
          finalAudioPath = ''; // No audio file for YouTube
          
          // Still need to convert SRT to JSON
          const token = localStorage.getItem('token');
          const srtRes = await fetch('/api/convert-srt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              srtText: srtText,
              lessonId: formData.id
            })
          });

          if (!srtRes.ok) {
            const errorData = await srtRes.json();
            throw new Error(errorData.message || 'Convert SRT failed');
          }

          const srtData = await srtRes.json();
          finalJsonPath = srtData.url;
        } else {
          const uploadResult = await handleFileUpload();
          finalAudioPath = uploadResult.audio;
          finalJsonPath = uploadResult.json;
        }
      } catch (error) {
        setGeneralError(error.message);
        return;
      }
    }

    // Check if lesson ID already exists (for new lessons)
    if (!editingLesson) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setGeneralError('Token existiert nicht. Bitte melden Sie sich erneut an.');
          return;
        }

        const checkRes = await fetch('/api/lessons', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!checkRes.ok) {
          if (checkRes.status === 401) {
            setGeneralError('Ungültiges Token. Bitte melden Sie sich erneut an.');
            return;
          }
          throw new Error('Kann ID nicht überprüfen');
        }

        const existingLessons = (await checkRes.json() || []).filter(l => l && l._id);
        const idExists = existingLessons.some(lesson => lesson.id === formData.id);
        if (idExists) {
          setGeneralError(`ID "${formData.id}" existiert bereits. Bitte wählen Sie eine andere ID.`);
          return;
        }
      } catch (error) {
        console.error('Error checking existing lessons:', error);
        setGeneralError('Fehler bei ID-Überprüfung: ' + error.message);
        return;
      }
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setGeneralError('Token existiert nicht. Bitte melden Sie sich erneut an.');
        return;
      }

       let lessonData;
       if (editingLesson) {
         lessonData = {
           title: formData.title,
           displayTitle: formData.displayTitle,
           description: formData.description,
           level: formData.level
         };
       } else {
         lessonData = {
           ...formData,
           audio: finalAudioPath || 'youtube',
           json: finalJsonPath,
           youtubeUrl: finalYoutubeUrl || undefined
         };
       }



      const url = '/api/lessons';
      const method = editingLesson ? 'PUT' : 'POST';

       const requestBody = editingLesson ? { id: editingLesson._id, ...lessonData } : lessonData;
       const res = await fetch(url, {
         method,
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
         },
         body: JSON.stringify(requestBody)
       });


       if (!res.ok) {
        const errorData = await res.json();
        console.error('Save lesson error:', errorData);
        throw new Error(errorData.message || 'Lektion konnte nicht gespeichert werden');
      }

      toast.success(editingLesson ? 'Erfolgreich aktualisiert!' : 'Lektion erfolgreich hinzugefügt!');
      setShowForm(false);
      setEditingLesson(null);
      resetForm();
      fetchLessons();
    } catch (error) {
      toast.error('Có lỗi xảy ra: ' + error.message);
    }
  };

  const handleEdit = (lesson) => {
    setEditingLesson(lesson);
    setFormData({
      id: lesson.id,
      title: lesson.title,
      displayTitle: lesson.displayTitle,
      description: lesson.description,
      level: lesson.level || 'A1'
    });
    // Note: Audio and JSON paths are stored in lesson but not editable
    setShowForm(true);
  };

  const handleDelete = async (lessonId) => {
    if (!confirm('Sind Sie sicher, dass Sie diese Lektion löschen möchten?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Token existiert nicht. Bitte melden Sie sich erneut an.');
        return;
      }

      const res = await fetch(`/api/lessons?id=${lessonId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Lektion konnte nicht gelöscht werden');
      }

      toast.success('Erfolgreich gelöscht!');
      fetchLessons();
    } catch (error) {
      toast.error('Có lỗi xảy ra: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      title: '',
      displayTitle: '',
      description: '',
      level: 'A1'
    });
    setAudioFile(null);
    setAudioSource('file');
    setAudioUrl('');
    setYoutubeUrl('');
    setSrtText('');
    setErrors({});
    setGeneralError('');
  };

  // Filter lessons based on search term
  const filteredLessons = lessons.filter(lesson =>
    lesson.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.displayTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lesson.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lesson.level && lesson.level.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <Head>
        <title>Admin-Dashboard - Deutsch Shadowing</title>
      </Head>
      
      <div className={styles.container}>
        {/* Header Section */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Admin-Dashboard</h1>
          </div>
        </div>

        {/* Tabs and Add Button */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
          <button
            onClick={() => setActiveTab('lessons')}
            style={{
              padding: '10px 20px',
              border: activeTab === 'lessons' ? '2px solid #667eea' : '2px solid #e0e0e0',
              background: activeTab === 'lessons' ? '#667eea' : 'white',
              color: activeTab === 'lessons' ? 'white' : '#666',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            📚 Lektionen verwalten
          </button>
          <button
            onClick={() => {
              setActiveTab('files');
              loadUnusedFiles();
            }}
            style={{
              padding: '10px 20px',
              border: activeTab === 'files' ? '2px solid #667eea' : '2px solid #e0e0e0',
              background: activeTab === 'files' ? '#667eea' : 'white',
              color: activeTab === 'files' ? 'white' : '#666',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            🗂️ Dateien verwalten ({unusedFiles.audio.length + unusedFiles.json.length})
          </button>
          <div style={{ flex: 1 }}></div> {/* Spacer */}
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingLesson(null);
              resetForm();
            }}
            className={styles.addButton}
          >
            {showForm ? '✕ Formular schließen' : '+ Neue Lektion hinzufügen'}
          </button>
        </div>

        {activeTab === 'lessons' && (
          <>
            {/* Statistics Section */}
            <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>📚</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{lessons.length}</div>
               <div className={styles.statLabel}>Gesamt Lektionen</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>✅</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{filteredLessons.length}</div>
               <div className={styles.statLabel}>Suchergebnisse</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>🎯</div>
            <div className={styles.statContent}>
              <div className={styles.statValue}>{showForm ? '1' : '0'}</div>
               <div className={styles.statLabel}>Wird bearbeitet</div>
            </div>
          </div>
         </div>

        {/* Form Section */}
        {showForm && (
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>
                  {editingLesson ? 'Lektion bearbeiten' : 'Neue Lektion hinzufügen'}
              </h2>
              <button
                onClick={() => setFormCollapsed(!formCollapsed)}
                className={styles.collapseButton}
              >
                {formCollapsed ? '🔽 Erweitern' : '🔼 Minimieren'}
              </button>
            </div>

            {!formCollapsed && (
              <>
                {generalError && (
                  <div className={styles.errorMessage}>
                    ⚠️ {generalError}
                  </div>
                )}
            
            <form onSubmit={handleSubmit} className={styles.formGrid}>
               {editingLesson && (
                 <div className={styles.fullWidth}>
                   <label className={styles.label}>
                     ID (wird automatisch aus Titel generiert)
                   </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    disabled={!!editingLesson}
                    className={`${styles.input} ${errors.id ? styles.error : ''}`}
                     placeholder="Eindeutige ID für die Lektion eingeben"
                  />
                 {errors.id && <span className={styles.errorText}>{errors.id}</span>}
               </div>
               )}

              <div>
                 <label className={styles.label}>
                   Titel (Title)
                 </label>
                 <input
                   type="text"
                   value={formData.title}
                   onChange={(e) => {
                     const newTitle = e.target.value;
                     const newId = editingLesson ? formData.id : generateIdFromTitle(newTitle);
                     setFormData({ ...formData, title: newTitle, id: newId });
                   }}
                   className={`${styles.input} ${errors.title ? styles.error : ''}`}
                    placeholder="Interner Titel"
                 />
                {errors.title && <span className={styles.errorText}>{errors.title}</span>}
              </div>

               <div>
                  <label className={styles.label}>
                    Anzeigetitel (Display Title)
                  </label>
                 <input
                   type="text"
                   value={formData.displayTitle}
                   onChange={(e) => setFormData({ ...formData, displayTitle: e.target.value })}
                   className={`${styles.input} ${errors.displayTitle ? styles.error : ''}`}
                    placeholder="Anzeigetitel für Benutzer"
                 />
                 {errors.displayTitle && <span className={styles.errorText}>{errors.displayTitle}</span>}
               </div>

               <div>
                 <label className={styles.label}>
                   Niveau (Level)
                 </label>
                 <select
                   value={formData.level}
                   onChange={(e) => {
                     console.log('Level changed to:', e.target.value);
                     setFormData({ ...formData, level: e.target.value });
                   }}
                   className={`${styles.input} ${errors.level ? styles.error : ''}`}
                 >
                   <option value="A1">A1 - Anfänger</option>
                   <option value="A2">A2 - Elementar</option>
                   <option value="B1">B1 - Mittelstufe</option>
                   <option value="B2">B2 - Oberstufe</option>
                   <option value="C1">C1 - Fortgeschritten</option>
                   <option value="C2">C2 - Muttersprachlich</option>
                 </select>
                 {errors.level && <span className={styles.errorText}>{errors.level}</span>}
               </div>

               <div className={styles.fullWidth}>
                 <label className={styles.label}>
                   Beschreibung (Description)
                 </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`${styles.textarea} ${errors.description ? styles.error : ''}`}
                   placeholder="Kurze Beschreibung der Lektion"
                />
                {errors.description && <span className={styles.errorText}>{errors.description}</span>}
               </div>

               {editingLesson && (
                <div className={`${styles.fullWidth} ${styles.editWarning}`}>
                   <strong>Bearbeitungsmodus:</strong> Sie können nur Lektionsinformationen bearbeiten. Audio und JSON können nicht geändert werden.
                </div>
              )}

               {!editingLesson && (
                 <>
                   <div className={styles.fullWidth}>
                      <label className={styles.label}>
                        📤 Audio-Quelle *
                      </label>
                      <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                           <input
                             type="radio"
                             value="file"
                             checked={audioSource === 'file'}
                             onChange={(e) => {
                               setAudioSource(e.target.value);
                               if (e.target.value === 'file') setAudioUrl('');
                             }}
                           />
                           Datei hochladen
                         </label>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                           <input
                             type="radio"
                             value="url"
                             checked={audioSource === 'url'}
                             onChange={(e) => {
                               setAudioSource(e.target.value);
                               if (e.target.value === 'url') {
                                 setAudioFile(null);
                                 setYoutubeUrl('');
                               }
                             }}
                           />
                           URL eingeben
                         </label>
                         <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                           <input
                             type="radio"
                             value="youtube"
                             checked={audioSource === 'youtube'}
                             onChange={(e) => {
                               setAudioSource(e.target.value);
                               if (e.target.value === 'youtube') {
                                 setAudioFile(null);
                                 setAudioUrl('');
                               }
                             }}
                           />
                           YouTube Video
                         </label>
                      </div>
                       {audioSource === 'file' ? (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <input
                             type="file"
                             accept="audio/*"
                             onChange={(e) => setAudioFile(e.target.files[0])}
                             className={`${styles.fileInput} ${errors.audio ? styles.error : ''}`}
                           />
                           {audioFile && <span>Ausgewählt: {audioFile.name}</span>}
                           <button
                             onClick={() => setAudioFile(null)}
                             disabled={!audioFile}
                             style={{
                               padding: '4px 8px',
                               background: audioFile ? '#f44336' : '#ccc',
                               color: 'white',
                               border: 'none',
                               borderRadius: '4px',
                               cursor: audioFile ? 'pointer' : 'not-allowed',
                               fontSize: '12px'
                             }}
                           >
                             ✕
                           </button>
                         </div>
                       ) : audioSource === 'url' ? (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <input
                             type="url"
                             value={audioUrl}
                             onChange={(e) => setAudioUrl(e.target.value)}
                             placeholder="https://example.com/audio.mp3"
                             className={`${styles.input} ${errors.audio ? styles.error : ''}`}
                           />
                           {audioUrl.trim() && <span>URL: {audioUrl}</span>}
                           <button
                             onClick={() => setAudioUrl('')}
                             disabled={!audioUrl.trim()}
                             style={{
                               padding: '4px 8px',
                               background: audioUrl.trim() ? '#f44336' : '#ccc',
                               color: 'white',
                               border: 'none',
                               borderRadius: '4px',
                               cursor: audioUrl.trim() ? 'pointer' : 'not-allowed',
                               fontSize: '12px'
                             }}
                           >
                             ✕
                           </button>
                         </div>
                       ) : (
                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <input
                             type="url"
                             value={youtubeUrl}
                             onChange={(e) => setYoutubeUrl(e.target.value)}
                             placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                             className={`${styles.input} ${errors.audio ? styles.error : ''}`}
                           />
                           {youtubeUrl.trim() && <span>YouTube: {youtubeUrl}</span>}
                           <button
                             onClick={() => setYoutubeUrl('')}
                             disabled={!youtubeUrl.trim()}
                             style={{
                               padding: '4px 8px',
                               background: youtubeUrl.trim() ? '#f44336' : '#ccc',
                               color: 'white',
                               border: 'none',
                               borderRadius: '4px',
                               cursor: youtubeUrl.trim() ? 'pointer' : 'not-allowed',
                               fontSize: '12px'
                             }}
                           >
                             ✕
                           </button>
                         </div>
                       )}

                     {errors.audio && <span className={styles.errorText}>{errors.audio}</span>}
                   </div>

                   <div className={styles.fullWidth}>
                      <label className={styles.label}>
                        📝 SRT-Text *
                      </label>
                     <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                        <button
                          type="button"
                          onClick={handleTranscribe}
                          disabled={transcribing || audioSource === 'youtube' || (!audioFile && !(audioSource === 'url' && audioUrl.trim()))}
                          style={{
                           padding: '8px 16px',
                           background: (transcribing || audioSource === 'youtube') ? '#ccc' : '#007bff',
                           color: 'white',
                           border: 'none',
                           borderRadius: '4px',
                           cursor: (transcribing || audioSource === 'youtube' || (!audioFile && !(audioSource === 'url' && audioUrl.trim()))) ? 'not-allowed' : 'pointer',
                           fontSize: '14px'
                         }}
                        >
                         {audioSource === 'youtube' ? '❌ YouTube không hỗ trợ auto-transcribe' : (transcribing ? '⏳ Generiere SRT...' : '🎙️ SRT aus Audio generieren')}
                       </button>
                     </div>
                     <textarea
                       value={srtText}
                       onChange={(e) => setSrtText(e.target.value)}
                       className={`${styles.textarea} ${errors.srt ? styles.error : ''}`}
                       style={{ minHeight: '200px', fontFamily: 'monospace' }}
                        placeholder={`Beispiel:
1
00:00:03,200 --> 00:00:04,766
DW Deutsch lernen

2
00:00:05,866 --> 00:00:07,133
mit dem Top Thema`}
                     />
                     {errors.srt && <span className={styles.errorText}>{errors.srt}</span>}
                     <p style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                       Text im SRT-Format (SubRip Subtitle) eingeben oder automatisch aus Audio generieren. JSON-Datei wird automatisch aus diesem Text erstellt.
                     </p>
                   </div>
                </>
              )}

               <div className={styles.fullWidth} style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                  <button
                    type="submit"
                    disabled={uploading || transcribing}
                    className={styles.submitButton}
                  >
                    {uploading ? '⏳ Wird verarbeitet...' : (editingLesson ? '✏️ Aktualisieren' : '➕ Lektion hinzufügen')}
                  </button>
               </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* Lessons List Section */}
        <div className={styles.lessonsSection}>
          <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Lektionsliste</h2>
          <div className={styles.lessonCount}>
            {filteredLessons.length} / {lessons.length} Lektionen
          </div>
          </div>

          {/* Search Bar */}
          <div style={{ padding: '20px', borderBottom: '1px solid #f0f0f0' }}>
            <input
              type="text"
              placeholder="🔍 Nach ID, Titel, Beschreibung oder Niveau suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.input}
              style={{ maxWidth: '500px' }}
            />
          </div>

          {loading ? (
            <div className={styles.loading}>Lädt...</div>
          ) : filteredLessons.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📚</div>
              <h3 className={styles.emptyTitle}>
                {searchTerm ? 'Keine passenden Lektionen gefunden' : 'Noch keine Lektionen vorhanden'}
              </h3>
              <p className={styles.emptyText}>
                {searchTerm ? 'Versuchen Sie es mit einem anderen Suchbegriff' : 'Fügen Sie Ihre erste Lektion hinzu!'}
              </p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                     <tr>
                        <th>ID</th>
                        <th>Titel</th>
                        <th>Beschreibung</th>
                        <th>Niveau</th>
                        <th style={{ textAlign: 'center' }}>Aktionen</th>
                     </tr>
                </thead>
                <tbody>
                  {filteredLessons.map((lesson) => (
                       <tr key={lesson._id}>
                         <td className={styles.lessonId}>{lesson.id}</td>
                         <td className={styles.lessonDisplayTitle}>{lesson.displayTitle}</td>
                         <td className={styles.lessonDescription}>{lesson.description}</td>
                         <td><span className={styles.levelBadge}>{lesson.level || 'A1'}</span></td>
                       <td>
                        <div className={styles.actionButtons}>
                           <button
                             onClick={() => handleEdit(lesson)}
                             className={styles.editButton}
                           >
                             Bearbeiten
                           </button>
                           <button
                             onClick={() => handleDelete(lesson._id)}
                             className={styles.deleteButton}
                           >
                             Löschen
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}

        {activeTab === 'files' && (
          <div className={styles.lessonsSection}>
             <div className={styles.sectionHeader}>
               <h2 className={styles.sectionTitle}>Ungenutzte Dateien</h2>
               <div className={styles.lessonCount}>
                 {unusedFiles.audio.length + unusedFiles.json.length} Dateien
               </div>
             </div>

            <div style={{ padding: '20px' }}>
              <h3>Audio-Dateien ({unusedFiles.audio.length})</h3>
              {unusedFiles.audio.length > 0 ? (
                <div style={{ marginBottom: '20px' }}>
                   <button
                     onClick={() => deleteUnusedFiles(unusedFiles.audio)}
                     disabled={deletingFiles}
                     style={{
                       padding: '10px 20px',
                       background: deletingFiles ? '#ccc' : '#f44336',
                       color: 'white',
                       border: 'none',
                       borderRadius: '8px',
                       cursor: deletingFiles ? 'not-allowed' : 'pointer',
                       marginBottom: '10px'
                     }}
                   >
                      {deletingFiles ? '⏳ Wird gelöscht...' : `🗑️ Alle ungenutzten Audio löschen (${unusedFiles.audio.length})`}
                   </button>
                  <ul>
                     {unusedFiles.audio.map(file => (
                       <li key={file} style={{ marginBottom: '5px' }}>
                         {file}
                         <button
                           onClick={() => deleteUnusedFiles([file])}
                           disabled={deletingFiles}
                           style={{
                             marginLeft: '10px',
                             padding: '2px 8px',
                             background: deletingFiles ? '#ccc' : '#ff9800',
                             color: 'white',
                             border: 'none',
                             borderRadius: '4px',
                             cursor: deletingFiles ? 'not-allowed' : 'pointer'
                           }}
                         >
                           {deletingFiles ? '...' : 'Xóa'}
                         </button>
                       </li>
                     ))}
                  </ul>
                </div>
              ) : (
                 <p>Keine ungenutzten Audio-Dateien.</p>
              )}

              <h3>JSON/Text-Dateien ({unusedFiles.json.length})</h3>
              {unusedFiles.json.length > 0 ? (
                <div>
                   <button
                     onClick={() => deleteUnusedFiles(unusedFiles.json)}
                     disabled={deletingFiles}
                     style={{
                       padding: '10px 20px',
                       background: deletingFiles ? '#ccc' : '#f44336',
                       color: 'white',
                       border: 'none',
                       borderRadius: '8px',
                       cursor: deletingFiles ? 'not-allowed' : 'pointer',
                       marginBottom: '10px'
                     }}
                   >
                      {deletingFiles ? '⏳ Wird gelöscht...' : `🗑️ Alle ungenutzten JSON löschen (${unusedFiles.json.length})`}
                   </button>
                  <ul>
                     {unusedFiles.json.map(file => (
                       <li key={file} style={{ marginBottom: '5px' }}>
                         {file}
                         <button
                           onClick={() => deleteUnusedFiles([file])}
                           disabled={deletingFiles}
                           style={{
                             marginLeft: '10px',
                             padding: '2px 8px',
                             background: deletingFiles ? '#ccc' : '#ff9800',
                             color: 'white',
                             border: 'none',
                             borderRadius: '4px',
                             cursor: deletingFiles ? 'not-allowed' : 'pointer'
                           }}
                         >
                           {deletingFiles ? '...' : 'Xóa'}
                         </button>
                       </li>
                     ))}
                  </ul>
                </div>
              ) : (
                 <p>Keine ungenutzten JSON-Dateien.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedPage requireAdmin={true}>
      <AdminDashboardContent />
    </ProtectedPage>
  );
}
