import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ProtectedPage from '../../../../components/ProtectedPage';
import AdminDashboardLayout from '../../../../components/AdminDashboardLayout';
import { toast } from 'react-toastify';
import styles from '../../../../styles/adminLessonForm.module.css';

function LessonFormPage() {
  const router = useRouter();
  const { id } = router.query;
  const isNewLesson = id === 'new';

  const [loading, setLoading] = useState(!isNewLesson);
  const [uploading, setUploading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [fetchingYouTubeSRT, setFetchingYouTubeSRT] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    title: '',
    displayTitle: '',
    description: '',
    level: 'A1'
  });

  const [audioSource, setAudioSource] = useState('file');
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [srtText, setSrtText] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [errors, setErrors] = useState({});

  const generateIdFromTitle = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  useEffect(() => {
    if (!isNewLesson && id) {
      loadLesson(id);
    }
  }, [id, isNewLesson]);

  const loadLesson = async (lessonId) => {
    try {
      setLoading(true);
      const res = await fetch('/api/lessons');
      const responseData = await res.json();
      const lessons = Array.isArray(responseData) ? responseData : (responseData.lessons || []);
      const lesson = lessons.find(l => l.id === lessonId);

      if (lesson) {
        setFormData({
          id: lesson.id,
          title: lesson.title,
          displayTitle: lesson.displayTitle,
          description: lesson.description,
          level: lesson.level || 'A1'
        });
      } else {
        toast.error('Lektion nicht gefunden');
        router.push('/admin/dashboard');
      }
    } catch (error) {
      console.error('Error loading lesson:', error);
      toast.error('Fehler beim Laden der Lektion');
    } finally {
      setLoading(false);
    }
  };

  const validateSRT = (text) => {
    if (!text.trim()) return true;
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
        headers: { 'Authorization': `Bearer ${token}` },
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

  const handleGetYouTubeSRT = async () => {
    if (!youtubeUrl.trim()) {
      toast.error('Bitte geben Sie eine YouTube-URL ein');
      return;
    }

    setFetchingYouTubeSRT(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/get-youtube-srt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to get SRT from YouTube');
      }

      const data = await res.json();
      setSrtText(data.srt);
      toast.success(data.message || `SRT erfolgreich von YouTube geladen!`);
    } catch (error) {
      console.error('YouTube SRT error:', error);
      toast.error('Fehler beim Laden von SRT von YouTube: ' + error.message);
    } finally {
      setFetchingYouTubeSRT(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    // Validate required fields
    if (!isNewLesson && !formData.id.trim()) newErrors.id = 'ID ist erforderlich';
    if (!formData.title.trim()) newErrors.title = 'Titel ist erforderlich';
    if (!formData.displayTitle.trim()) newErrors.displayTitle = 'Anzeigetitel ist erforderlich';
    if (!formData.description.trim()) newErrors.description = 'Beschreibung ist erforderlich';
    if (!formData.level) newErrors.level = 'Niveau ist erforderlich';

    // For new lessons, require audio and SRT
    if (isNewLesson) {
      if (audioSource === 'file' && !audioFile) newErrors.audio = 'Audio-Datei ist erforderlich';
      if (audioSource === 'url' && !audioUrl.trim()) newErrors.audio = 'Audio-URL ist erforderlich';
      if (audioSource === 'youtube' && !youtubeUrl.trim()) newErrors.audio = 'YouTube-URL ist erforderlich';
      if (!srtText.trim()) newErrors.srt = 'SRT-Text ist erforderlich';
    }

    // Validate SRT format
    if (srtText.trim() && !validateSRT(srtText)) {
      newErrors.srt = 'Ungültiges SRT-Format';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      toast.error('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }

    // Upload files and save lesson
    try {
      setUploading(true);

      let finalAudioPath = '';
      let finalJsonPath = '';
      let finalYoutubeUrl = '';
      let finalThumbnailPath = '';

      if (isNewLesson) {
        if (audioSource === 'youtube') {
          finalYoutubeUrl = youtubeUrl.trim();
        } else {
          // Upload audio
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
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: uploadFormData
          });

          if (!audioRes.ok) throw new Error('Upload audio failed');
          const audioData = await audioRes.json();
          finalAudioPath = audioData.url;

          // Upload thumbnail if provided
          if (thumbnailFile) {
            const thumbnailFormData = new FormData();
            thumbnailFormData.append('file', thumbnailFile);
            thumbnailFormData.append('type', 'thumbnail');

            const thumbnailRes = await fetch('/api/upload', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
              body: thumbnailFormData
            });

            if (thumbnailRes.ok) {
              const thumbnailData = await thumbnailRes.json();
              finalThumbnailPath = thumbnailData.url;
            }
          }
        }

        // Convert SRT to JSON
        const srtRes = await fetch('/api/convert-srt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ srtText, lessonId: formData.id })
        });

        if (!srtRes.ok) throw new Error('Convert SRT failed');
        const srtData = await srtRes.json();
        finalJsonPath = srtData.url;
      }

      // Save lesson
      const token = localStorage.getItem('token');
      const url = '/api/lessons';
      const method = isNewLesson ? 'POST' : 'PUT';

      let lessonData;
      if (isNewLesson) {
        lessonData = {
          ...formData,
          audio: finalAudioPath || 'youtube',
          json: finalJsonPath,
          youtubeUrl: finalYoutubeUrl || undefined,
          thumbnail: finalThumbnailPath || undefined
        };
      } else {
        lessonData = {
          title: formData.title,
          displayTitle: formData.displayTitle,
          description: formData.description,
          level: formData.level
        };
      }

      const requestBody = isNewLesson ? lessonData : { id: formData.id, ...lessonData };
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!res.ok) throw new Error('Lektion konnte nicht gespeichert werden');

      toast.success(isNewLesson ? 'Lektion erfolgreich erstellt!' : 'Lektion erfolgreich aktualisiert!');
      router.push('/admin/dashboard');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Fehler: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <AdminDashboardLayout>
        <div className={styles.loadingState}>Lädt...</div>
      </AdminDashboardLayout>
    );
  }

  return (
    <>
      <Head>
        <title>{isNewLesson ? 'Neue Lektion' : 'Lektion bearbeiten'} - Admin Dashboard</title>
      </Head>

      <AdminDashboardLayout>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>
              {isNewLesson ? '➕ Neue Lektion erstellen' : '✏️ Lektion bearbeiten'}
            </h1>
            <p className={styles.pageSubtitle}>
              {isNewLesson
                ? 'Füllen Sie alle Felder aus, um eine neue Lektion zu erstellen'
                : 'Bearbeiten Sie die Lektionsinformationen'}
            </p>
          </div>
          <button
            onClick={() => router.push('/admin/dashboard')}
            className={styles.secondaryButton}
          >
            ← Zurück
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Basic Information */}
          <div className={styles.formSection}>
            <h2 className={styles.sectionTitle}>📝 Grundinformationen</h2>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Titel (Title) *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    const newId = isNewLesson ? generateIdFromTitle(newTitle) : formData.id;
                    setFormData({ ...formData, title: newTitle, id: newId });
                  }}
                  className={`${styles.input} ${errors.title ? styles.error : ''}`}
                  placeholder="Interner Titel"
                />
                {errors.title && <span className={styles.errorText}>{errors.title}</span>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Anzeigetitel (Display Title) *
                </label>
                <input
                  type="text"
                  value={formData.displayTitle}
                  onChange={(e) => setFormData({ ...formData, displayTitle: e.target.value })}
                  className={`${styles.input} ${errors.displayTitle ? styles.error : ''}`}
                  placeholder="Anzeige für Benutzer"
                />
                {errors.displayTitle && <span className={styles.errorText}>{errors.displayTitle}</span>}
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Niveau (Level) *
                </label>
                <select
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className={`${styles.select} ${errors.level ? styles.error : ''}`}
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

              {!isNewLesson && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>ID (nicht änderbar)</label>
                  <input
                    type="text"
                    value={formData.id}
                    disabled
                    className={styles.input}
                  />
                </div>
              )}
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                Beschreibung (Description) *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className={`${styles.textarea} ${errors.description ? styles.error : ''}`}
                placeholder="Kurze Beschreibung der Lektion"
                rows={3}
              />
              {errors.description && <span className={styles.errorText}>{errors.description}</span>}
            </div>
          </div>

          {/* Audio & SRT (only for new lessons) */}
          {isNewLesson && (
            <>
              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>🎵 Audio-Quelle *</h2>

                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="file"
                      checked={audioSource === 'file'}
                      onChange={(e) => setAudioSource(e.target.value)}
                    />
                    Datei hochladen
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="url"
                      checked={audioSource === 'url'}
                      onChange={(e) => setAudioSource(e.target.value)}
                    />
                    URL eingeben
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      value="youtube"
                      checked={audioSource === 'youtube'}
                      onChange={(e) => setAudioSource(e.target.value)}
                    />
                    YouTube Video
                  </label>
                </div>

                {audioSource === 'file' && (
                  <div className={styles.fileUpload}>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setAudioFile(e.target.files[0])}
                      className={styles.fileInput}
                    />
                    {audioFile && <span className={styles.fileName}>📎 {audioFile.name}</span>}
                  </div>
                )}

                {audioSource === 'url' && (
                  <input
                    type="url"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    placeholder="https://example.com/audio.mp3"
                    className={styles.input}
                  />
                )}

                {audioSource === 'youtube' && (
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className={styles.input}
                  />
                )}

                {errors.audio && <span className={styles.errorText}>{errors.audio}</span>}
              </div>

              {audioSource !== 'youtube' && (
                <div className={styles.formSection}>
                  <h2 className={styles.sectionTitle}>🖼️ Thumbnail (Optional)</h2>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      setThumbnailFile(file);
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => setThumbnailPreview(reader.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                    className={styles.fileInput}
                  />
                  {thumbnailPreview && (
                    <img src={thumbnailPreview} alt="Preview" className={styles.thumbnailPreview} />
                  )}
                </div>
              )}

              <div className={styles.formSection}>
                <h2 className={styles.sectionTitle}>📝 SRT-Text *</h2>

                <div className={styles.srtActions}>
                  {audioSource !== 'youtube' && (
                    <button
                      type="button"
                      onClick={handleTranscribe}
                      disabled={transcribing || (!audioFile && !audioUrl.trim())}
                      className={styles.actionButton}
                    >
                      {transcribing ? '⏳ Generiere...' : '🎙️ SRT aus Audio generieren'}
                    </button>
                  )}

                  {audioSource === 'youtube' && (
                    <button
                      type="button"
                      onClick={handleGetYouTubeSRT}
                      disabled={fetchingYouTubeSRT || !youtubeUrl.trim()}
                      className={styles.actionButton}
                    >
                      {fetchingYouTubeSRT ? '⏳ Lade...' : '📺 SRT von YouTube laden'}
                    </button>
                  )}
                </div>

                <textarea
                  value={srtText}
                  onChange={(e) => setSrtText(e.target.value)}
                  className={`${styles.textarea} ${styles.srtTextarea} ${errors.srt ? styles.error : ''}`}
                  placeholder="1
00:00:03,200 --> 00:00:04,766
DW Deutsch lernen

2
00:00:05,866 --> 00:00:07,133
mit dem Top Thema"
                  rows={10}
                />
                {errors.srt && <span className={styles.errorText}>{errors.srt}</span>}
              </div>
            </>
          )}

          {!isNewLesson && (
            <div className={styles.warningBox}>
              <strong>Hinweis:</strong> Audio und JSON können nicht bearbeitet werden. Nur Lektionsinformationen können aktualisiert werden.
            </div>
          )}

          {/* Submit Button */}
          <div className={styles.formActions}>
            <button
              type="button"
              onClick={() => router.push('/admin/dashboard')}
              className={styles.cancelButton}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={uploading}
              className={styles.submitButton}
            >
              {uploading ? '⏳ Speichert...' : (isNewLesson ? '➕ Lektion erstellen' : '✏️ Aktualisieren')}
            </button>
          </div>
        </form>
      </AdminDashboardLayout>
    </>
  );
}

export default function LessonForm() {
  return (
    <ProtectedPage requireAdmin={true}>
      <LessonFormPage />
    </ProtectedPage>
  );
}
