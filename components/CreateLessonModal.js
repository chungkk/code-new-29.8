import { useState } from 'react';
import { fetchWithAuth } from '../lib/api';
import styles from '../styles/CreateLessonModal.module.css';

export default function CreateLessonModal({ onClose, onLessonCreated }) {
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    displayTitle: '',
    description: '',
    audioFile: null,
    jsonFile: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setUploadProgress(0);

    try {
      // Validate
      if (!formData.id || !formData.title || !formData.displayTitle || !formData.audioFile || !formData.jsonFile) {
        throw new Error('Vui lòng điền đầy đủ thông tin và upload file');
      }

      // Upload audio file
      const audioFormData = new FormData();
      audioFormData.append('file', formData.audioFile);
      audioFormData.append('type', 'audio');
      
      setUploadProgress(30);
      const audioRes = await fetchWithAuth('/api/upload', {
        method: 'POST',
        body: audioFormData,
        headers: {}
      });

      if (!audioRes.ok) {
        throw new Error('Upload audio thất bại');
      }

      const audioData = await audioRes.json();
      setUploadProgress(60);

      // Upload JSON file
      const jsonFormData = new FormData();
      jsonFormData.append('file', formData.jsonFile);
      jsonFormData.append('type', 'json');

      const jsonRes = await fetchWithAuth('/api/upload', {
        method: 'POST',
        body: jsonFormData,
        headers: {}
      });

      if (!jsonRes.ok) {
        throw new Error('Upload JSON thất bại');
      }

      const jsonData = await jsonRes.json();
      setUploadProgress(80);

      // Create lesson
      const lessonRes = await fetchWithAuth('/api/lessons', {
        method: 'POST',
        body: JSON.stringify({
          id: formData.id,
          title: formData.title,
          displayTitle: formData.displayTitle,
          description: formData.description,
          audio: audioData.url,
          json: jsonData.url,
          order: 999
        })
      });

      if (!lessonRes.ok) {
        const errorData = await lessonRes.json();
        throw new Error(errorData.message || 'Tạo bài học thất bại');
      }

      setUploadProgress(100);
      const newLesson = await lessonRes.json();
      
      // Success
      if (onLessonCreated) {
        onLessonCreated(newLesson);
      }
      
      alert('✅ Tạo bài học thành công!');
      onClose();
    } catch (err) {
      console.error('Create lesson error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>✍️ Tạo Bài Học Mới</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>ID Bài Học *</label>
            <input
              type="text"
              name="id"
              value={formData.id}
              onChange={handleChange}
              placeholder="Ví dụ: bai_2"
              required
            />
            <small>ID duy nhất cho bài học (không dấu, viết thường)</small>
          </div>

          <div className={styles.formGroup}>
            <label>Tiêu Đề *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ví dụ: Patient Erde: Zustand kritisch"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Tên Hiển Thị *</label>
            <input
              type="text"
              name="displayTitle"
              value={formData.displayTitle}
              onChange={handleChange}
              placeholder="Ví dụ: Lektion 2: Umwelt"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Mô Tả</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Thema: Umwelt, Klimawandel (DW)"
              rows="3"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Audio File (MP3) *</label>
            <input
              type="file"
              name="audioFile"
              onChange={handleFileChange}
              accept=".mp3"
              required
            />
            {formData.audioFile && (
              <small className={styles.fileName}>
                📁 {formData.audioFile.name}
              </small>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>JSON File (Transcript) *</label>
            <input
              type="file"
              name="jsonFile"
              onChange={handleFileChange}
              accept=".json"
              required
            />
            {formData.jsonFile && (
              <small className={styles.fileName}>
                📁 {formData.jsonFile.name}
              </small>
            )}
          </div>

          {error && (
            <div className={styles.error}>
              ⚠️ {error}
            </div>
          )}

          {loading && (
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${uploadProgress}%` }}
              />
              <span className={styles.progressText}>{uploadProgress}%</span>
            </div>
          )}

          <div className={styles.actions}>
            <button 
              type="button" 
              onClick={onClose}
              className={styles.cancelBtn}
              disabled={loading}
            >
              Hủy
            </button>
            <button 
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? '⏳ Đang tạo...' : '✅ Tạo Bài Học'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
